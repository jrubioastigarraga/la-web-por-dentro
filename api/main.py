"""
API intermedia para Escuadrón Web.

    Juego  ->  esta API (Python/FastAPI)  ->  Moodle (plugin local_lwpd)
                                           o  JSON importado desde Moodle XML

Dos fuentes de preguntas:

1. Moodle en vivo (plugin local_lwpd):  /questions?quiz=1234
2. Cuestionarios exportados desde Moodle y convertidos a JSON:
   /questions?quiz=nombre-del-cuestionario

La clave de Moodle vive en el servidor, nunca en el navegador.

Variables de entorno:
    MOODLE_URL       Base de Moodle (vacío = solo JSON importados)
    MOODLE_KEY       Clave del plugin local_lwpd (opcional)
    API_KEY          Clave opcional que debe enviar el juego en X-Api-Key
    ALLOWED_ORIGINS  Orígenes permitidos, separados por comas
    DATA_DIR         Carpeta con los JSON importados (por defecto ./data)
    CACHE_TTL        Segundos de caché de Moodle (0 desactiva)
    MOODLE_TIMEOUT   Timeout de la petición a Moodle en segundos
"""

from __future__ import annotations

import glob
import html
import json
import os
import re
import time
from typing import Any

import httpx
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

_moodle_env = os.getenv("MOODLE_URL", "https://moodle.lhusurbil.eus").strip()
MOODLE_URL = (
    ""
    if _moodle_env.lower() in ("", "none", "off", "-")
    else _moodle_env.rstrip("/")
)
MOODLE_TOKEN = os.getenv("MOODLE_TOKEN", "").strip()
MOODLE_WS = f"{MOODLE_URL}/webservice/rest/server.php" if MOODLE_URL else ""
MOODLE_KEY = os.getenv("MOODLE_KEY", "").strip()
API_KEY = os.getenv("API_KEY", "").strip()
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", "*").split(",")
    if origin.strip()
]
DATA_DIR = os.getenv(
    "DATA_DIR", os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
)
CACHE_TTL = max(0, int(os.getenv("CACHE_TTL", "300")))
MOODLE_TIMEOUT = float(os.getenv("MOODLE_TIMEOUT", "15"))

RATE_LIMIT = int(os.getenv("RATE_LIMIT", "120"))
RATE_WINDOW = 60

app = FastAPI(
    title="Escuadrón Web API",
    version="1.1.0",
    description="Preguntas para el juego: Moodle en vivo o cuestionarios exportados.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS or ["*"],
    allow_methods=["GET", "OPTIONS"],
    allow_headers=["Content-Type", "X-Api-Key"],
)

_cache: dict[str, tuple[float, dict[str, Any]]] = {}
_rate: dict[str, list[float]] = {}
_local_cache: dict[str, Any] = {"key": (), "data": {}}


def _check_rate(ip: str) -> None:
    now = time.time()
    hits = [t for t in _rate.get(ip, []) if now - t < RATE_WINDOW]
    if len(hits) >= RATE_LIMIT:
        raise HTTPException(status_code=429, detail="Too many requests")
    hits.append(now)
    _rate[ip] = hits


def _check_api_key(request: Request) -> None:
    if not API_KEY:
        return
    provided = request.headers.get("x-api-key", "")
    if provided != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")


def _valid_quiz(value: str) -> bool:
    return value == "auto" or bool(re.fullmatch(r"[A-Za-z0-9_:-]{1,64}", value))


def _valid_ids(value: str) -> bool:
    return bool(re.fullmatch(r"[\d,\s]+", value)) and any(ch.isdigit() for ch in value)


def _clean(value: Any) -> str:
    text = re.sub(r"<br\s*/?>", " ", str(value or ""), flags=re.IGNORECASE)
    text = re.sub(r"</p\s*>", " ", text, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", " ", text)
    text = html.unescape(text).replace("\xa0", " ")
    text = re.sub(r"\{mlang[^}]*\}", "", text)
    return re.sub(r"\s+", " ", text).strip()


async def _moodle_ws(function: str, params: dict[str, Any]) -> Any:
    """Llama a un Web Service de Moodle con el token del servidor."""
    if not MOODLE_WS or not MOODLE_TOKEN:
        raise HTTPException(status_code=503, detail="Moodle token no configurado")

    data = {
        "wstoken": MOODLE_TOKEN,
        "wsfunction": function,
        "moodlewsrestformat": "json",
    }
    data.update(params)

    try:
        async with httpx.AsyncClient(timeout=MOODLE_TIMEOUT) as client:
            response = await client.post(MOODLE_WS, data=data)
    except httpx.HTTPError as error:
        raise HTTPException(
            status_code=502,
            detail=f"No se pudo contactar con Moodle: {error.__class__.__name__}",
        ) from error

    if response.status_code != 200:
        raise HTTPException(
            status_code=502, detail=f"Moodle HTTP {response.status_code}"
        )

    try:
        payload = response.json()
    except ValueError as error:
        raise HTTPException(
            status_code=502, detail="Moodle no devolvió JSON"
        ) from error

    if isinstance(payload, dict) and payload.get("exception"):
        raise HTTPException(
            status_code=502,
            detail=f"{payload.get('errorcode')}: {payload.get('message')}",
        )
    return payload


def _map_quizdump_questions(questions: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Convierte las preguntas de format_quizdump al formato del juego."""
    result = []

    for question in questions or []:
        if not question.get("supported"):
            continue
        if question.get("qtype") not in ("multichoice", "truefalse"):
            continue

        text = _clean(question.get("questiontextplain") or question.get("questiontext"))
        if not text:
            continue

        options = []
        fractions = []
        for answer in question.get("answers") or []:
            option = _clean(answer.get("answerplain") or answer.get("answer"))
            if not option:
                continue
            options.append(option)
            fractions.append(float(answer.get("fraction") or 0))

        if len(options) < 2:
            continue

        best = max(fractions)
        if best <= 0:
            continue
        if fractions.count(best) != 1:
            continue  # Varias correctas: no encaja en el juego.
        correct = fractions.index(best)

        why = _clean(question.get("generalfeedback"))
        if not why:
            why = f"Respuesta correcta: {options[correct]}"

        result.append(
            {
                "q": text,
                "options": options,
                "correct": correct,
                "why": why,
            }
        )

    return result


async def _quizdump_questions(courseid: str, quizid: str) -> list[dict[str, Any]]:
    """Preguntas de un curso (todos sus quizzes) o de un quiz concreto."""
    if quizid:
        payload = await _moodle_ws(
            "format_quizdump_get_quiz_questions", {"quizid": int(quizid)}
        )
        return _map_quizdump_questions(payload.get("questions") or [])

    payload = await _moodle_ws(
        "format_quizdump_get_quizzes", {"courseid": int(courseid)}
    )
    quizzes = payload.get("quizzes") or []
    questions: list[dict[str, Any]] = []

    for quiz in quizzes:
        try:
            detail = await _moodle_ws(
                "format_quizdump_get_quiz_questions",
                {"quizid": int(quiz["id"])},
            )
        except HTTPException:
            continue
        questions.extend(_map_quizdump_questions(detail.get("questions") or []))

    return questions


def _load_local() -> dict[str, dict[str, Any]]:
    """Carga los JSON de DATA_DIR y los recarga si cambian."""
    if not os.path.isdir(DATA_DIR):
        return {}

    files = glob.glob(os.path.join(DATA_DIR, "*.json"))
    key = tuple(
        sorted((path, os.path.getmtime(path)) for path in files)
    )
    if key == _local_cache.get("key"):
        return _local_cache.get("data", {})

    data: dict[str, dict[str, Any]] = {}
    for path in files:
        try:
            with open(path, encoding="utf-8") as handle:
                payload = json.load(handle)
        except (OSError, ValueError):
            continue

        questions = payload.get("questions")
        if not isinstance(questions, list) or not questions:
            continue

        name = str(payload.get("name") or os.path.splitext(os.path.basename(path))[0])
        payload["name"] = name
        payload["questions"] = questions
        data[name] = payload

        # También se puede pedir por el nombre del fichero.
        stem = os.path.splitext(os.path.basename(path))[0]
        if stem not in data:
            data[stem] = payload

    _local_cache["key"] = key
    _local_cache["data"] = data
    return data


def _cache_get(key: str) -> dict[str, Any] | None:
    if CACHE_TTL <= 0:
        return None
    item = _cache.get(key)
    if not item:
        return None
    expires, payload = item
    if expires < time.time():
        _cache.pop(key, None)
        return None
    return payload


def _cache_set(key: str, payload: dict[str, Any]) -> None:
    if CACHE_TTL <= 0:
        return
    _cache[key] = (time.time() + CACHE_TTL, payload)


@app.get("/", include_in_schema=False)
async def root() -> dict[str, Any]:
    return {
        "name": "Escuadrón Web API",
        "endpoints": [
            "/health",
            "/quizzes",
            "/questions?quiz=nombre-o-cmid",
            "/questions?quiz=auto",
        ],
    }


@app.get("/health")
async def health() -> dict[str, Any]:
    local = _load_local()
    return {
        "ok": True,
        "moodle": MOODLE_URL or None,
        "quizdump": bool(MOODLE_TOKEN),
        "imported": sorted(local.keys()),
        "cache_ttl": CACHE_TTL,
    }


@app.get("/quizzes")
async def quizzes(courseid: str | None = Query(default=None)) -> dict[str, Any]:
    if courseid:
        payload = await _moodle_ws(
            "format_quizdump_get_quizzes", {"courseid": int(courseid)}
        )
        return {
            "quizzes": [
                {
                    "id": quiz.get("id"),
                    "cmid": quiz.get("cmid"),
                    "name": _clean(quiz.get("name")),
                    "questioncount": quiz.get("questioncount"),
                    "url": quiz.get("url"),
                }
                for quiz in payload.get("quizzes") or []
            ]
        }

    local = _load_local()
    return {
        "quizzes": [
            {"name": name, "questions": len(payload["questions"])}
            for name, payload in sorted(local.items())
        ]
    }


@app.get("/questions")
async def questions(
    request: Request,
    quiz: str | None = Query(default=None, description="nombre importado, cmid o 'auto'"),
    ids: str | None = Query(default=None, description="IDs de pregunta separados por comas"),
) -> JSONResponse:
    _check_rate(request.client.host if request.client else "unknown")
    _check_api_key(request)

    quiz = (quiz or "").strip()
    ids = (ids or "").strip()

    if quiz and not _valid_quiz(quiz):
        raise HTTPException(status_code=400, detail="Invalid quiz id")
    if ids and not _valid_ids(ids):
        raise HTTPException(status_code=400, detail="Invalid question ids")

    courseid = (request.query_params.get("courseid") or "").strip()
    quizid = (request.query_params.get("quizid") or "").strip()

    if quiz.startswith("course:"):
        courseid = quiz[7:].strip()
        quiz = ""
    elif quiz.startswith("quiz:"):
        quizid = quiz[5:].strip()
        quiz = ""

    if courseid and not courseid.isdigit():
        raise HTTPException(status_code=400, detail="Invalid courseid")
    if quizid and not quizid.isdigit():
        raise HTTPException(status_code=400, detail="Invalid quizid")

    local = _load_local()

    # 1) Cuestionario importado desde Moodle XML.
    if not ids:
        name = quiz
        if name == "auto":
            if len(local) == 1:
                name = next(iter(local))
            elif len(local) > 1:
                raise HTTPException(
                    status_code=403,
                    detail="choose-quiz: hay varios cuestionarios importados",
                )
        if name and name in local:
            return JSONResponse(
                {"questions": local[name]["questions"]},
                headers={"X-Source": "local", "X-Quiz": name},
            )

    # 2) Plugin format_quizdump (Moodle en vivo, por curso o por quiz).
    if not ids and MOODLE_TOKEN:
        # Si escriben un número suelto, se interpreta como quiz id.
        if not courseid and not quizid and quiz.isdigit():
            quizid = quiz
            quiz = ""

        if courseid or quizid:
            cache_key = f"quizdump:course:{courseid}:quiz:{quizid}"
            cached = _cache_get(cache_key)
            if cached is not None:
                return JSONResponse(cached, headers={"X-Cache": "HIT"})

            questions = await _quizdump_questions(courseid, quizid)
            if not questions:
                raise HTTPException(
                    status_code=502,
                    detail="No hay preguntas multichoice/truefalse utilizables en ese cuestionario",
                )

            payload = {"questions": questions}
            _cache_set(cache_key, payload)
            return JSONResponse(
                payload,
                headers={"X-Source": "quizdump", "X-Cache": "MISS"},
            )

    # 3) Moodle en vivo con el plugin local_lwpd.
    if not MOODLE_URL:
        raise HTTPException(
            status_code=503,
            detail="No hay Moodle configurado ni cuestionarios importados",
        )

    if not quiz and not ids:
        quiz = "auto"

    cache_key = f"quiz:{quiz}" if quiz else f"ids:{ids}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return JSONResponse(cached, headers={"X-Cache": "HIT"})

    params = {"quiz": quiz} if quiz else {"ids": ids}
    headers = {}
    if MOODLE_KEY:
        headers["X-LWPD-Key"] = MOODLE_KEY

    url = f"{MOODLE_URL}/local/lwpd/vrquestions.php"

    try:
        async with httpx.AsyncClient(timeout=MOODLE_TIMEOUT) as client:
            response = await client.get(url, params=params, headers=headers)
    except httpx.HTTPError as error:
        raise HTTPException(
            status_code=502,
            detail=f"No se pudo contactar con Moodle: {error.__class__.__name__}",
        ) from error

    if response.status_code != 200:
        try:
            payload = response.json()
        except ValueError:
            payload = {"error": f"moodle-http-{response.status_code}"}
        return JSONResponse(payload, status_code=response.status_code)

    try:
        payload = response.json()
    except ValueError as error:
        raise HTTPException(
            status_code=502, detail="Moodle no devolvió JSON"
        ) from error

    _cache_set(cache_key, payload)
    return JSONResponse(payload, headers={"X-Cache": "MISS"})

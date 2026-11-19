"""
Convierte un cuestionario exportado de Moodle (XML) al JSON que sirve la API.

Uso:
    python import_moodle.py cuestionario.xml --name http
    python import_moodle.py cuestionario.xml --name http --output-dir data

En Moodle:
    Cuestionario -> Banco de preguntas -> Exportar -> Formato Moodle XML

Solo se importan preguntas multichoice y truefalse con una única respuesta
correcta. Las de respuesta múltiple, emparejamiento, cloze, etc. se ignoran.
"""

from __future__ import annotations

import argparse
import html
import json
import os
import re
import sys
import unicodedata
import xml.etree.ElementTree as ET
from datetime import datetime, timezone


def strip_html(value: str) -> str:
    if not value:
        return ""
    value = re.sub(r"<br\s*/?>", " ", value, flags=re.IGNORECASE)
    value = re.sub(r"</p\s*>", " ", value, flags=re.IGNORECASE)
    value = re.sub(r"<[^>]+>", " ", value)
    value = html.unescape(value).replace("\xa0", " ")
    return re.sub(r"\s+", " ", value).strip()


def text_of(element: ET.Element | None) -> str:
    if element is None:
        return ""
    node = element.find("text")
    if node is not None:
        return node.text or ""
    return element.text or ""


def answer_fraction(answer: ET.Element) -> float:
    raw = answer.get("fraction")
    if raw is None:
        raw = text_of(answer.find("fraction")) or "0"
    try:
        return float(raw)
    except (TypeError, ValueError):
        return 0.0


def slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    ascii_value = normalized.encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^A-Za-z0-9_-]+", "-", ascii_value.lower()).strip("-")
    return (slug or "cuestionario")[:64]


def parse_quiz(path: str) -> tuple[list[dict], list[str]]:
    tree = ET.parse(path)
    root = tree.getroot()
    questions = []
    warnings = []

    for index, question in enumerate(root.findall("question"), start=1):
        qtype = (question.get("type") or "").lower()
        if qtype not in ("multichoice", "truefalse"):
            continue

        qtext = strip_html(text_of(question.find("questiontext")))
        if not qtext:
            warnings.append(f"Pregunta {index}: sin enunciado, ignorada.")
            continue

        answers = question.findall("answer")
        if len(answers) < 2:
            warnings.append(f"Pregunta {index}: menos de 2 respuestas, ignorada.")
            continue

        parsed = []
        for answer in answers:
            option = strip_html(text_of(answer))
            if not option:
                continue
            parsed.append((option, answer_fraction(answer)))

        if len(parsed) < 2:
            warnings.append(f"Pregunta {index}: respuestas vacías, ignorada.")
            continue

        best = max(fraction for _, fraction in parsed)
        if best <= 0:
            warnings.append(f"Pregunta {index}: sin respuesta correcta, ignorada.")
            continue

        correct_indexes = [
            position for position, (_, fraction) in enumerate(parsed) if fraction == best
        ]
        single = text_of(question.find("single")).strip().lower()
        if len(correct_indexes) > 1 and single != "false" and qtype == "multichoice":
            warnings.append(
                f"Pregunta {index}: varias respuestas correctas, ignorada."
            )
            continue
        if len(correct_indexes) > 1:
            warnings.append(
                f"Pregunta {index}: varias correctas; se usa la primera."
            )

        correct = correct_indexes[0]
        options = [option for option, _ in parsed]
        why = strip_html(text_of(question.find("generalfeedback")))
        if not why:
            why = f"Respuesta correcta: {options[correct]}"

        questions.append(
            {
                "q": qtext,
                "options": options,
                "correct": correct,
                "why": why,
            }
        )

    return questions, warnings


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Convierte un cuestionario Moodle XML al JSON de Escuadrón Web."
    )
    parser.add_argument("xml", help="Fichero XML exportado de Moodle")
    parser.add_argument("--name", help="Nombre corto del cuestionario (slug)")
    parser.add_argument(
        "--output-dir",
        default=os.path.join(os.path.dirname(os.path.abspath(__file__)), "data"),
        help="Carpeta de salida (por defecto ./data)",
    )
    args = parser.parse_args()

    if not os.path.isfile(args.xml):
        print(f"No existe el fichero: {args.xml}", file=sys.stderr)
        return 1

    base = args.name or os.path.splitext(os.path.basename(args.xml))[0]
    name = slugify(base)

    try:
        questions, warnings = parse_quiz(args.xml)
    except ET.ParseError as error:
        print(f"XML inválido: {error}", file=sys.stderr)
        return 1

    if not questions:
        print("No se ha encontrado ninguna pregunta compatible.", file=sys.stderr)
        for warning in warnings:
            print(f"  - {warning}", file=sys.stderr)
        return 1

    os.makedirs(args.output_dir, exist_ok=True)
    output = os.path.join(args.output_dir, f"{name}.json")

    payload = {
        "name": name,
        "source": os.path.basename(args.xml),
        "imported": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "questions": questions,
    }

    with open(output, "w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)

    print(f"OK: {len(questions)} preguntas -> {output}")
    for warning in warnings:
        print(f"  aviso: {warning}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

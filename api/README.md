# API de Escuadrón Web (Python)

Proxy entre el juego y Moodle.

```
Navegador / Pico 4  ->  esta API  ->  Moodle (format_quizdump o local_lwpd)
```

La **clave/token de Moodle** vive en esta API, nunca en el navegador. El juego
solo necesita la URL de la API y, si quieres, el quiz o curso.

## Instancia desplegada

- Juego: **http://172.16.35.2/la-web-por-dentro/**
- API: **http://172.16.35.2/escuadron-api**
- Servicio: `escuadron-api` (systemd) en `127.0.0.1:8001`, publicado por Caddy
  en `/escuadron-api/*`.
- Token de Moodle en `/home/ule/escuadron-api/.env` (permisos 600, fuera de Git).

Ejemplo:

```
http://172.16.35.2/la-web-por-dentro/?api=http://172.16.35.2/escuadron-api&quiz=quiz:39&start=1
```

> El juego y la API deben servirse por el **mismo esquema** (HTTP o HTTPS).
> GitHub Pages es HTTPS y la API es HTTP, así que para Moodle usa la copia
> servida en `http://172.16.35.2/la-web-por-dentro/`.

## Moodle con `format_quizdump`

La API usa el token del servidor para llamar a:

- `format_quizdump_get_quizzes` (`courseid`)
- `format_quizdump_get_quiz_questions` (`quizid`)

Configura en el `.env` del servidor:

```env
MOODLE_URL=https://moodle.lhusurbil.eus
MOODLE_TOKEN=tu_token
```

Y pide:

| Petición | Resultado |
| --- | --- |
| `/questions?quiz=quiz:39` | Preguntas del quiz 39 |
| `/questions?quiz=course:51` | Todas las preguntas de los quizzes del curso 51 |
| `/quizzes?courseid=51` | Lista de quizzes del curso (id, cmid, nombre, nº preguntas) |

El juego acepta lo mismo en el campo **Cuestionario**:

- `quiz:39`
- `course:51`

El plugin instalado debe ser la versión parcheada:
[`moodle/format_quizdump.zip`](/jrubioastigarraga/la-web-por-dentro/raw/main/moodle/format_quizdump.zip).

## Alternativas

### A) Moodle en vivo (requiere el plugin)

La API llama a `/local/lwpd/vrquestions.php` del plugin `local_lwpd`.

### B) Sin plugin: exportar el cuestionario a XML

Moodle **no permite** obtener preguntas con su respuesta correcta por Web
Services estándar (ni con token). La alternativa sin instalar nada es exportar
el cuestionario y convertirlo a JSON:

1. En Moodle: **Cuestionario → Banco de preguntas → Exportar → Moodle XML**.
2. Convierte el XML:

   ```bash
   python import_moodle.py cuestionario.xml --name http
   ```

   Genera `data/http.json` con las preguntas, opciones, correcta y feedback.
   Solo importa `multichoice` y `truefalse` con una única correcta.

3. Arranca la API con `MOODLE_URL=none` si solo vas a usar JSON importados:

   ```bash
   MOODLE_URL=none uvicorn main:app --host 0.0.0.0 --port 8000
   ```

4. En el juego, pon la URL de la API y el nombre del cuestionario (`http`) o
   déjalo vacío si solo hay uno.

Puedes importar varios cuestionarios; aparecerán en `/quizzes`.

## Requisitos

- Python 3.10+
- El plugin `local_lwpd` instalado en Moodle (con `LWPD_QUIZ_IDS` y, si
  quieres, `LWPD_KEY`).

## Arrancar en local

```bash
cd api
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env      # ajusta MOODLE_KEY y ALLOWED_ORIGINS
uvicorn main:app --reload --port 8000 --env-file .env
```

Prueba:

```bash
curl "http://localhost:8000/health"
curl "http://localhost:8000/questions?quiz=auto"
```

## Variables de entorno

| Variable | Descripción |
| --- | --- |
| `MOODLE_URL` | Base de Moodle, sin barra final. `none` = solo JSON importados |
| `MOODLE_KEY` | Clave del plugin `local_lwpd` (si la definiste) |
| `API_KEY` | Clave opcional que el juego envía en `X-Api-Key` |
| `ALLOWED_ORIGINS` | Dominios permitidos, separados por comas |
| `CACHE_TTL` | Segundos de caché (0 = sin caché) |
| `MOODLE_TIMEOUT` | Timeout de Moodle, en segundos |
| `RATE_LIMIT` | Peticiones por minuto y IP |

## Endpoints

- `GET /health` — estado y cuestionarios importados.
- `GET /quizzes` — cuestionarios JSON disponibles.
- `GET /questions?quiz=1234` — preguntas de ese cuestionario (plugin).
- `GET /questions?quiz=http` — cuestionario importado desde XML.
- `GET /questions?quiz=auto` — el único cuestionario disponible.
- `GET /questions?ids=101,102` — IDs concretos (si están permitidos).

Devuelve el mismo JSON que el plugin:

```json
{
  "questions": [
    {
      "id": 101,
      "q": "¿Qué registro DNS asocia un nombre a una IPv4?",
      "options": ["A", "AAAA", "MX", "CNAME"],
      "correct": 0,
      "why": "El registro A asocia un nombre a una IPv4."
    }
  ]
}
```

## Desplegar

### Render / Railway / Fly.io

1. Sube el repo a GitHub.
2. Crea un servicio desde el repositorio con:
   - **Build**: `pip install -r api/requirements.txt`
   - **Start**: `uvicorn api.main:app --host 0.0.0.0 --port $PORT`
   - (o usa el `Dockerfile` de esta carpeta)
3. Define las variables de entorno del apartado anterior.
4. Copia la URL pública, por ejemplo `https://escuadron-api.onrender.com`.

### Docker

```bash
docker build -t escuadron-api ./api
docker run -p 8000:8000 --env-file api/.env escuadron-api
```

## Conectar el juego

En la pantalla inicial, pulsa **Moodle** y rellena solo:

- **API (proxy)**: la URL de esta API, por ejemplo
  `http://172.16.35.2/escuadron-api`
- **Cuestionario**: `quiz:39` para un quiz o `course:51` para todos los quizzes
  de un curso. Si lo dejas vacío y solo hay uno, se usa ese.

Pulsa **Guardar** para conservarlo o **Cargar y jugar** para empezar. También
por enlace:

```
http://172.16.35.2/la-web-por-dentro/?api=http://172.16.35.2/escuadron-api&quiz=quiz:39&start=1
```

`API_KEY` existe para clientes propios, pero el juego no la pide.

## Seguridad

- La clave de Moodle no sale del servidor.
- `ALLOWED_ORIGINS` limita qué webs pueden llamar a la API.
- `API_KEY` añade una capa extra para el juego.
- `RATE_LIMIT` evita abuso básico.
- La API solo reenvía `quiz`/`ids`; no acepta URLs arbitrarias (no hay SSRF).
- Para preguntas confidenciales, la protección real sigue siendo la lista de
  cuestionarios del plugin y, si hace falta, la sesión de Moodle.

## Nota sobre la caché

La caché es en memoria y por proceso. En un hosting con varias instancias,
cada una tendrá la suya. Para un aula es suficiente.

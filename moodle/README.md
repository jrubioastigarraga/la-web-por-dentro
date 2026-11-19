# Preguntas de Moodle para Escuadrón Web

Moodle **no permite obtener una pregunta por su ID** con los Web Services
estándar. Por eso el juego usa un pequeño endpoint de solo lectura que:

- Solo sirve preguntas de los **cuestionarios que autorices** (`LWPD_QUIZ_IDS`).
- Comprueba que el cuestionario y su curso estén **visibles**.
- No devuelve datos de usuarios, intentos ni calificaciones.

## Instalación

1. Copia la carpeta `local/lwpd` a la raíz de tu Moodle:

   ```
   /var/www/moodle/local/lwpd/vrquestions.php
   ```

2. Abre `vrquestions.php` y configura los cuestionarios permitidos:

   ```php
   // cmid del cuestionario: mod/quiz/view.php?id=1234
   define('LWPD_QUIZ_IDS', '1234');
   ```

   Puedes poner varios separados por comas. **Solo se servirán preguntas de
   esos cuestionarios.** Si el cuestionario o su curso están ocultos, no
   devuelve nada.

   Opcionalmente:

   ```php
   // Clave extra (si la pones, el juego debe enviarla)
   define('LWPD_KEY', 'una-clave-larga');

   // Limitar el origen del navegador
   define('LWPD_ALLOWED_ORIGIN', 'https://jrubioastigarraga.github.io');

   // Lista blanca adicional de IDs de pregunta
   define('LWPD_ALLOWED_IDS', '101,102');
   ```

3. Comprueba que responde:

   ```
   https://moodle.lhusurbil.eus/local/lwpd/vrquestions.php?quiz=1234
   ```

   Y sin cmid, si solo hay un cuestionario autorizado:

   ```
   https://moodle.lhusurbil.eus/local/lwpd/vrquestions.php?quiz=auto
   ```

   También acepta IDs concretos (si pertenecen a los cuestionarios permitidos):

   ```
   ...?ids=101,102,103&key=TU_CLAVE
   ```

## En el juego

En la pantalla inicial, pulsa **Moodle** y elige una de las dos formas:

- **Cuestionario (cmid)**: pones el ID del cuestionario y se cargan todas sus
  preguntas. **Si solo autorizas un cuestionario en `LWPD_QUIZ_IDS`, puedes
  dejar este campo vacío**: el servidor usará ese automáticamente.
- **IDs de preguntas**: solo si necesitas una selección concreta. Deben
  pertenecer a los cuestionarios autorizados en `LWPD_QUIZ_IDS`.

Cada pregunta se convierte en una pantalla (`STAGE`) de la partida.

## Enlace directo para Pico 4

El juego acepta configuración por URL:

```
https://jrubioastigarraga.github.io/la-web-por-dentro/?quiz=1234&start=1
```

Con `#key=...` para la primera vez (se borra de la barra al guardarla):

```
https://.../?quiz=1234&start=1#key=TU_CLAVE
```

Así el alumnado solo abre el enlace (o lo guarda en favoritos) y no tiene que
teclear nada.

## Seguridad

- La restricción principal es **el cuestionario**: aunque alguien conozca la
  URL, solo puede pedir preguntas de los cuestionarios configurados y visibles.
- La clave es una capa extra, no autenticación real: si la usas, vive en el
  navegador. Para preguntas confidenciales, sirve el juego desde Moodle y
  protege el endpoint con `require_login()`.
- El endpoint es de solo lectura y solo admite `multichoice` y `truefalse`.
- Las preguntas aleatorias de un cuestionario no se pueden resolver sin un
  intento; usa preguntas fijas para el juego.

## Notas

- Si tu Moodle está detrás de un proxy, comprueba que `/local/lwpd/` es
  accesible desde fuera.
- En Moodle 4.x el endpoint resuelve las versiones de pregunta mediante
  `question_references` y `question_versions`; en 3.x usa
  `quiz_slots.questionid`.

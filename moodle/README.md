# Preguntas de Moodle para Escuadrón Web

Moodle **no permite obtener una pregunta por su ID** con los Web Services
estándar (`mod_quiz_get_attempt_data` devuelve HTML de un intento ya creado).
Por eso el juego usa un pequeño endpoint de solo lectura que devuelve JSON
plano a partir de los IDs.

## Instalación

1. Copia la carpeta `local/lwpd` a la raíz de tu Moodle, de modo que quede:

   ```
   /var/www/moodle/local/lwpd/questions.php
   ```

2. (Recomendado) Abre `questions.php` y define una clave:

   ```php
   define('LWPD_KEY', 'mi-clave-secreta');
   ```

   Esa misma clave se escribe en el juego.

3. Comprueba que responde. En el navegador:

   ```
   https://moodle.lhusurbil.eus/local/lwpd/questions.php?ids=101,102,103
   ```

   Debe devolver algo como:

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

## Dónde están los IDs

En **Banco de preguntas**, al editar una pregunta la URL contiene el id
(`/question/question.php?id=101`). También se aceptan los IDs de la entrada del
banco de preguntas de Moodle 4.x: el script resuelve la última versión.

## Uso en el juego

En la pantalla inicial, pulsa **Moodle** (arriba a la derecha) y rellena:

- **Servidor:** `https://moodle.lhusurbil.eus`
- **Clave:** la de `LWPD_KEY` (si la has definido)
- **IDs:** por ejemplo `101, 102, 103, 104`
- **Cargar y jugar**

El juego pedirá esas preguntas, las repartirá en la partida y usará sus
opciones. Solo se admiten preguntas de tipo **multichoice** y **truefalse**;
el resto se ignoran.

## Notas

- El endpoint es de solo lectura y no devuelve datos de usuarios.
- Si no quieres exponerlo, usa `LWPD_KEY` y cambia la clave cuando haga falta.
- Si tu Moodle está detrás de un proxy, comprueba que `/local/lwpd/` es
  accesible desde fuera.

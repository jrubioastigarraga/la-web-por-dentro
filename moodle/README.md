# Plugin de Moodle para Escuadrón Web

Plugin local **`local_lwpd`** que expone un endpoint de solo lectura con las
preguntas de los cuestionarios que autorices. Se instala como cualquier plugin
de Moodle y se configura desde la administración, sin editar PHP a mano.

- Solo sirve preguntas de los **cuestionarios permitidos** (`LWPD_QUIZ_IDS`).
- Comprueba que el cuestionario y su curso estén **visibles**.
- No devuelve datos de usuarios, intentos ni calificaciones.
- Compatible con **Moodle 4.x y 5.x** (usa `question_references` y
  `question_versions`; mantiene el fallback de 3.x).

## Instalación

### Opción A: ZIP (recomendada)

1. Descarga [`moodle/local_lwpd.zip`](/jrubioastigarraga/la-web-por-dentro/raw/main/moodle/local_lwpd.zip).
2. En Moodle: **Administración del sitio → Plugins → Instalar plugins →
   Subir ZIP**.
3. Sigue el asistente y visita la página de notificaciones para completar la
   instalación.
4. Si tenías el antiguo `local/lwpd/questions.php` subido a mano, **bórralo**.

### Opción B: copiar la carpeta

Copia `moodle/plugin/lwpd` a la raíz de Moodle como `local/lwpd` y visita
**Administración del sitio → Notificaciones**.

## Si falla la instalación por permisos

Si al subir el ZIP aparece algo como:

```
[Error] Write access check [/var/www/html/moodle/public/local]
```

Moodle no puede escribir en `public/local`. En el servidor:

1. Averigua el usuario del servidor web:

   ```bash
   ps -eo user,comm | grep -E 'apache2|httpd|nginx|php-fpm' | sort -u
   ```

2. Da permiso de escritura a ese usuario (ejemplo con `www-data`):

   ```bash
   sudo mkdir -p /var/www/html/moodle/public/local
   sudo chown -R www-data:www-data /var/www/html/moodle/public/local
   sudo chmod 775 /var/www/html/moodle/public/local
   ```

   Cambia `www-data` por el usuario que haya salido en el paso 1
   (`apache`, `nginx`, `http`, etc.).

3. Vuelve a intentar la instalación por ZIP.

Si usas **SELinux** (RHEL/CentOS/Rocky):

```bash
sudo semanage fcontext -a -t httpd_sys_rw_content_t "/var/www/html/moodle/public/local(/.*)?"
sudo restorecon -Rv /var/www/html/moodle/public/local
```

### Alternativa: instalar a mano

Si no puedes cambiar permisos, copia la carpeta con `sudo` y luego visita
**Notificaciones**:

```bash
sudo cp -r lwpd /var/www/html/moodle/public/local/
sudo chown -R www-data:www-data /var/www/html/moodle/public/local/lwpd
```

Debe quedar:

```
/var/www/html/moodle/public/local/lwpd/version.php
/var/www/html/moodle/public/local/lwpd/vrquestions.php
```

No uses `chmod 777`; con el propietario correcto y `775` es suficiente.


## Configuración

**Administración del sitio → Plugins → Plugins locales → Escuadrón Web
(preguntas)**.

| Ajuste | Qué hace |
| --- | --- |
| **cmid de cuestionarios permitidos** | IDs de módulo separados por comas (`mod/quiz/view.php?id=1234`). Solo se sirven preguntas de esos cuestionarios visibles. |
| **IDs de pregunta adicionales** | Lista blanca extra, opcional. |
| **Clave de acceso** | Si la defines, el juego debe enviarla en la cabecera `X-LWPD-Key`. |
| **Origen permitido** | Por ejemplo `https://jrubioastigarraga.github.io`. Vacío = cualquier origen. |
| **Exigir sesión de Moodle** | Solo responde a usuarios con sesión iniciada. El navegador puede no enviar cookies entre dominios. |

El **cmid** es el `id` de `mod/quiz/view.php?id=1234`, no el id interno del
quiz.

## Comprobar

```
https://moodle.lhusurbil.eus/local/lwpd/vrquestions.php?quiz=1234
```

Y sin cmid, si solo hay un cuestionario autorizado:

```
https://moodle.lhusurbil.eus/local/lwpd/vrquestions.php?quiz=auto
```

Debe devolver un JSON como:

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

Solo se admiten preguntas `multichoice` y `truefalse`. Las preguntas
aleatorias no se pueden resolver sin un intento, así que se ignoran.

## En el juego

En la pantalla inicial, pulsa **Moodle**:

- **Cuestionario (cmid)**: si autorizas varios, indica cuál. Si solo hay uno,
  déjalo vacío y se usará automáticamente.
- **IDs de preguntas**: solo si necesitas una selección concreta.

Cada pregunta se convierte en una pantalla (`STAGE`).

También puedes usar un enlace directo, cómodo en Pico 4:

```
https://jrubioastigarraga.github.io/la-web-por-dentro/fpv.html?quiz=1234&start=1
```

Si has definido clave:

```
https://.../?quiz=1234&start=1#key=TU_CLAVE
```

La clave se guarda y se borra de la barra de direcciones.

## Seguridad

- La restricción principal es **el cuestionario**: el endpoint no sirve
  preguntas fuera de los cuestionarios configurados.
- La clave es una capa extra; si la usas, vive en el navegador. Para preguntas
  confidenciales, activa **Exigir sesión de Moodle** y sirve el juego desde el
  propio Moodle para que la sesión funcione.
- El endpoint es de solo lectura.

## Notas

- Si tu Moodle está detrás de un proxy, comprueba que `/local/lwpd/` es
  accesible desde fuera.
- En Moodle 5.x los cuestionarios pueden tener su propio banco de preguntas;
  el plugin resuelve las preguntas a través de las referencias del quiz, así
  que funciona igual.

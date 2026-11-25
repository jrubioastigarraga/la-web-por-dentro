# APK autocontenida de Escuadrón Web para Pico 4

La APK incluye el juego completo dentro de `assets/web` y arranca un **servidor
HTTP local** en `127.0.0.1`. Después abre el navegador del visor para tener
**WebXR real**, porque un WebView de Android **no soporta sesiones inmersivas
WebXR**.

- URL que abre la APK: `http://127.0.0.1:PUERTO/index.html` (el puerto se elige
  automáticamente a partir del 8765).
- No necesita el servidor del instituto para jugar a la campaña ni al arcade.
- **Moodle** sigue necesitando red para llegar a `http://172.16.35.2/escuadron-api`.
- El servidor local corre en un **servicio en primer plano** para seguir vivo
  mientras el navegador está en pantalla.
- Si el Pico no tiene navegador, se muestra un WebView 2D de respaldo (sin VR).

## Compilar

Requisitos: Node 20+, JDK 21, Android SDK 34 y Gradle 8.7+.

```bat
cd ..
npm run build
npm run apk:assets
cd android
set JAVA_HOME=C:\Users\irjrubio\.jdk21\jdk-21.0.13+9
set ANDROID_HOME=C:\Users\irjrubio\.android-sdk
gradle assembleDebug
```

`npm run apk:assets` copia `dist/` a `app/src/main/assets/web/`, añade Three.js
y los addons a `web/vendor/` y cambia el `importmap` de `fpv.html` para que no
use la CDN. Así la APK funciona sin internet.

Crea `android/local.properties` con:

```
sdk.dir=C:/Users/irjrubio/.android-sdk
```

El APK queda en:

```
android/app/build/outputs/apk/debug/app-debug.apk
```

La copia publicada en el repo es:

```
android/EscuadronWeb.apk
```

## Instalar en Pico 4

1. Activa **Modo desarrollador** en el Pico (Ajustes → General → Acerca de,
   toca varias veces el número de compilación) y permite **orígenes
   desconocidos**.
2. Conecta el Pico por USB y ejecuta:

   ```bash
   adb install -r EscuadronWeb.apk
   ```

   O copia el APK al Pico y ábrelo desde el explorador de archivos.

3. Abre **Escuadrón Web** en el Pico. Arrancará el servidor local y se abrirá
   el navegador en la portada. Elige **Cabina FPV** y pulsa **Enter VR**.

## Cómo funciona

- `LocalWebServer.java` sirve los archivos de `assets/web` por HTTP en
  `127.0.0.1`.
- `LocalWebService.java` mantiene el servidor vivo con una notificación.
- `MainActivity.java` arranca el servicio, espera a que haya puerto y abre
  `http://127.0.0.1:PUERTO/index.html` con `ACTION_VIEW`.
- `http://127.0.0.1` es un contexto seguro para el navegador, así que WebXR
  está disponible.

## Cambiar la URL

La APK autocontenida **no usa la URL del servidor**. Si quieres una APK
lanzadora que abra `http://172.16.35.2/la-web-por-dentro/index.html`, cambia
`MainActivity` para lanzar esa URL y no arrancar el servidor local.

## Por qué no un WebView con el juego dentro

WebXR necesita el compositor del navegador. Un WebView de Android no expone
`navigator.xr` con sesiones inmersivas, así que la experiencia VR no
funcionaría. La APK sirve el juego en localhost y lo abre en el navegador, que
sí ofrece WebXR.

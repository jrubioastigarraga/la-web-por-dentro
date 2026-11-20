# APK de Escuadrón Web para Pico 4

La APK es un **lanzador**: abre el juego en el navegador del Pico con
`ACTION_VIEW`. Es la forma fiable de tener **WebXR real**, porque un WebView de
Android **no soporta sesiones inmersivas WebXR**.

- URL del juego: la de `app/src/main/res/values/strings.xml` →
  `http://172.16.35.2/la-web-por-dentro/`
- Si el Pico no tiene navegador, la app muestra el juego en un WebView 2D de
  respaldo.

## Compilar

Requisitos: JDK 21, Android SDK 34 y Gradle 8.7+.

```bat
set JAVA_HOME=C:\Users\irjrubio\.jdk21\jdk-21.0.13+9
set ANDROID_HOME=C:\Users\irjrubio\.android-sdk
cd android
gradle assembleDebug
```

Crea `android/local.properties` con:

```
sdk.dir=C:/Users/irjrubio/.android-sdk
```

El APK queda en:

```
android/app/build/outputs/apk/debug/app-debug.apk
```

## Instalar en Pico 4

1. Activa **Modo desarrollador** en el Pico (Ajustes → General → Acerca de,
   toca varias veces el número de compilación) y permite **orígenes
   desconocidos**.
2. Conecta el Pico por USB y ejecuta:

   ```bash
   adb install -r app-debug.apk
   ```

   O copia el APK al Pico y ábrelo desde el explorador de archivos.

3. Abre **Escuadrón Web** en el Pico. Se abrirá el navegador con el juego;
   pulsa **Enter VR**.

## Cambiar la URL

Edita `app/src/main/res/values/strings.xml`:

```xml
<string name="game_url">http://172.16.35.2/la-web-por-dentro/</string>
```

y vuelve a compilar. La URL debe ser HTTP o HTTPS y accesible desde la red del
Pico.

## Por qué no un WebView con el juego dentro

WebXR necesita el compositor del navegador. Un WebView de Android no expone
`navigator.xr` con sesiones inmersivas, así que la experiencia VR no
funcionaría. La APK lanza el navegador y este sí ofrece WebXR.

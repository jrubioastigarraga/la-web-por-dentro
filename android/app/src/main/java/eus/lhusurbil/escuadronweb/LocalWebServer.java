package eus.lhusurbil.escuadronweb;

import android.content.Context;
import android.content.res.AssetManager;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Servidor HTTP mínimo para servir la copia del juego incluida en assets/web.
 *
 * WebXR no funciona dentro de un WebView, así que la APK arranca este servidor
 * en 127.0.0.1 y abre el navegador del visor. El navegador sí ofrece WebXR y
 * trata localhost como contexto seguro.
 */
public final class LocalWebServer {

    private static final int START_PORT = 8765;
    private static final int MAX_PORT_TRIES = 20;

    private static ServerSocket serverSocket;
    private static ExecutorService pool;
    private static Thread acceptThread;
    private static int port;
    private static volatile boolean running;

    private LocalWebServer() {
    }

    public static synchronized int getPort() {
        return port;
    }

    public static synchronized int start(Context context) throws IOException {
        if (running && port > 0) {
            return port;
        }

        final AssetManager assets = context.getApplicationContext().getAssets();
        serverSocket = null;
        for (int candidate = START_PORT; candidate < START_PORT + MAX_PORT_TRIES; candidate++) {
            ServerSocket socket = new ServerSocket();
            try {
                socket.setReuseAddress(true);
                socket.bind(new InetSocketAddress("127.0.0.1", candidate));
                serverSocket = socket;
                port = candidate;
                break;
            } catch (IOException error) {
                try {
                    socket.close();
                } catch (IOException ignored) {
                    // sin consecuencia
                }
            }
        }

        if (serverSocket == null) {
            throw new IOException("No hay puerto libre para el servidor local");
        }

        running = true;
        pool = Executors.newFixedThreadPool(4);
        acceptThread = new Thread(() -> {
            while (running) {
                try {
                    final Socket client = serverSocket.accept();
                    pool.execute(() -> handle(client, assets));
                } catch (IOException error) {
                    if (running) {
                        // Si el socket se cierra, salimos del bucle.
                        running = false;
                    }
                }
            }
        }, "escuadron-web-server");
        acceptThread.setDaemon(true);
        acceptThread.start();
        return port;
    }

    public static synchronized void stop() {
        running = false;
        if (serverSocket != null) {
            try {
                serverSocket.close();
            } catch (IOException ignored) {
                // sin consecuencia
            }
            serverSocket = null;
        }
        if (pool != null) {
            pool.shutdownNow();
            pool = null;
        }
        port = 0;
    }

    private static void handle(Socket client, AssetManager assets) {
        try (Socket socket = client) {
            socket.setSoTimeout(15000);

            InputStream rawInput = new BufferedInputStream(socket.getInputStream());
            OutputStream rawOutput = new BufferedOutputStream(socket.getOutputStream());

            StringBuilder requestLine = new StringBuilder();
            int value;
            while ((value = rawInput.read()) != -1) {
                if (value == '\n') {
                    break;
                }
                if (value != '\r') {
                    requestLine.append((char) value);
                }
            }

            if (requestLine.length() == 0) {
                return;
            }

            String[] parts = requestLine.toString().split(" ");
            if (parts.length < 2) {
                writeError(rawOutput, 400, "Bad request");
                return;
            }

            String method = parts[0].toUpperCase(Locale.ROOT);
            String target = parts[1];

            // Consumir cabeceras hasta la línea en blanco.
            StringBuilder header = new StringBuilder();
            while ((value = rawInput.read()) != -1) {
                if (value == '\n') {
                    if (header.length() == 0) {
                        break;
                    }
                    header.setLength(0);
                } else if (value != '\r') {
                    header.append((char) value);
                }
            }

            if (!"GET".equals(method) && !"HEAD".equals(method)) {
                writeError(rawOutput, 405, "Method not allowed");
                return;
            }

            int query = target.indexOf('?');
            if (query >= 0) {
                target = target.substring(0, query);
            }
            try {
                target = URLDecoder.decode(target, "UTF-8");
            } catch (Exception ignored) {
                // se usa el path tal cual
            }

            if (target.isEmpty() || "/".equals(target)) {
                target = "/index.html";
            }

            if (target.contains("..") || target.indexOf('\\') >= 0) {
                writeError(rawOutput, 403, "Forbidden");
                return;
            }

            String assetPath = "web" + (target.startsWith("/") ? target : "/" + target);
            byte[] data;
            try (InputStream asset = assets.open(assetPath)) {
                ByteArrayOutputStream buffer = new ByteArrayOutputStream();
                byte[] chunk = new byte[16384];
                int read;
                while ((read = asset.read(chunk)) != -1) {
                    buffer.write(chunk, 0, read);
                }
                data = buffer.toByteArray();
            } catch (IOException error) {
                writeError(rawOutput, 404, "Not found");
                return;
            }

            String headers =
                    "HTTP/1.1 200 OK\r\n" +
                    "Content-Type: " + mimeType(target) + "\r\n" +
                    "Content-Length: " + data.length + "\r\n" +
                    "Cache-Control: no-cache\r\n" +
                    "Access-Control-Allow-Origin: *\r\n" +
                    "Connection: close\r\n\r\n";
            rawOutput.write(headers.getBytes(StandardCharsets.US_ASCII));
            if (!"HEAD".equals(method)) {
                rawOutput.write(data);
            }
            rawOutput.flush();
        } catch (IOException ignored) {
            // El navegador puede cerrar conexiones antes de terminar.
        }
    }

    private static void writeError(OutputStream output, int status, String message) throws IOException {
        byte[] body = message.getBytes(StandardCharsets.UTF_8);
        String reason = status == 404 ? "Not Found" : status == 403 ? "Forbidden" : "Bad Request";
        String headers =
                "HTTP/1.1 " + status + " " + reason + "\r\n" +
                "Content-Type: text/plain; charset=utf-8\r\n" +
                "Content-Length: " + body.length + "\r\n" +
                "Connection: close\r\n\r\n";
        output.write(headers.getBytes(StandardCharsets.US_ASCII));
        output.write(body);
        output.flush();
    }

    private static String mimeType(String path) {
        String lower = path.toLowerCase(Locale.ROOT);
        if (lower.endsWith(".html") || lower.endsWith(".htm")) {
            return "text/html; charset=utf-8";
        }
        if (lower.endsWith(".js") || lower.endsWith(".mjs")) {
            return "text/javascript; charset=utf-8";
        }
        if (lower.endsWith(".css")) {
            return "text/css; charset=utf-8";
        }
        if (lower.endsWith(".json") || lower.endsWith(".map")) {
            return "application/json; charset=utf-8";
        }
        if (lower.endsWith(".glb")) {
            return "model/gltf-binary";
        }
        if (lower.endsWith(".gltf")) {
            return "model/gltf+json";
        }
        if (lower.endsWith(".png")) {
            return "image/png";
        }
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) {
            return "image/jpeg";
        }
        if (lower.endsWith(".webp")) {
            return "image/webp";
        }
        if (lower.endsWith(".svg")) {
            return "image/svg+xml";
        }
        if (lower.endsWith(".wasm")) {
            return "application/wasm";
        }
        if (lower.endsWith(".woff2")) {
            return "font/woff2";
        }
        return "application/octet-stream";
    }
}

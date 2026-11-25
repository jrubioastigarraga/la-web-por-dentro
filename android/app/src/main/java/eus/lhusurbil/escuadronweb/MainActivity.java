package eus.lhusurbil.escuadronweb;

import android.Manifest;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.io.IOException;

/**
 * Lanzador autocontenido de Escuadrón Web.
 *
 * El juego completo se empaqueta en assets/web. Al abrir la app se levanta un
 * servidor HTTP local y se abre el navegador del visor en 127.0.0.1, porque
 * WebXR no existe dentro de un WebView. El servicio en primer plano mantiene
 * vivo el servidor mientras se juega.
 */
public class MainActivity extends Activity {

    private static final long PORT_WAIT_MS = 7000;
    private final Handler handler = new Handler(Looper.getMainLooper());

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        if (Build.VERSION.SDK_INT >= 33
                && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 1);
        }

        try {
            startForegroundService(new Intent(this, LocalWebService.class));
        } catch (RuntimeException error) {
            // Si el sistema no permite el servicio, al menos intentamos el servidor
            // dentro de esta actividad.
            try {
                LocalWebServer.start(this);
            } catch (IOException ignored) {
                // se avisa más abajo
            }
        }

        waitForServerAndOpen(0);
    }

    private void waitForServerAndOpen(int attempt) {
        int port = LocalWebService.port;
        if (port == 0) {
            port = LocalWebServer.getPort();
        }

        if (port > 0) {
            openBrowser(port);
            return;
        }

        if (attempt * 150L >= PORT_WAIT_MS) {
            Toast.makeText(
                    this,
                    "No se pudo iniciar el servidor local del juego.",
                    Toast.LENGTH_LONG
            ).show();
            return;
        }

        handler.postDelayed(() -> waitForServerAndOpen(attempt + 1), 150);
    }

    private void openBrowser(int port) {
        String url = "http://127.0.0.1:" + port + "/index.html";
        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
        intent.addCategory(Intent.CATEGORY_BROWSABLE);
        try {
            startActivity(intent);
            finish();
        } catch (ActivityNotFoundException error) {
            showWebFallback(url);
        }
    }

    private void showWebFallback(String url) {
        WebView web = new WebView(this);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        web.setWebViewClient(new WebViewClient());
        web.loadUrl(url);
        setContentView(web);
        Toast.makeText(
                this,
                "Sin navegador: modo 2D. Para VR, abre la URL local en el navegador del visor.",
                Toast.LENGTH_LONG
        ).show();
    }
}

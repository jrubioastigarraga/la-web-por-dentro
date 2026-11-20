package eus.lhusurbil.escuadronweb;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

/**
 * Lanzador de Escuadrón Web.
 *
 * WebXR (la sesión inmersiva) no está disponible dentro de un WebView, así que
 * la app abre el juego en el navegador del Pico con ACTION_VIEW. Si no hay
 * navegador, muestra el juego en un WebView en modo 2D como respaldo.
 */
public class MainActivity extends Activity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        final String url = getString(R.string.game_url);
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
            "Para VR, abre la URL en el navegador del Pico.",
            Toast.LENGTH_LONG
        ).show();
    }
}

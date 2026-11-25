package eus.lhusurbil.escuadronweb;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.IBinder;

import java.io.IOException;

/**
 * Mantiene vivo el servidor local mientras el navegador del visor usa el juego.
 */
public class LocalWebService extends Service {

    public static final String CHANNEL_ID = "escuadron-web";
    private static final int NOTIFICATION_ID = 1945;

    public static volatile int port = 0;

    @Override
    public void onCreate() {
        super.onCreate();
        createChannel();

        try {
            port = LocalWebServer.start(this);
        } catch (IOException error) {
            port = 0;
        }

        Notification notification = buildNotification();
        startForeground(NOTIFICATION_ID, notification);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (port > 0) {
            NotificationManager manager =
                    (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
            manager.notify(NOTIFICATION_ID, buildNotification());
        }
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        LocalWebServer.stop();
        port = 0;
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Escuadrón Web",
                    NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Servidor local del juego");
            NotificationManager manager =
                    (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
            manager.createNotificationChannel(channel);
        }
    }

    private Notification buildNotification() {
        Intent open = new Intent(Intent.ACTION_VIEW);
        if (port > 0) {
            open.setData(Uri.parse("http://127.0.0.1:" + port + "/index.html"));
        }
        open.addCategory(Intent.CATEGORY_BROWSABLE);
        PendingIntent pending = PendingIntent.getActivity(
                this,
                0,
                open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Notification.Builder builder = new Notification.Builder(this, CHANNEL_ID)
                .setContentTitle("Escuadrón Web")
                .setContentText(port > 0
                        ? "Servidor local listo · abre el navegador para jugar en VR"
                        : "No se pudo iniciar el servidor local")
                .setSmallIcon(android.R.drawable.ic_media_play)
                .setOngoing(true)
                .setContentIntent(pending);

        return builder.build();
    }
}

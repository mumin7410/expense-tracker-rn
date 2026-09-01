package expo.modules.screenshotwatcher

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.database.ContentObserver
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.provider.MediaStore
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat

private const val CHANNEL_ID = "screenshot-watcher"
private const val NOTIFICATION_ID = 4210

/**
 * Same-process foreground service: it survives the app being swiped away from
 * recents, so the JS engine (and this service's listener callback into the
 * module) keeps running. It does no SQLite/queue writes itself — detected
 * screenshots are only ever forwarded to whichever [Listener] the JS side has
 * registered, which is the only thing allowed to touch the upload queue.
 */
class ScreenshotWatcherService : Service() {
  fun interface Listener {
    fun onScreenshotDetected(entry: ScreenshotEntry)
  }

  companion object {
    @Volatile
    var isRunning: Boolean = false
      private set

    @Volatile
    var listener: Listener? = null

    fun start(context: Context) {
      val intent = Intent(context, ScreenshotWatcherService::class.java)
      ContextCompat.startForegroundService(context, intent)
    }

    fun stop(context: Context) {
      context.stopService(Intent(context, ScreenshotWatcherService::class.java))
    }
  }

  private var observer: ContentObserver? = null

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onCreate() {
    super.onCreate()
    createNotificationChannel()
    startForeground(NOTIFICATION_ID, buildNotification())
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (observer == null) {
      val handler = Handler(Looper.getMainLooper())
      val newObserver = object : ContentObserver(handler) {
        override fun onChange(selfChange: Boolean, uri: android.net.Uri?) {
          if (uri == null) return
          val entry = ScreenshotMediaQuery.resolve(applicationContext, uri) ?: return
          listener?.onScreenshotDetected(entry)
        }
      }
      contentResolver.registerContentObserver(
        MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
        true,
        newObserver
      )
      observer = newObserver
      isRunning = true
    }
    return START_STICKY
  }

  override fun onDestroy() {
    observer?.let { contentResolver.unregisterContentObserver(it) }
    observer = null
    isRunning = false
    super.onDestroy()
  }

  private fun createNotificationChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val manager = getSystemService(NotificationManager::class.java) ?: return
    if (manager.getNotificationChannel(CHANNEL_ID) != null) return

    val channel = NotificationChannel(
      CHANNEL_ID,
      "เฝ้าดูสลิปใหม่",
      NotificationManager.IMPORTANCE_MIN
    ).apply {
      description = "แจ้งเตือนพื้นหลังขณะแอปกำลังเฝ้าดูภาพหน้าจอสลิปใหม่"
      setShowBadge(false)
    }
    manager.createNotificationChannel(channel)
  }

  private fun buildNotification(): Notification {
    val openAppIntent = packageManager.getLaunchIntentForPackage(packageName)
    val contentIntent = openAppIntent?.let {
      PendingIntent.getActivity(
        this,
        0,
        it,
        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
      )
    }

    return NotificationCompat.Builder(this, CHANNEL_ID)
      .setContentTitle("สลิปสรุป")
      .setContentText("กำลังเฝ้าดูสลิปใหม่")
      .setSmallIcon(applicationInfo.icon)
      .setPriority(NotificationCompat.PRIORITY_MIN)
      .setOngoing(true)
      .setContentIntent(contentIntent)
      .build()
  }
}

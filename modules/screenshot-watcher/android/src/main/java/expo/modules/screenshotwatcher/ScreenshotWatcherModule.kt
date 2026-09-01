package expo.modules.screenshotwatcher

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.content.ContextCompat
import expo.modules.interfaces.permissions.Permissions
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

private val IMAGES_PERMISSION =
  if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) Manifest.permission.READ_MEDIA_IMAGES else Manifest.permission.READ_EXTERNAL_STORAGE

class ScreenshotWatcherModule : Module() {
  private val context
    get() = appContext.reactContext ?: throw Exceptions.AppContextLost()

  private val listener = ScreenshotWatcherService.Listener { entry ->
    sendEvent(
      "onScreenshotDetected",
      mapOf("uri" to entry.uri, "timestamp" to entry.timestampMs.toDouble())
    )
  }

  override fun definition() = ModuleDefinition {
    Name("ScreenshotWatcher")

    Events("onScreenshotDetected")

    OnCreate {
      ScreenshotWatcherService.listener = listener
    }

    OnDestroy {
      if (ScreenshotWatcherService.listener === listener) {
        ScreenshotWatcherService.listener = null
      }
    }

    Function("isWatching") {
      ScreenshotWatcherService.isRunning
    }

    Function("hasPermissions") {
      mapOf(
        "images" to (ContextCompat.checkSelfPermission(context, IMAGES_PERMISSION) == PackageManager.PERMISSION_GRANTED),
        "notifications" to (
          Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED
          )
      )
    }

    AsyncFunction("requestPermissions") { promise: Promise ->
      val permissionsToAsk = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        arrayOf(IMAGES_PERMISSION, Manifest.permission.POST_NOTIFICATIONS)
      } else {
        arrayOf(IMAGES_PERMISSION)
      }
      Permissions.askForPermissionsWithPermissionsManager(appContext.permissions, promise, *permissionsToAsk)
    }

    Function("startWatching") {
      ScreenshotWatcherService.start(context)
    }

    Function("stopWatching") {
      ScreenshotWatcherService.stop(context)
    }

    AsyncFunction("scanForNewScreenshots") { sinceMs: Double ->
      ScreenshotMediaQuery.queryAddedSince(context, sinceMs.toLong()).map { entry ->
        mapOf("uri" to entry.uri, "timestamp" to entry.timestampMs.toDouble())
      }
    }
  }
}

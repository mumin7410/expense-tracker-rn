package expo.modules.screenshotwatcher

import android.content.ContentUris
import android.content.Context
import android.net.Uri
import android.os.Build
import android.provider.MediaStore

data class ScreenshotEntry(val uri: String, val timestampMs: Long)

/**
 * MediaStore has no "is a screenshot" flag, so this is the same path-based
 * heuristic used by the service's ContentObserver and by the catch-up scan —
 * they have to agree, or a slip caught by one and missed by the other becomes
 * a silent gap.
 */
object ScreenshotMediaQuery {
  private fun looksLikeScreenshot(path: String?, displayName: String?): Boolean {
    val haystack = "${path.orEmpty()} ${displayName.orEmpty()}".lowercase()
    return haystack.contains("screenshot")
  }

  /** Row lookup for a single MediaStore content URI, as delivered to a ContentObserver callback. */
  fun resolve(context: Context, uri: Uri): ScreenshotEntry? {
    val projection = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      arrayOf(MediaStore.Images.Media._ID, MediaStore.Images.Media.DATE_ADDED, MediaStore.Images.Media.RELATIVE_PATH, MediaStore.Images.Media.DISPLAY_NAME)
    } else {
      arrayOf(MediaStore.Images.Media._ID, MediaStore.Images.Media.DATE_ADDED, MediaStore.Images.Media.DATA, MediaStore.Images.Media.DISPLAY_NAME)
    }

    context.contentResolver.query(uri, projection, null, null, null)?.use { cursor ->
      if (!cursor.moveToFirst()) return null

      val idIndex = cursor.getColumnIndexOrThrow(MediaStore.Images.Media._ID)
      val dateIndex = cursor.getColumnIndexOrThrow(MediaStore.Images.Media.DATE_ADDED)
      val pathColumn = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) MediaStore.Images.Media.RELATIVE_PATH else MediaStore.Images.Media.DATA
      val pathIndex = cursor.getColumnIndexOrThrow(pathColumn)
      val nameIndex = cursor.getColumnIndexOrThrow(MediaStore.Images.Media.DISPLAY_NAME)

      val path = cursor.getString(pathIndex)
      val displayName = cursor.getString(nameIndex)
      if (!looksLikeScreenshot(path, displayName)) return null

      val id = cursor.getLong(idIndex)
      val dateAddedSeconds = cursor.getLong(dateIndex)
      val contentUri = ContentUris.withAppendedId(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, id)
      return ScreenshotEntry(contentUri.toString(), dateAddedSeconds * 1000L)
    }
    return null
  }

  /** Catch-up scan: everything added since [sinceMs], oldest first, for the reliability backstop on launch/foreground. */
  fun queryAddedSince(context: Context, sinceMs: Long): List<ScreenshotEntry> {
    val projection = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      arrayOf(MediaStore.Images.Media._ID, MediaStore.Images.Media.DATE_ADDED, MediaStore.Images.Media.RELATIVE_PATH, MediaStore.Images.Media.DISPLAY_NAME)
    } else {
      arrayOf(MediaStore.Images.Media._ID, MediaStore.Images.Media.DATE_ADDED, MediaStore.Images.Media.DATA, MediaStore.Images.Media.DISPLAY_NAME)
    }

    val selection = "${MediaStore.Images.Media.DATE_ADDED} >= ?"
    val selectionArgs = arrayOf((sinceMs / 1000L).toString())
    val sortOrder = "${MediaStore.Images.Media.DATE_ADDED} ASC"

    val results = mutableListOf<ScreenshotEntry>()
    context.contentResolver.query(
      MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
      projection,
      selection,
      selectionArgs,
      sortOrder
    )?.use { cursor ->
      val idIndex = cursor.getColumnIndexOrThrow(MediaStore.Images.Media._ID)
      val dateIndex = cursor.getColumnIndexOrThrow(MediaStore.Images.Media.DATE_ADDED)
      val pathColumn = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) MediaStore.Images.Media.RELATIVE_PATH else MediaStore.Images.Media.DATA
      val pathIndex = cursor.getColumnIndexOrThrow(pathColumn)
      val nameIndex = cursor.getColumnIndexOrThrow(MediaStore.Images.Media.DISPLAY_NAME)

      while (cursor.moveToNext()) {
        val path = cursor.getString(pathIndex)
        val displayName = cursor.getString(nameIndex)
        if (!looksLikeScreenshot(path, displayName)) continue

        val id = cursor.getLong(idIndex)
        val dateAddedSeconds = cursor.getLong(dateIndex)
        val contentUri = ContentUris.withAppendedId(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, id)
        results.add(ScreenshotEntry(contentUri.toString(), dateAddedSeconds * 1000L))
      }
    }
    return results
  }
}

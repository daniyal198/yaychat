package com.yaysapp

import android.media.AudioAttributes
import android.media.MediaPlayer
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/** Plays the short bundled cue used for notifications received in the foreground. */
class NotificationSoundModule(private val context: ReactApplicationContext) :
    ReactContextBaseJavaModule(context) {

  private var player: MediaPlayer? = null

  override fun getName(): String = "NotificationSound"

  @ReactMethod
  fun play(kind: String) {
    val resourceName = when (kind) {
      "reward" -> "yays_reward"
      "community" -> "yays_event"
      "call" -> "yays_call"
      "system" -> "yays_event"
      else -> "yays_message"
    }
    val resourceId = context.resources.getIdentifier(resourceName, "raw", context.packageName)
    if (resourceId == 0) return

    context.runOnUiQueueThread {
      try {
        player?.release()
        val descriptor = context.resources.openRawResourceFd(resourceId)
        player = MediaPlayer().apply {
          setAudioAttributes(
              AudioAttributes.Builder()
                  .setUsage(AudioAttributes.USAGE_NOTIFICATION_EVENT)
                  .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                  .build()
          )
          setDataSource(descriptor.fileDescriptor, descriptor.startOffset, descriptor.length)
          descriptor.close()
          prepare()
          setOnCompletionListener {
            it.release()
            if (player === it) player = null
          }
          start()
        }
      } catch (_: Exception) {
        player?.release()
        player = null
      }
    }
  }

  override fun invalidate() {
    player?.release()
    player = null
    super.invalidate()
  }
}

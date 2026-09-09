package com.yaysapp

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.media.AudioAttributes
import android.net.Uri
import android.os.Build

/** Android 8+ keeps sound settings on channels, so create audible channels up front. */
object NotificationChannels {
  const val MESSAGES = "yays_messages_v2"
  const val COMMUNITIES = "yays_communities_v2"
  const val REWARDS = "yays_rewards_v2"
  const val EVENTS = "yays_events_v2"
  const val CALLS = "yays_calls_v2"
  const val SILENT = "yays_silent_v2"

  fun create(application: Application) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val manager = application.getSystemService(NotificationManager::class.java)

    manager.createNotificationChannels(
        listOf(
            channel(application, MESSAGES, "Messages", "New direct and group messages", "yays_message"),
            channel(application, COMMUNITIES, "Communities", "Community announcements, mentions, and events", "yays_event"),
            channel(application, REWARDS, "IndexxPoints rewards", "IndexxPoints earned and reward confirmations", "yays_reward"),
            channel(application, EVENTS, "Account and app events", "Account, security, and product notifications", "yays_event"),
            callChannel(application),
            NotificationChannel(SILENT, "Silent notifications", NotificationManager.IMPORTANCE_HIGH).apply {
              description = "Notifications shown without sound or vibration when Sounds is off"
              setSound(null, null)
              enableVibration(false)
            }
        )
    )
  }

  private fun channel(
      application: Application,
      id: String,
      name: String,
      description: String,
      soundResource: String
  ): NotificationChannel {
    val sound = rawUri(application, soundResource)
    return NotificationChannel(id, name, NotificationManager.IMPORTANCE_HIGH).apply {
      this.description = description
      enableVibration(true)
      setSound(sound, notificationAudioAttributes())
    }
  }

  private fun callChannel(application: Application): NotificationChannel {
    val ringtone = rawUri(application, "yays_call")
    return NotificationChannel(CALLS, "Incoming calls", NotificationManager.IMPORTANCE_HIGH).apply {
      description = "Incoming YaysApp audio and video calls"
      enableVibration(true)
      vibrationPattern = longArrayOf(0, 1000, 800, 1000, 800)
      setSound(ringtone, callAudioAttributes())
      lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
    }
  }

  private fun rawUri(application: Application, name: String): Uri =
      Uri.parse("android.resource://${application.packageName}/raw/$name")

  private fun notificationAudioAttributes(): AudioAttributes =
      AudioAttributes.Builder()
          .setUsage(AudioAttributes.USAGE_NOTIFICATION_EVENT)
          .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
          .build()

  private fun callAudioAttributes(): AudioAttributes =
      AudioAttributes.Builder()
          .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
          .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
          .build()
}

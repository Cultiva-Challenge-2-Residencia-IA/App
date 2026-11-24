import { Platform } from "react-native"
import * as Notifications from "expo-notifications"

type Reminder = "checkin" | "study"
const settings = {
  checkin: { title: "Hora do check-in", hour: 9 },
  study: { title: "Hora de revisar seus estudos", hour: 18 },
}

export async function getReminders() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync()
  return {
    checkin: scheduled.some((item) => item.identifier === "cultiva-checkin"),
    study: scheduled.some((item) => item.identifier === "cultiva-study"),
  }
}

export async function setReminder(reminder: Reminder, enabled: boolean) {
  const identifier = "cultiva-" + reminder
  if (!enabled) {
    await Notifications.cancelScheduledNotificationAsync(identifier)
    return
  }
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("cultiva", {
      name: "Lembretes do Cultiva",
      importance: Notifications.AndroidImportance.DEFAULT,
    })
  }
  if (!(await Notifications.requestPermissionsAsync()).granted)
    throw new Error("Permita notificações nos ajustes do dispositivo.")
  await Notifications.scheduleNotificationAsync({
    identifier,
    content: {
      title: settings[reminder].title,
      body: "Abra o Cultiva para continuar.",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: settings[reminder].hour,
      minute: 0,
      channelId: "cultiva",
    },
  })
}

export async function clearReminders() {
  await Promise.all([
    setReminder("checkin", false),
    setReminder("study", false),
  ])
}

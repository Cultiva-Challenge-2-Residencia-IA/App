import { Platform } from "react-native"
import * as Notifications from "expo-notifications"

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

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
  await allowReminders()
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

const taskPrefix = "cultiva-task-"

async function allowReminders() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("cultiva", {
      name: "Lembretes do Cultiva",
      importance: Notifications.AndroidImportance.DEFAULT,
    })
  }
  if (!(await Notifications.requestPermissionsAsync()).granted)
    throw new Error("Permita notificações nos ajustes do dispositivo.")
}

export async function hasTaskReminder(id: string) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync()
  return scheduled.some(item => item.identifier === taskPrefix + id)
}

export async function setTaskReminder(id: string, label: string, date: Date | null) {
  const identifier = taskPrefix + id
  if (await hasTaskReminder(id))
    await Notifications.cancelScheduledNotificationAsync(identifier)
  if (!date) return
  await allowReminders()
  if (date.getTime() <= Date.now()) throw new Error("O horário do lembrete já passou.")
  await Notifications.scheduleNotificationAsync({
    identifier,
    content: { title: "Lembrete da agenda", body: label },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
      channelId: "cultiva",
    },
  })
}

export async function clearReminders() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync()
  await Promise.all([
    setReminder("checkin", false),
    setReminder("study", false),
    ...scheduled.filter(item => item.identifier.startsWith(taskPrefix))
      .map(item => Notifications.cancelScheduledNotificationAsync(item.identifier)),
  ])
}

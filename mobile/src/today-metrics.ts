import type { CheckIn, Event, Task } from "./backend"
import { activityDay, stepDay } from "./local-date"
import { hydrationOn } from "./hydration"

export type DayActivity = {
  date: string
  checkedIn: boolean
  cups: number
  done: number
  total: number
}

export function activityForDay(date: string, checkIns: CheckIn[], events: Event[], tasks: Task[]): DayActivity {
  const checkIn = checkIns.find(item => activityDay(item.activity_date, item.created_at) === date)
  const dayTasks = tasks.filter(task => task.due_date === date)
  return {
    date,
    checkedIn: !!checkIn,
    cups: hydrationOn(date, checkIns, events).cups,
    done: dayTasks.filter(task => task.done).length,
    total: dayTasks.length,
  }
}

export function weekDates(day: string) {
  const weekday = new Date(day + "T12:00:00").getDay()
  const monday = stepDay(day, -((weekday + 6) % 7))
  return Array.from({ length: 7 }, (_, index) => stepDay(monday, index))
}

export function isoWeek(day: string) {
  const thursday = new Date(weekDates(day)[3] + "T12:00:00Z")
  const start = Date.UTC(thursday.getUTCFullYear(), 0, 1, 12)
  return Math.floor((thursday.getTime() - start) / (7 * 86_400_000)) + 1
}

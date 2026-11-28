import type { CheckIn, Event } from "./backend"
import { activityDay } from "./local-date"

function cups(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : 0
}

export function hydrationOn(day: string, checkIns: CheckIn[], events: Event[]) {
  const additions = events.filter(event =>
    event.type === "water.logged" && cups(event.payload.amount) > 0 &&
    activityDay(event.payload.day, event.created_at) === day,
  ).sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
  const manual = additions.reduce((sum, event) => sum + cups(event.payload.amount), 0)
  let legacyTotal = manual
  let fromCheckIns = 0
  for (const checkIn of checkIns) {
    if (activityDay(checkIn.activity_date, checkIn.created_at) !== day) continue
    if (checkIn.water_mode === "additional") {
      fromCheckIns += cups(checkIn.water)
      continue
    }
    // A legacy check-in reported a daily total. Manual entries after it are additional.
    const after = additions.reduce((sum, event) =>
      Date.parse(event.created_at) > Date.parse(checkIn.created_at) ? sum + cups(event.payload.amount) : sum, 0)
    legacyTotal = Math.max(legacyTotal, cups(checkIn.water) + after)
  }
  return { cups: legacyTotal + fromCheckIns, additions }
}

export function waterGoal(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 20 ? value : undefined
}

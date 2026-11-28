export function localDay(date = new Date()) {
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map(part => String(part).padStart(2, "0"))
    .join("-")
}

export function stepDay(day: string, offset: number) {
  const date = new Date(day + "T12:00:00")
  date.setDate(date.getDate() + offset)
  return localDay(date)
}

export function validDay(day: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(day) && localDay(new Date(day + "T12:00:00")) === day
}

export function activityDay(day: unknown, createdAt: string) {
  return typeof day === "string" && validDay(day) ? day : localDay(new Date(createdAt))
}

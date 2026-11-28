import { useEffect, useState } from "react"
import { AppState } from "react-native"
import { localDay } from "./local-date"

export function useLocalToday() {
  const [day, setDay] = useState(localDay)
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    function syncDay() {
      clearTimeout(timer)
      const now = new Date()
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
      setDay(localDay(now))
      timer = setTimeout(syncDay, midnight.getTime() - now.getTime() + 50)
    }
    syncDay()
    const listener = AppState.addEventListener("change", state => {
      if (state === "active") syncDay()
    })
    return () => {
      listener.remove()
      clearTimeout(timer)
    }
  }, [])
  return day
}

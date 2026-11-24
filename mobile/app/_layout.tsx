import { useEffect, useState } from "react"
import { Stack } from "expo-router"
import { AppState } from "react-native"
import type { Session } from "@supabase/supabase-js"
import { db } from "../src/backend"
import { Page, Status } from "../src/ui"
import { SessionContext } from "../src/session"

export default function Root() {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!db) return
    const auth = db.auth
    const { data } = auth.onAuthStateChange((_event, next) => {
      setSession(next)
      setReady(true)
    })
    void auth
      .getSession()
      .then((result) => setError(result.error?.message ?? ""))
    const focus = AppState.addEventListener("change", (state) => {
      if (state === "active") void auth.startAutoRefresh()
      else void auth.stopAutoRefresh()
    })
    return () => {
      data.subscription.unsubscribe()
      focus.remove()
    }
  }, [])

  if (!db || !ready)
    return (
      <Page title="Cultiva">
        <Status
          busy={!!db && !error}
          error={
            db
              ? error
              : "Preencha as variáveis públicas do Supabase em mobile/.env."
          }
        />
      </Page>
    )
  return (
    <SessionContext.Provider value={session}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Protected guard={!!session}>
          <Stack.Screen name="(tabs)" />
        </Stack.Protected>
      </Stack>
    </SessionContext.Provider>
  )
}

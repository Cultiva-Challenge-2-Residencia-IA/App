import { createContext, useContext } from "react"
import type { Session } from "@supabase/supabase-js"

export const SessionContext = createContext<Session | null>(null)

export function useAccount() {
  const session = useContext(SessionContext)
  if (!session) throw new Error("Sessão indisponível.")
  return session.user
}

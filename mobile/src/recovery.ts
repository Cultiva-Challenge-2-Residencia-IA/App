import { createClient } from "@supabase/supabase-js"
import { fail } from "./backend"

export async function verifyRecovery(
  email: string,
  token: string,
  password: string,
) {
  const auth = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL!,
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  ).auth
  fail((await auth.verifyOtp({ email, token, type: "recovery" })).error)
  fail((await auth.updateUser({ password })).error)
  await auth.signOut({ scope: "local" })
}

import "react-native-url-polyfill/auto"
import Storage from "expo-sqlite/kv-store"
import { createClient } from "@supabase/supabase-js"
export { localDay, stepDay, validDay } from "./local-date"

const url = process.env.EXPO_PUBLIC_SUPABASE_URL
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
export const db =
  url && key
    ? createClient(url, key, {
        auth: {
          storage: Storage,
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
        },
      })
    : undefined

export const agents = {
  nutrition: {
    title: "Nutrição",
    description: "Alimentação e hidratação",
    color: "#d7ed54",
  },
  physical: {
    title: "Saúde física",
    description: "Movimento e rotina",
    color: "#a9d8e2",
  },
  mental: {
    title: "Saúde mental",
    description: "Pausa e reflexão",
    color: "#e2c7eb",
  },
  study: {
    title: "Estudos",
    description: "Planejamento e revisão",
    color: "#f5a78e",
  },
} as const
export type Agent = keyof typeof agents
export type Task = {
  id: string
  label: string
  due_date: string
  due_time: string | null
  category: string
  done: boolean
  created_at: string
}
export type CheckIn = {
  id: string
  activity: string
  food: string
  water: number
  water_mode?: "total" | "additional"
  activity_date?: string | null
  mood: number
  energy: number
  stress: number
  priority: string
  note: string
  created_at: string
}
export type Note = {
  id: string
  agent: Agent
  title: string
  body: string
  created_at: string
}
export type Message = {
  id: string
  agent: Agent
  role: "user" | "assistant"
  content: string
  created_at: string
}
export type Event = {
  id: string
  type: string
  payload: Record<string, unknown>
  created_at: string
}
export type Table = "tasks" | "checkins" | "notes" | "messages" | "events" | "preferences"

export function client() {
  if (!db) throw new Error("Configure a URL e a chave pública do Supabase.")
  return db
}

export function fail(error: { message: string } | null) {
  if (error) throw new Error(error.message)
}

export function validTime(time: string) {
  return !time || /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)
}

export async function rows<T>(
  table: Exclude<Table, "preferences">,
  filter?: { column: string ; value: string },
) {
  const result: T[] = []
  for (let offset = 0; ; offset += 250) {
    let query = client()
      .from(table)
      .select()
      .order("created_at", { ascending: false })
      .order("id")
      .range(offset, offset + 249)
    if (filter) query = query.eq(filter.column, filter.value)
    const { data, error } = await query
    fail(error)
    const page = (data ?? []) as T[]
    result.push(...page)
    if (page.length < 250) return result
  }
}

export async function put(table: Table, value: object, id?: string) {
  const base = client().from(table)
  const { error } = await (id
    ? base.update(value).eq("id", id)
    : base.insert(value))
  fail(error)
}

export async function remove(table: Table, column: string, value: string) {
  const { error } = await client().from(table).delete().eq(column, value)
  fail(error)
}

export async function preference(key: string, value: unknown) {
  const { error } = await client().from("preferences").upsert({ key, value })
  fail(error)
}

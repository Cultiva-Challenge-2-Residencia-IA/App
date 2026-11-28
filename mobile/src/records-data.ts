import type { CheckIn, Event } from "./backend"
import { activityDay, stepDay } from "./local-date"
import { hydrationOn } from "./hydration"
import type { IconName } from "./icons"
import type { TimelineEntry } from "./records-view"
import { mealStatus, type MealStatus } from "./nutrition-data"

export const categories = ["Todos", "Check-ins", "Nutrição", "Atividades", "Estudos", "Scanner", "Relatórios"] as const
export const periods = [7, 30] as const

const types: Record<string, { title: string; category: string; icon: IconName }> = {
  "checkin.saved": { title: "Check-in registrado", category: "Check-ins", icon: "leaf" },
  "water.logged": { title: "Água registrada", category: "Nutrição", icon: "water" },
  "nutrition.meal.logged": { title: "Consumo registrado", category: "Nutrição", icon: "utensils" },
  "exercise.completed": { title: "Exercício concluído", category: "Atividades", icon: "activity" },
  "exercise.uncompleted": { title: "Exercício desmarcado", category: "Atividades", icon: "activity" },
  "workout.progress": { title: "Treino atualizado", category: "Atividades", icon: "activity" },
  "task.created": { title: "Tarefa criada", category: "Atividades", icon: "calendar" },
  "task.completed": { title: "Tarefa concluída", category: "Atividades", icon: "check" },
  "task.reopened": { title: "Tarefa reaberta", category: "Atividades", icon: "calendar" },
  "scan.saved": { title: "Imagem revisada", category: "Scanner", icon: "scan" },
  "report.saved": { title: "Relatório salvo", category: "Relatórios", icon: "note" },
  "flashcard.created": { title: "Cartão criado", category: "Estudos", icon: "book" },
  "flashcard.reviewed": { title: "Cartão revisado", category: "Estudos", icon: "book" },
  "study.subject.created": { title: "Matéria criada", category: "Estudos", icon: "book" },
  "study.focus.completed": { title: "Sessão de estudo registrada", category: "Estudos", icon: "activity" },
}

export function filterRecords(records: Event[], days: number, category: string, today: string) {
  const from = stepDay(today, 1 - days)
  const shownWorkouts = new Set<string>()
  return [...records].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)).filter(item => {
    const day = recordDay(item)
    if (day < from || day > today || !Object.hasOwn(types, item.type) ||
      (category !== "Todos" && types[item.type]?.category !== category)) return false
    if (item.type === "workout.progress" && typeof item.payload.workoutId === "string") {
      const key = JSON.stringify([day, item.payload.workoutId])
      if (shownWorkouts.has(key)) return false
      shownWorkouts.add(key)
    }
    return true
  })
}

function recordDay(item: Event) {
  return activityDay(item.type === "checkin.saved" ? item.payload.activity_date : item.payload.day, item.created_at)
}

function amountText(value: number, noun: string, plural = noun + "s") {
  return value + " " + (value === 1 ? noun : plural)
}

export function summarizeRecords(records: Event[], category: string, hydration: number): { icon: IconName; label: string }[] {
  const count = (type: string) => records.filter(item => item.type === type).length
  const checkIns = records.filter(item => item.type === "checkin.saved")
  if (category === "Todos") return [
    { icon: "leaf", label: amountText(checkIns.length, "check-in") },
    { icon: "check", label: amountText(count("task.completed"), "tarefa concluída", "tarefas concluídas") },
    { icon: "water", label: amountText(hydration, "copo de água", "copos de água") },
  ]
  if (category === "Check-ins") {
    const scores = checkIns.map(item => Number(item.payload.mood)).filter(value => value >= 1 && value <= 5)
    const average = scores.length && (scores.reduce((sum, mood) => sum + mood, 0) / scores.length)
      .toLocaleString("pt-BR", { maximumFractionDigits: 1 })
    return [
      { icon: "leaf", label: amountText(checkIns.length, "check-in") },
      ...(average ? [{ icon: "heart" as const, label: "Humor médio " + average + "/5" }] : []),
    ]
  }
  if (category === "Nutrição") return [{ icon: "water", label: amountText(hydration, "copo de água", "copos de água") }]
  if (category === "Atividades") return [{ icon: "check", label: amountText(count("task.completed"), "tarefa concluída", "tarefas concluídas") }]
  if (category === "Estudos") return [{ icon: "book", label: amountText(count("flashcard.reviewed"), "cartão revisado", "cartões revisados") }]
  if (category === "Scanner") return [{ icon: "scan", label: amountText(records.length, "imagem revisada", "imagens revisadas") }]
  return [{ icon: "note", label: amountText(records.length, "relatório salvo", "relatórios salvos") }]
}

export function hydrationInPeriod(checkIns: CheckIn[], events: Event[], days: number, today: string) {
  let total = 0
  for (let offset = 0; offset < days; offset++) {
    total += hydrationOn(stepDay(today, -offset), checkIns, events).cups
  }
  return total
}

const dayLabel = new Intl.DateTimeFormat("pt-BR", { dateStyle: "full" })
const hourLabel = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" })

function show(value: unknown): string {
  if (typeof value === "string") return value.trim()
  if (typeof value === "number" && Number.isFinite(value)) return String(value)
  return ""
}

function timelineEntry(item: Event): TimelineEntry {
  const { payload, type } = item
  const meta = types[type]
  const details: TimelineEntry["details"] = []
  function add(label: string, value: unknown) {
    const text = show(value)
    if (text) details.push({ label, value: text })
  }
  const amount = Number(payload.amount)
  let preview = show(payload.label ?? payload.title ?? payload.topic ?? payload.priority)
  if (type === "water.logged" && Number.isFinite(amount)) {
    preview = amountText(amount, "copo")
    add("Quantidade", preview)
  } else if (type === "workout.progress") {
    const count = Array.isArray(payload.completed) ? payload.completed.length : 0
    preview = show(payload.workoutName)
    add("Treino", payload.workoutName)
    if (typeof payload.total === "number" && payload.total > 0) add("Exercícios concluídos", count + "/" + payload.total)
  } else if (type === "study.subject.created" || type === "study.focus.completed") {
    preview = show(payload.topic)
    add("Matéria", payload.topic)
    if (typeof payload.seconds === "number") add("Tempo de foco", Math.floor(payload.seconds / 60) + " min " + payload.seconds % 60 + " s")
  } else if (type === "nutrition.meal.logged") {
    preview = show(payload.mealName)
    add("Refeição", payload.mealName)
    if (typeof payload.status === "string" && Object.hasOwn(mealStatus, payload.status))
      add("Situação", mealStatus[payload.status as MealStatus])
    add("Consumo", payload.actual)
  } else if (type === "checkin.saved") {
    if (show(payload.mood)) preview = "Humor " + show(payload.mood) + "/5"
    for (const [label, key] of [["Humor", "mood"], ["Energia", "energy"], ["Estresse", "stress"]]) {
      if (show(payload[key])) add(label, show(payload[key]) + "/5")
    }
    add(payload.water_mode === "additional" ? "Copos adicionais" : "Total informado no check-in", payload.water)
    add("Atividade", payload.activity)
    add("Alimentação", payload.food)
    add("Prioridade", payload.priority)
    add("Anotação", payload.note)
  } else {
    add("Tarefa", payload.label)
    add("Título", payload.title)
    add("Matéria", payload.topic)
    add("Exercício", payload.exercise)
    add("Pergunta", payload.question)
    add("Resposta", payload.answer)
    if (typeof payload.known === "boolean") add("Revisão", payload.known ? "Já sei" : "Revisar depois")
    add("Detalhes", payload.details)
    if (!preview) preview = show(payload.exercise) || show(payload.details)
  }
  return {
    id: type + ":" + item.id,
    title: meta?.title ?? type,
    time: hourLabel.format(new Date(item.created_at)),
    category: meta?.category ?? "Outros",
    icon: meta?.icon ?? "record",
    preview: preview.slice(0, 120),
    details,
  }
}

export function groupRecords(records: Event[], today: string) {
  const yesterday = stepDay(today, -1)
  const groups = new Map<string, { day: string; title: string; entries: TimelineEntry[] }>()
  for (const item of [...records].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))) {
    const day = recordDay(item)
    if (!groups.has(day)) {
      const title = day === today ? "Hoje" : day === yesterday ? "Ontem" : dayLabel.format(new Date(day + "T12:00:00"))
      groups.set(day, { day, title, entries: [] })
    }
    groups.get(day)?.entries.push(timelineEntry(item))
  }
  return Array.from(groups.values())
}

function csvCell(value: string) {
  const safe = /^\s*[=+\-@\t\r\n]/.test(value) ? "'" + value : value
  return '"' + safe.replaceAll('"', '""') + '"'
}

export function recordsCsv(records: Event[]) {
  const headings = ["Data da atividade", "Horário do registro", "Tipo", "Categoria", "Copos"]
  const data = records.map(item => [
    recordDay(item),
    item.created_at,
    types[item.type]?.title ?? item.type,
    types[item.type]?.category ?? "",
    item.type === "water.logged" ? show(item.payload.amount) : "",
  ])
  return "\uFEFF" + [headings, ...data].map(row => row.map(csvCell).join(",")).join("\r\n")
}

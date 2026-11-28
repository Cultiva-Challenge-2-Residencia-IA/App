import { validDay, validTime, type Event } from "./backend"

export type Food = { name: string; portion: string; alternatives: string }
export type Meal = { id: string; name: string; time: string; notes: string; foods: Food[] }
export type NutritionPlan = { id: string; name: string; notes: string; meals: Meal[] }
export const mealStatus = {
  completed: "Realizada",
  partial: "Parcial",
  substituted: "Substituída",
  skipped: "Pulada",
} as const
export type MealStatus = keyof typeof mealStatus
export type MealLog = {
  id: string
  planId: string
  mealId: string
  mealName: string
  day: string
  status: MealStatus
  actual: string
  createdAt: string
}

export function blankMeal(id: string): Meal {
  return { id, name: "", time: "", notes: "", foods: [{ name: "", portion: "", alternatives: "" }] }
}

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {}
}

function string(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

export function planDraft(value: unknown, newId: () => string): NutritionPlan {
  const data = object(value)
  const rawMeals = Array.isArray(data.meals) ? data.meals : []
  if (!rawMeals.length) throw new Error("Nenhuma refeição encontrada. Revise a fonte ou preencha o plano manualmente.")
  if (rawMeals.length > 16) throw new Error("O plano excede o limite de 16 refeições.")
  return {
    id: newId(),
    name: string(data.name) || "Plano alimentar",
    notes: string(data.notes),
    meals: rawMeals.map(value => {
      const meal = object(value)
      const rawFoods = Array.isArray(meal.foods) ? meal.foods : []
      if (rawFoods.length > 24) throw new Error("Uma das refeições excede o limite de 24 itens.")
      const foods = rawFoods.map(item => {
        const food = object(item)
        return {
          name: string(food.name),
          portion: string(food.portion),
          alternatives: Array.isArray(food.alternatives)
            ? food.alternatives.map(string).filter(Boolean).join("\n")
            : string(food.alternatives),
        }
      })
      return {
        id: newId(), name: string(meal.name), time: string(meal.time),
        notes: string(meal.notes), foods: foods.length ? foods : blankMeal("").foods,
      }
    }),
  }
}

export function confirmPlan(plan: NutritionPlan): NutritionPlan {
  const normalized = {
    ...plan,
    name: plan.name.trim(),
    notes: plan.notes.trim(),
    meals: plan.meals.map(meal => ({
      ...meal,
      name: meal.name.trim(),
      time: meal.time.trim(),
      notes: meal.notes.trim(),
      foods: meal.foods.map(food => ({
        name: food.name.trim(), portion: food.portion.trim(), alternatives: food.alternatives.trim(),
      })),
    })),
  }
  if (!normalized.name || !normalized.meals.length)
    throw new Error("Informe o nome do plano e adicione uma refeição.")
  for (const meal of normalized.meals) {
    if (!meal.name || !validTime(meal.time) || !meal.foods.length || meal.foods.some(food => !food.name))
      throw new Error("Revise o nome, o horário (HH:MM) e os alimentos de cada refeição.")
  }
  if (new TextEncoder().encode(JSON.stringify(normalized)).length > 18_000)
    throw new Error("Este plano é grande demais para salvar. Reduza o tamanho das observações ou a quantidade de itens.")
  return normalized
}

function comparable(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/(\d)[,.](?=\d)/g, "$1decimal")
    .replace(/\s*\/\s*/g, "/")
    .replace(/(\d)\s+(kg|mg|g|ml|l)\b/g, "$1$2")
    .replace(/[^a-z0-9/]+/g, " ").trim()
}

export function verifyPlanSource(plan: NutritionPlan, source: string) {
  const document = " " + comparable(source) + " "
  if (!source.trim()) throw new Error("A fonte da interpretação está indisponível.")
  for (const meal of plan.meals) {
    for (const food of meal.foods) {
      for (const field of [food.name, food.portion, ...food.alternatives.split("\n")]) {
        const candidate = comparable(field)
        if (candidate && !document.includes(" " + candidate + " "))
          throw new Error("A IA retornou um item ou uma porção que não aparece na fonte. Confira o documento ou preencha o plano manualmente.")
      }
    }
    if (meal.time) {
      if (!validTime(meal.time)) throw new Error("A IA retornou um horário inválido. Revise o plano manualmente.")
      const [hour, minute] = meal.time.split(":")
      const expression = minute === "00"
        ? "(?:\\s*:\\s*00|\\s*h(?:\\s*00)?(?!\\s*\\d))"
        : "(?:\\s*[:h]\\s*" + minute + ")"
      if (!new RegExp("(?:^|[^0-9])0?" + Number(hour) + expression + "(?!\\d)", "i").test(source))
        throw new Error("A IA retornou um horário sem correspondência na fonte. Revise o plano manualmente.")
    }
  }
}

export function readPlan(value: unknown): NutritionPlan | undefined {
  const data = object(value)
  if (typeof data.id !== "string" || typeof data.name !== "string" || typeof data.notes !== "string" || !Array.isArray(data.meals))
    return
  try {
    for (const item of data.meals) {
      const meal = object(item)
      if (typeof meal.id !== "string" || !Array.isArray(meal.foods)) return
    }
    return confirmPlan(data as NutritionPlan)
  } catch {
    return
  }
}

export function latestMealLogs(events: Event[]) {
  const logs = new Map<string, MealLog>()
  for (const event of events) {
    if (event.type !== "nutrition.meal.logged") continue
    const { planId, mealId, day, status } = event.payload
    if (typeof planId !== "string" || typeof mealId !== "string" || typeof day !== "string" ||
      !validDay(day) || typeof status !== "string" || !Object.hasOwn(mealStatus, status)) continue
    const key = JSON.stringify([planId, mealId, day])
    const previous = logs.get(key)
    if (previous && Date.parse(previous.createdAt) >= Date.parse(event.created_at)) continue
    logs.set(key, {
      id: event.id, planId, mealId, day, status: status as MealStatus,
      mealName: string(event.payload.mealName) || "Refeição",
      actual: string(event.payload.actual), createdAt: event.created_at,
    })
  }
  return [...logs.values()].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
}

export function mealDraft(plan: NutritionPlan, meal: Meal) {
  return [
    "Quero conversar sobre esta refeição do meu plano. Identifique as alternativas já registradas e use as porções da fonte. Se faltar uma substituição ou equivalência, indique o que devo confirmar com quem prescreveu o plano.",
    `Plano: ${plan.name}\nRefeição: ${meal.name}${meal.time ? " às " + meal.time : ""}`,
    ...meal.foods.map(food => food.name + (food.portion ? " — " + food.portion : "") +
      (food.alternatives ? "\nAlternativas do plano: " + food.alternatives : "")),
    meal.notes, plan.notes,
  ].filter(Boolean).join("\n\n").slice(0, 4000)
}

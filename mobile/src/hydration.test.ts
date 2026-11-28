import { describe, expect, it } from "vitest"
import type { CheckIn, Event } from "./backend"
import { hydrationOn, waterGoal } from "./hydration"
import { stepDay, validDay } from "./local-date"
import { filterRecords, hydrationInPeriod, recordsCsv, summarizeRecords } from "./records-data"
import { activityForDay } from "./today-metrics"

const day = "2026-11-24"
function timestamp(hour: number, date = day) {
  return new Date(date + "T" + String(hour).padStart(2, "0") + ":00:00").toISOString()
}
function water(hour: number, amount: unknown, date = day): Event {
  return { id: String(hour), type: "water.logged", created_at: timestamp(hour, date), payload: { amount, day: date } }
}
function checkIn(hour: number, amount: number, waterMode?: CheckIn["water_mode"]): CheckIn {
  return {
    id: String(hour), created_at: timestamp(hour), activity_date: day, water_mode: waterMode,
    water: amount, mood: 4, energy: 3, stress: 2, activity: "", food: "", priority: "Ler", note: "",
  }
}

describe("hidratação compartilhada", () => {
  it("preserva os 11 copos manuais de um dia com check-in legado de 6 copos", () => {
    const events = [water(8, 6), water(9, 5)]
    expect(hydrationOn(day, [checkIn(10, 6)], events)).toEqual({ cups: 11, additions: [events[1], events[0]] })
  })

  it("considera o valor legado e só soma a ele o que foi lançado depois", () => {
    expect(hydrationOn(day, [checkIn(10, 10), checkIn(11, 6)], [
      water(8, 2), water(12, 1), water(13, -1), water(14, "10"),
    ]).cups).toBe(11)
  })

  it("soma check-ins adicionais entre si e reflete o desfazer nos resumos", () => {
    const checkIns = [checkIn(10, 2, "additional"), checkIn(11, 1, "additional")]
    const events = [water(8, 1), water(13, 1)]
    expect(hydrationOn(day, checkIns, events).cups).toBe(5)
    expect(activityForDay(day, checkIns, [events[0]], []).cups).toBe(4)
    const total = hydrationInPeriod(checkIns, [events[0]], 7, day)
    expect(summarizeRecords([], "Nutrição", total)[0].label).toBe("4 copos de água")
  })

  it("usa o dia explícito mesmo quando o horário de criação pertence a outro dia", () => {
    const nextDay = stepDay(day, 1)
    const late = { ...water(0, 1), created_at: timestamp(0, nextDay) }
    const previous = { ...checkIn(0, 2, "additional"), created_at: timestamp(0, nextDay) }
    const legacy = { ...checkIn(9, 1), activity_date: undefined, created_at: timestamp(9, nextDay) }
    expect(hydrationOn(day, [previous, legacy], [late]).cups).toBe(3)
    expect(hydrationOn(nextDay, [previous, legacy], [late]).cups).toBe(1)
    expect(filterRecords([late], 1, "Nutrição", day)).toEqual([late])
    expect(validDay("2026-02-30")).toBe(false)
  })

  it("exige uma meta definida e válida", () => {
    expect(waterGoal(undefined)).toBeUndefined()
    expect(waterGoal(0)).toBeUndefined()
    expect(waterGoal(21)).toBeUndefined()
    expect(waterGoal(12)).toBe(12)
  })
})

describe("Registros", () => {
  it("mostra o último progresso de cada treino e preserva treinos diferentes", () => {
    const event = (id: string, hour: number, workoutId: string): Event => ({
      id, type: "workout.progress", created_at: timestamp(hour), payload: { day, workoutId },
    })
    const latest = event("latest", 9, "a")
    const second = event("second", 10, "b")
    expect(filterRecords([event("first", 8, "a"), latest, second], 7, "Atividades", day)).toEqual([second, latest])
  })

  it("exporta os registros filtrados sem copiar observações ou metadados internos", () => {
    const events = [{ id: "id", type: "checkin.saved", created_at: timestamp(9), payload: { note: "texto privado", owner: "identificador", water: 2 } }]
    const csv = recordsCsv(events)
    expect(csv).toContain(day)
    expect(csv).not.toContain("texto privado")
    expect(csv).not.toContain("identificador")
  })
})

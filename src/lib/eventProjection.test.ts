import { describe, expect, it } from "vitest"

import { projectEvent, sumWater } from "./eventProjection"

import type { EventRecord } from "./localDb"

const event = (
  type: string,

  payload: Record<string, unknown>,
): EventRecord => ({
  id: crypto.randomUUID(),

  userId: "user-1",

  type,

  payload,

  createdAt: "2026-11-10T12:00:00.000Z",
})

describe("event projections", () => {
  it("aggregates only water events", () => {
    expect(
      sumWater([
        event("water.logged", { amount: 2 }),
        event("task.created", {}),
      ]),
    ).toBe(2)
  })

  it("projects known and unknown events without losing them", () => {
    expect(
      projectEvent(event("exercise.completed", { exercise: "walk" })).title,
    ).toBe("Exercício concluído")

    expect(projectEvent(event("custom.event", {})).title).toBe("custom.event")
  })
})

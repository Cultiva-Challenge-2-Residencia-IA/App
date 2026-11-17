import { describe, expect, it } from "vitest"

import {
  detectRiskSignal,
  validateCheckIn,
  validateRegistration,
} from "./validation"

describe("registration validation", () => {
  it("accepts a valid local account", () => {
    expect(() =>
      validateRegistration("Ana Silva", "ana@example.com", "segredo"),
    ).not.toThrow()
  })

  it("rejects incomplete account data", () => {
    expect(() =>
      validateRegistration("", "ana@example.com", "segredo"),
    ).toThrow()

    expect(() => validateRegistration("Ana", "invalid", "segredo")).toThrow()

    expect(() =>
      validateRegistration("Ana", "ana@example.com", "123"),
    ).toThrow()
  })
})

describe("check-in validation", () => {
  it("accepts bounded wellbeing values", () => {
    expect(() =>
      validateCheckIn({
        userId: "user-1",

        water: 6,

        mood: 4,

        energy: 3,

        stress: 2,

        priority: "Estudar",
      }),
    ).not.toThrow()
  })

  describe("risk signal detection", () => {
    it("detects direct self-harm language without flagging ordinary text", () => {
      expect(detectRiskSignal("Estou pensando em me machucar")).toBe(true)
      expect(detectRiskSignal("Hoje quero organizar meus estudos")).toBe(false)
    })
  })

  it("rejects invalid ranges and missing priority", () => {
    expect(() =>
      validateCheckIn({
        userId: "user-1",

        water: 11,

        mood: 4,

        energy: 3,

        stress: 2,

        priority: "Estudar",
      }),
    ).toThrow()

    expect(() =>
      validateCheckIn({
        userId: "user-1",

        water: 6,

        mood: 4,

        energy: 3,

        stress: 2,

        priority: " ",
      }),
    ).toThrow()
  })
})

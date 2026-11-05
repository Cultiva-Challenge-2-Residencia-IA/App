import { describe, expect, it } from "vitest"

import { validateCheckIn, validateRegistration } from "./validation"

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

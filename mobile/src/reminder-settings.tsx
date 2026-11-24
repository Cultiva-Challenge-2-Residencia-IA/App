import { useEffect, useState } from "react"
import { getReminders, setReminder } from "./reminders"
import { Button, Card, Copy, Status, useAction } from "./ui"

export function ReminderSettings() {
  const [values, setValues] =
    useState<Awaited<ReturnType<typeof getReminders>>>()
  const action = useAction()
  async function load() {
    setValues(await getReminders())
  }
  useEffect(() => {
    void action.run(load)
  }, [])
  return (
    <Card>
      <Copy heading label="Lembretes neste dispositivo" />
      {values &&
        (["checkin", "study"] as const).map((key) => (
          <Button
            key={key}
            label={
              (values[key] ? "✓ " : "") +
              (key === "checkin" ? "Check-in às 9h" : "Revisão às 18h")
            }
            selected={values[key]}
            disabled={action.busy}
            onPress={() =>
              void action.run(async () => {
                await setReminder(key, !values[key])
                await load()
              })
            }
          />
        ))}
      <Status {...action} />
      {!!action.error && (
        <Button
          label="Atualizar lembretes"
          onPress={() => void action.run(load)}
        />
      )}
    </Card>
  )
}

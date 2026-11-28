import { useEffect, useState } from "react"
import { getReminders, setReminder } from "./reminders"
import { ProfileSection, SettingsToggle } from "./profile-view"
import { Button, Copy, Status, useAction } from "./ui"

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
    <ProfileSection>
      <Copy muted label="Horários locais deste aparelho" />
      {values &&
        (["checkin", "study"] as const).map((key) => (
          <SettingsToggle
            key={key}
            label={key === "checkin" ? "Check-in às 9h" : "Revisão às 18h"}
            enabled={values[key]}
            disabled={action.busy}
            change={enabled =>
              void action.run(async () => {
                await setReminder(key, enabled)
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
    </ProfileSection>
  )
}

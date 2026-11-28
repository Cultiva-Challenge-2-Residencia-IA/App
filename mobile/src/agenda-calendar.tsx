import { Pressable, StyleSheet, Text, View } from "react-native"
import { localDay, type Task } from "./backend"
import { Icon } from "./icons"
import { Button, Copy, Row, tones, usePalette } from "./ui"

const weekday = new Intl.DateTimeFormat("pt-BR", { weekday: "short" })
const month = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" })
const full = new Intl.DateTimeFormat("pt-BR", { dateStyle: "full" })

export function AgendaCalendar({ day, days, week, tasks, choose, move, today, toggle }: {
  day: string
  days: string[]
  week: boolean
  tasks: Task[] | undefined
  choose: (day: string) => void
  move: (direction: number) => void
  today: () => void
  toggle: () => void
}) {
  const colors = usePalette()
  const date = new Date(day + "T12:00:00")
  const todayKey = localDay()
  return (
    <View style={[styles.calendar, { backgroundColor: colors.surface, borderColor: colors.line }]}>
      <View style={styles.month}>
        <Pressable accessibilityRole="button" accessibilityLabel="Semana anterior" style={styles.arrow} onPress={() => move(-1)}>
          <View style={styles.previous}><Icon name="arrow" size={21} color={colors.ink} /></View>
        </Pressable>
        <View style={styles.monthTitle}><Copy heading label={month.format(date)} /></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Próxima semana" style={styles.arrow} onPress={() => move(1)}>
          <Icon name="arrow" size={21} color={colors.ink} />
        </Pressable>
      </View>
        <View style={styles.strip}>
          {days.map(key => {
            const cell = new Date(key + "T12:00:00")
            const active = key === day
            const count = tasks?.filter(task => task.due_date === key).length ?? 0
            const ink = active ? tones.onAction : colors.ink
            return (
              <Pressable
                key={key}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={full.format(cell) + ", " + count + (count === 1 ? " tarefa" : " tarefas")}
                onPress={() => choose(key)}
                style={({ pressed }) => [
                  styles.day,
                  { backgroundColor: active ? colors.lime : colors.paper, borderColor: key === todayKey ? colors.muted : "transparent", opacity: pressed ? 0.75 : 1 },
                ]}
              >
                <Text style={[styles.weekday, { color: ink }]}>{weekday.format(cell).replace(/\.$/, "").slice(0, 3)}</Text>
                <Text style={[styles.number, { color: ink }]}>{cell.getDate()}</Text>
                <View style={[styles.mark, { backgroundColor: count ? ink : colors.muted, opacity: count ? 1 : 0.45 }]} />
              </Pressable>
            )
          })}
        </View>
      {(week || day !== todayKey) && <Row>
        {day !== todayKey && <Button label="Ir para hoje" selected={false} onPress={today} />}
        {week && <Button label="Ver só este dia" icon="calendar" selected={false} onPress={toggle} />}
      </Row>}
    </View>
  )
}

const styles = StyleSheet.create({
  calendar: { borderBottomWidth: StyleSheet.hairlineWidth, gap: 8, paddingBottom: 10 },
  month: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  monthTitle: { flex: 1, alignItems: "center" },
  arrow: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  previous: { transform: [{ rotate: "180deg" }] },
  strip: { flexDirection: "row", gap: 3 },
  day: { flex: 1, minHeight: 70, borderWidth: 1, borderRadius: 9, alignItems: "center", justifyContent: "center", gap: 2 },
  weekday: { fontSize: 11, fontWeight: "600" },
  number: { fontSize: 19, fontWeight: "800", fontVariant: ["tabular-nums"] },
  mark: { width: 5, height: 5, borderRadius: 3, marginTop: 2 },
})

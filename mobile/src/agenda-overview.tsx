import { Pressable, StyleSheet, Text, View } from "react-native"
import Svg, { Circle } from "react-native-svg"
import { type Task } from "./backend"
import { Icon } from "./icons"
import { Button, Copy, tones, usePalette } from "./ui"

const dateLabel = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "short" })
const weekday = new Intl.DateTimeFormat("pt-BR", { weekday: "short" })
const ring = 2 * Math.PI * 24

export function AgendaDaySummary({ day, today, tasks }: { day: string; today: string; tasks?: Task[] }) {
  const color = usePalette()
  const entries = tasks?.filter(task => task.due_date === day)
  const done = entries?.filter(task => task.done).length ?? 0
  const total = entries?.length ?? 0
  return (
    <View style={[styles.summary, { borderColor: color.line }]}>
      <View style={styles.summaryCopy}>
        <Text accessibilityRole="header" style={[styles.display, { color: color.ink }]}>
          {day === today ? "Hoje." : new Date(day + "T12:00:00").getDate()}
        </Text>
        <Copy muted label={dateLabel.format(new Date(day + "T12:00:00"))} />
      </View>
      {entries && (
        <View accessible accessibilityLabel={`${done} de ${total} tarefas concluídas`} style={styles.progress}>
          <Svg width={56} height={56} viewBox="0 0 56 56" accessible={false}>
            <Circle cx={28} cy={28} r={24} fill="none" stroke={color.line} strokeWidth={5} />
            {done > 0 && <Circle cx={28} cy={28} r={24} fill="none" stroke={color.lime} strokeWidth={5}
              rotation={-90} origin="28, 28" strokeLinecap="round"
              strokeDasharray={[ring, ring]} strokeDashoffset={ring * (1 - done / total)} />}
          </Svg>
          <View style={styles.progressCopy}>
            <Text style={[styles.count, { color: color.ink }]}>{done}/{total}</Text>
            <Text style={[styles.muted, { color: color.muted }]}>tarefas do dia</Text>
          </View>
        </View>
      )}
    </View>
  )
}

export function AgendaEmpty() {
  const color = usePalette()
  return (
    <View style={[styles.empty, { borderColor: color.line, backgroundColor: color.surface }]}>
      <Icon name="record" color={color.ink} size={31} />
      <View style={styles.itemCopy}>
        <Text style={[styles.itemTitle, { color: color.ink }]}>Nada agendado por aqui.</Text>
        <Text style={[styles.muted, { color: color.muted }]}>Adicione uma tarefa para organizar seu dia.</Text>
      </View>
    </View>
  )
}

export function AgendaUpcoming({ tasks, day, showWeek, openDay }: {
  tasks: Task[]; day: string; showWeek: () => void; openDay: (day: string) => void
}) {
  const color = usePalette()
  const next = tasks.filter(task => !task.done && task.due_date > day)
    .sort((a, b) => a.due_date.localeCompare(b.due_date) || (a.due_time ?? "99").localeCompare(b.due_time ?? "99"))
    .slice(0, 3)
  return (
    <View style={styles.upcoming}>
      <View style={styles.upcomingHeader}>
        <Copy heading label="Próximos compromissos" />
        <Button label="Ver semana" icon="arrow" selected={false} onPress={showWeek} />
      </View>
      {next.length === 0 && <Copy muted label="Você ainda não tem tarefas futuras pendentes." />}
      {next.map(task => {
        const date = new Date(task.due_date + "T12:00:00")
        return (
          <Pressable key={task.id} accessibilityRole="button"
            accessibilityLabel={`Abrir ${task.label}, ${dateLabel.format(date)}`}
            onPress={() => openDay(task.due_date)}
            style={({ pressed }) => [styles.item, { borderColor: color.line, backgroundColor: color.surface, opacity: pressed ? 0.7 : 1 }]}>
            <View style={[styles.dateTile, { backgroundColor: color.paper }]}>
              <Text style={[styles.muted, { color: color.muted }]}>{weekday.format(date).slice(0, 3)}</Text>
              <Text style={[styles.itemTitle, { color: color.ink }]}>{date.getDate()}</Text>
            </View>
            <View style={[styles.itemCopy, styles.accent, { borderLeftColor: color.lime }]}>
              <Text style={[styles.itemTitle, { color: color.ink }]}>{task.label}</Text>
              <Text style={[styles.muted, { color: color.muted }]}>{task.category} / {task.due_time?.slice(0, 5) || "Sem horário"}</Text>
            </View>
            <Icon name="arrow" size={18} color={color.muted} />
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  summary: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 9, borderBottomWidth: StyleSheet.hairlineWidth, paddingBottom: 13 },
  summaryCopy: { flexGrow: 1 },
  display: { fontSize: 39, fontWeight: "900", letterSpacing: -1.8 },
  progress: { flexDirection: "row", alignItems: "center", gap: 7 },
  progressCopy: { gap: 2 },
  count: { fontSize: 22, fontWeight: "900", fontVariant: ["tabular-nums"] },
  muted: { fontSize: 13, lineHeight: 17 },
  empty: { flexDirection: "row", alignItems: "center", gap: 13, borderWidth: 1, borderRadius: 12, padding: 12 },
  upcoming: { gap: 7 },
  upcomingHeader: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 7 },
  item: { flexDirection: "row", alignItems: "center", gap: 9, borderWidth: 1, borderRadius: 11, padding: 8 },
  dateTile: { minWidth: 42, minHeight: 44, alignItems: "center", justifyContent: "center", paddingHorizontal: 5, borderRadius: 7 },
  itemCopy: { flex: 1, gap: 3 },
  accent: { borderLeftWidth: 3, paddingLeft: 7 },
  itemTitle: { fontSize: 15, fontWeight: "800" },
})

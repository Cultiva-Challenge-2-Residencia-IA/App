import { useEffect, useRef, useState } from "react"
import { Animated, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native"
import Svg, { Path } from "react-native-svg"
import { agents, type Agent } from "./backend"
import { Icon, type IconName } from "./icons"
import { AgentMonogram, BotanicalEtching } from "./today-art"
import { isoWeek, type DayActivity } from "./today-metrics"
import { useReducedMotion } from "./today-motion"
import { Button, Copy, Field, Row, tones, usePalette } from "./ui"

const dayFormat = new Intl.DateTimeFormat("pt-BR", { dateStyle: "full" })
const shortDay = new Intl.DateTimeFormat("pt-BR", { weekday: "short" })
const agentOrder = ["nutrition", "mental", "physical", "study"] as const

export function TodayHeader({ day, week, openDay, openProfile }: {
  day: string
  week: DayActivity[]
  openDay: (date: string) => void
  openProfile: () => void
}) {
  const color = usePalette()
  const date = new Date(day + "T12:00:00")
  return (
    <View style={style.header}>
      <View style={style.headerTop}>
        <View style={style.wordmark}>
          <View style={[style.logo, { backgroundColor: color.lime }]}>
            <Icon name="leaf" color={tones.onAction} size={21} />
          </View>
          <Text style={[style.brand, { color: color.ink }]}>Cultiva</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Abrir preferências do perfil"
          onPress={openProfile}
          style={({ pressed }) => [style.gear, { backgroundColor: pressed ? color.surface : "transparent" }]}
        >
          <Icon name="settings" color={color.muted} size={24} />
        </Pressable>
      </View>
      <View style={style.dateSpread}>
        <View pointerEvents="none" importantForAccessibility="no-hide-descendants" style={style.etching}>
          <BotanicalEtching ink={color.muted} grid={color.line} />
        </View>
        <View style={style.titleColumn}>
          <Text accessibilityRole="header" style={[style.display, { color: color.ink }]}>Hoje.</Text>
          <Text style={[style.date, { color: color.ink }]}>{dayFormat.format(date).replace(/ de \d{4}$/, "")}</Text>
        </View>
        <View style={style.dateStamp} accessible accessibilityLabel={`Dia ${date.getDate()}, semana ${isoWeek(day)}`}>
          <Text style={[style.dayNumber, { color: color.ink }]}>{date.getDate()}</Text>
          <Text style={[style.weekStamp, { color: tones.onAction, backgroundColor: color.lime }]}>Sem. {isoWeek(day)}</Text>
        </View>
      </View>
      <View style={style.weekStrip}>
        {week.map(item => {
          const active = item.date === day
          const value = new Date(item.date + "T12:00:00")
          const ink = active ? tones.onAction : color.ink
          return (
            <Pressable
              key={item.date}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`Abrir agenda de ${dayFormat.format(value)}, ${item.total} tarefas`}
              onPress={() => openDay(item.date)}
              style={({ pressed }) => [
                style.dayCell,
                { backgroundColor: active ? color.lime : color.surface, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Text style={[style.weekday, { color: ink }]}>{shortDay.format(value).slice(0, 3)}</Text>
              <Text style={[style.cellNumber, { color: ink }]}>{value.getDate()}</Text>
              <View style={[style.dayMark, { backgroundColor: item.checkedIn || item.cups || item.total ? ink : color.line }]} />
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

function Glass({ active, ink, accent }: { active: boolean; ink: string; accent: string }) {
  return (
    <Svg width="100%" height={24} viewBox="0 0 18 24" preserveAspectRatio="xMidYMid meet" accessible={false}>
      {active && <Path d="M3 8Q9 11 15 8L13.6 21H4.4Z" fill={accent} />}
      <Path d="M2 3H16L14 20Q13.8 22 12 22H6Q4.2 22 4 20L2 3Z" fill="none" stroke={ink} strokeWidth={1.35} strokeLinejoin="round" />
      {active && <Path d="M3 8Q9 11 15 8" fill="none" stroke={ink} strokeWidth={0.65} />}
    </Svg>
  )
}

export function TodayModules({ water, goal, ready, pending, done, total, busy, canUndo, addWater, undoWater, saveGoal, newTask, taskOpen }: {
  water: number
  goal?: number
  ready: boolean
  pending: number
  done: number
  total: number
  busy: boolean
  canUndo: boolean
  addWater: () => void
  undoWater: () => void
  saveGoal: (goal: number) => void
  newTask: () => void
  taskOpen: boolean
}) {
  const color = usePalette()
  const { width, fontScale } = useWindowDimensions()
  const reduced = useReducedMotion()
  const [editingGoal, setEditingGoal] = useState(false)
  const [goalText, setGoalText] = useState("")
  const alpha = useRef(new Animated.Value(1)).current
  const last = useRef(water)
  const split = width >= 356 && fontScale <= 1.25 && !editingGoal
  const nextGoal = Number(goalText)
  useEffect(() => {
    const grew = water > last.current
    last.current = water
    if (!grew || reduced) {
      alpha.setValue(1)
      return
    }
    alpha.setValue(0.18)
    const tween = Animated.timing(alpha, { toValue: 1, duration: 270, useNativeDriver: true })
    tween.start()
    return () => tween.stop()
  }, [alpha, water, reduced])
  return (
    <View style={[style.modules, split && style.modulesSplit]}>
      <View style={[style.module, split && style.waterColumn, { backgroundColor: color.surface, borderColor: color.line }]}>
        <View style={style.moduleTitle}>
          <Icon name="water" color={color.ink} size={18} />
          <Text style={[style.kicker, { color: color.ink }]}>Hidratação</Text>
        </View>
        <View style={style.numbers}>
          <Text style={[style.figure, { color: color.ink }]}>{ready ? water : "–"}</Text>
          <Text style={[style.meta, { color: color.muted }]}>{goal ? `/ ${goal} copos` : "copos"}</Text>
        </View>
        {goal !== undefined && <View style={style.glasses} accessible accessibilityLabel={ready ? `${water} de ${goal} copos` : "Carregando hidratação"}>
          {Array.from({ length: goal }, (_, index) => {
            const filled = ready && index < water
            const fade = filled && index === Math.min(water, goal) - 1
            return (
              <Animated.View key={index} style={[style.glass, fade && { opacity: alpha }]}>
                {goal <= 10 ? <Glass active={filled} ink={color.ink} accent={color.lime} /> :
                  <View style={[style.segment, { backgroundColor: filled ? color.lime : color.line }]} />}
              </Animated.View>
            )
          })}
        </View>}
        <Button label="Adicionar copo" icon="plus" selected={false} disabled={busy || !ready} onPress={addWater} />
        <View style={style.waterLinks}>
          <Pressable accessibilityRole="button" hitSlop={5} style={style.textAction} onPress={() => {
            setGoalText(goal === undefined ? "" : String(goal))
            setEditingGoal(!editingGoal)
          }}>
            <Text style={[style.link, { color: color.ink }]}>{editingGoal ? "Fechar meta" : goal ? "Ajustar meta" : "Definir meta"}</Text>
          </Pressable>
          {canUndo && <Pressable accessibilityRole="button" accessibilityLabel="Desfazer último copo" disabled={busy} style={style.textAction} onPress={undoWater}>
            <Text style={[style.link, { color: color.ink }]}>Desfazer</Text>
          </Pressable>}
        </View>
        {editingGoal && <>
          <Field label="Meta de copos" keyboardType="number-pad" maxLength={2} value={goalText} onChangeText={setGoalText} />
          <Button label="Salvar meta" disabled={busy || !Number.isInteger(nextGoal) || nextGoal < 1 || nextGoal > 20}
            onPress={() => { saveGoal(nextGoal); setEditingGoal(false) }} />
        </>}
      </View>
      <View style={[style.module, split && style.routineColumn, { backgroundColor: color.lime, borderColor: color.lime }]}>
        <View style={style.moduleTitle}>
          <Icon name="check" color={tones.onAction} size={18} />
          <Text style={[style.kicker, { color: tones.onAction }]}>Rotina</Text>
        </View>
        <Text style={[style.figure, { color: tones.onAction }]}>{ready ? pending : "–"}</Text>
        <Text style={[style.meta, { color: tones.onAction }]}>{pending === 1 ? "tarefa pendente" : "tarefas pendentes"}</Text>
        <View style={[style.taskMeter, { backgroundColor: tones.onAction + "30" }]}>
          {total > 0 && <View style={[style.meterFill, { width: `${100 * done / total}%` }]} />}
        </View>
        {total > 0 && <Text style={[style.small, { color: tones.onAction }]}>{done} de {total} concluídas</Text>}
        {!taskOpen && <Pressable accessibilityRole="button" onPress={newTask} style={({ pressed }) => [
          style.newTask, { opacity: pressed ? 0.7 : 1 },
        ]}>
          <Icon name="plus" color={tones.onAction} size={17} />
          <Text style={[style.link, { color: tones.onAction }]}>Nova tarefa</Text>
        </Pressable>}
      </View>
    </View>
  )
}

export function TodayJourney({ days, goal }: { days: DayActivity[]; goal?: number }) {
  const color = usePalette()
  if (!days.some(day => day.checkedIn || day.cups || day.total)) return null
  const rows: { name: string; icon: IconName; summary: string; strength: (day: DayActivity) => number }[] = [
    { name: "Check-ins", icon: "leaf", summary: `${days.filter(day => day.checkedIn).length}/7`, strength: day => day.checkedIn ? 1 : 0 },
    { name: "Água", icon: "water", summary: `${days.filter(day => day.cups > 0).length}/7 dias`, strength: day => goal ? Math.min(1, day.cups / goal) : Number(day.cups > 0) },
    { name: "Tarefas", icon: "check", summary: days.some(day => day.total) ? `${days.reduce((sum, day) => sum + day.done, 0)}/${days.reduce((sum, day) => sum + day.total, 0)}` : "Sem tarefas", strength: day => day.total ? day.done / day.total : 0 },
  ]
  return (
    <View style={style.section}>
      <Row><Copy heading label="Sua jornada" /><Copy muted label="Últimos 7 dias" /></Row>
      <View style={[style.journey, { borderColor: color.line }]}>
        {rows.map(row => (
          <View key={row.name} style={style.journeyRow}>
            <Row><Icon name={row.icon} size={16} color={color.ink} /><Copy label={row.name} /></Row>
            <View style={style.heat}>
              {days.map(day => {
                const strength = row.strength(day)
                return <View key={day.date} accessible accessibilityLabel={`${dayFormat.format(new Date(day.date + "T12:00:00"))}: ${Math.round(strength * 100)}%`}
                  style={[style.heatCell, { backgroundColor: strength ? color.lime : color.line, opacity: strength ? 0.38 + strength * 0.62 : 0.5 }]} />
              })}
            </View>
            <Text style={[style.summary, { color: color.ink }]}>{row.summary}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

export function TodayAgents({ openAll, openAgent }: { openAll: () => void; openAgent: (agent: Agent) => void }) {
  const color = usePalette()
  const { width, fontScale } = useWindowDimensions()
  const compact = width >= 340 && fontScale <= 1.25
  return (
    <View style={style.section}>
      <View style={style.agentHeader}>
        <Copy heading label="Seus agentes" />
        <Button label="Ver todos" icon="arrow" selected={false} onPress={openAll} />
      </View>
      <View style={style.agentGrid}>
        {agentOrder.map((agent, index) => {
          const bright = index % 2 === 1
          return (
            <Pressable key={agent} accessibilityRole="button" accessibilityLabel={`Abrir ${agents[agent].title}`}
              onPress={() => openAgent(agent)} style={({ pressed }) => [
                style.agentTile, { flexBasis: compact ? "21%" : "45%", opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <View style={[style.agentArt, { backgroundColor: bright ? color.lime : color.hero }]}>
                <AgentMonogram agent={agent} ink={bright ? tones.onAction : color.lime} />
              </View>
              <Text style={[style.agentName, { color: color.ink }]}>{agents[agent].title}</Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

const style = StyleSheet.create({
  header: { gap: 11 },
  headerTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  wordmark: { flexDirection: "row", gap: 10, alignItems: "center" },
  logo: { width: 35, height: 35, transform: [{ rotate: "-9deg" }], alignItems: "center", justifyContent: "center" },
  brand: { fontWeight: "800", fontSize: 21, letterSpacing: -0.5 },
  gear: { width: 44, height: 44, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  dateSpread: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 10, minHeight: 108 },
  titleColumn: { flex: 1, gap: 2 },
  display: { fontSize: 67, fontWeight: "900", letterSpacing: -5 },
  date: { fontSize: 14, fontWeight: "500", lineHeight: 19 },
  dateStamp: { alignItems: "flex-end", gap: 2 },
  dayNumber: { fontSize: 64, lineHeight: 68, fontWeight: "900", letterSpacing: -5, fontVariant: ["tabular-nums"] },
  weekStamp: { paddingHorizontal: 8, paddingVertical: 4, fontSize: 12, fontWeight: "800", borderRadius: 4 },
  etching: { position: "absolute", right: "22%", top: -31, width: "39%", height: 133, opacity: 0.58 },
  weekStrip: { flexDirection: "row", gap: 5 },
  dayCell: { flex: 1, minHeight: 58, borderRadius: 8, justifyContent: "center", alignItems: "center", gap: 2 },
  weekday: { fontSize: 10, fontWeight: "600" },
  cellNumber: { fontSize: 16, fontWeight: "800", fontVariant: ["tabular-nums"] },
  dayMark: { width: 5, height: 5, borderRadius: 3, marginTop: 1 },
  modules: { gap: 9 },
  modulesSplit: { flexDirection: "row" },
  module: { borderRadius: 13, borderWidth: 1, padding: 11, gap: 8 },
  waterColumn: { flex: 1.17 },
  routineColumn: { flex: 1 },
  moduleTitle: { flexDirection: "row", alignItems: "center", gap: 5 },
  kicker: { fontWeight: "800", fontSize: 13 },
  numbers: { flexDirection: "row", flexWrap: "wrap", alignItems: "baseline", gap: 4 },
  figure: { fontSize: 45, fontWeight: "900", lineHeight: 49, letterSpacing: -2, fontVariant: ["tabular-nums"] },
  meta: { fontSize: 13, fontWeight: "500" },
  small: { fontSize: 11, fontWeight: "600" },
  glasses: { flexDirection: "row", alignItems: "center", gap: 1, minHeight: 24 },
  glass: { flex: 1, minWidth: 1 },
  segment: { height: 10, borderRadius: 2 },
  waterLinks: { flexDirection: "row", flexWrap: "wrap", columnGap: 7 },
  textAction: { minHeight: 34, justifyContent: "center" },
  link: { fontSize: 12, fontWeight: "700" },
  taskMeter: { height: 4, borderRadius: 2, overflow: "hidden", marginTop: 3 },
  meterFill: { height: "100%", backgroundColor: tones.onAction, borderRadius: 2 },
  newTask: { minHeight: 44, marginTop: "auto", flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: tones.onAction, paddingHorizontal: 8 },
  section: { gap: 10 },
  journey: { borderWidth: 1, borderRadius: 10, gap: 9, padding: 10 },
  journeyRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 7, justifyContent: "space-between" },
  heat: { flexDirection: "row", gap: 3 },
  heatCell: { width: 10, height: 13, borderRadius: 3 },
  summary: { fontSize: 12, fontWeight: "700", textAlign: "right", minWidth: 49, fontVariant: ["tabular-nums"] },
  agentHeader: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8 },
  agentGrid: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  agentTile: { flexGrow: 1, gap: 6, alignItems: "stretch" },
  agentArt: { borderRadius: 11, height: 72, alignItems: "center", justifyContent: "center" },
  agentName: { textAlign: "center", fontSize: 12, fontWeight: "800" },
})

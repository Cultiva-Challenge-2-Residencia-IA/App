import { useCallback, useState } from "react"
import { Alert, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native"
import { useFocusEffect, useRouter } from "expo-router"
import { localDay, put, rows, stepDay, type CheckIn, type Event } from "./backend"
import { AgentReports } from "./agent-reports"
import { Icon } from "./icons"
import { mealDraft, latestMealLogs, mealStatus, readPlan, type Meal, type MealLog, type MealStatus } from "./nutrition-data"
import { NutritionImport } from "./nutrition-import"
import { usePreferences } from "./preferences"
import { hydrationOn, waterGoal } from "./hydration"
import { useLocalToday } from "./use-local-today"
import { CheckInOrbits } from "./today-art"
import { Button, Card, Copy, Field, Row, Status, tones, useAction, usePalette } from "./ui"

const dateLabel = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short" })

function Consumption({ meal, log, save }: { meal: Meal; log?: MealLog; save: (status: MealStatus, actual: string) => Promise<void> }) {
  const [status, setStatus] = useState<MealStatus | undefined>(log?.status)
  const [actual, setActual] = useState(log?.actual ?? "")
  const action = useAction()
  const needsDetail = status === "partial" || status === "substituted"
  return (
    <>
      <Copy heading label="Consumo real" />
      <Row>{(Object.keys(mealStatus) as MealStatus[]).map(value => (
        <Button key={value} label={mealStatus[value]} selected={status === value} disabled={action.busy} onPress={() => setStatus(value)} />
      ))}</Row>
      <Field label={status === "skipped" ? "Motivo ou observação (opcional)" : "Alimentos e porções consumidos"}
        value={actual} onChangeText={setActual} maxLength={1500} multiline />
      {status === "completed" && <Button label="Preencher com os itens do plano" selected={false}
        onPress={() => setActual(meal.foods.map(food => food.name + (food.portion ? " — " + food.portion : "")).join("\n").slice(0, 1500))} />}
      <Status {...action} />
      <Button label={log ? "Atualizar consumo" : "Registrar consumo"} icon="check"
        disabled={!status || action.busy || (needsDetail && !actual.trim())} onPress={() => {
          if (status) void action.run(() => save(status, actual.trim()))
        }} />
    </>
  )
}


const statusOrder: MealStatus[] = ["completed", "partial", "substituted", "skipped"]
const statusGlyph = { completed: "✓", partial: "◐", substituted: "⇄", skipped: "×" }
const fullDate = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "short" })
const dateOf = (day: string) => new Date(day + "T12:00:00")

function Menu<T extends string | number>({ label, value, options, format, select, menu, toggle, standalone }: {
  label: string; value: T; options: T[]; format: (value: T) => string; select: (value: T) => void; menu: boolean; toggle: () => void
  standalone?: boolean
}) {
  const color = usePalette()
  return <View style={standalone ? undefined : styles.metric}>
    <Pressable accessibilityRole="button" accessibilityLabel={label + ", " + format(value)}
      accessibilityState={{ expanded: menu }} onPress={toggle} style={[styles.picker, { backgroundColor: color.surface, borderColor: color.line }]}>
      <Text style={[styles.smallTitle, styles.metric, { color: color.ink }]}>{format(value)}</Text>
      <Text style={{ color: color.ink }}>⌄</Text>
    </Pressable>
    {menu && <View style={[styles.box, { backgroundColor: color.surface, borderColor: color.line }]}>
      {options.map(option => <Pressable key={option} accessibilityRole="button" accessibilityState={{ selected: value === option }}
        onPress={() => { select(option); toggle() }} style={styles.option}>
        <Text style={{ color: color.ink, fontWeight: value === option ? "800" : "400" }}>{format(option)}</Text>
      </Pressable>)}
    </View>}
  </View>
}

function LinkRow({ title, subtitle, icon, press, accent = false, expanded }: {
  title: string; subtitle?: string; icon: Parameters<typeof Icon>[0]["name"]; press: () => void; accent?: boolean; expanded?: boolean
}) {
  const color = usePalette()
  const ink = accent ? tones.onAction : color.ink
  return <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={press}
    style={({ pressed }) => [styles.link, { backgroundColor: accent ? color.lime : color.surface, borderColor: accent ? color.lime : color.line, opacity: pressed ? 0.75 : 1 }]}>
    <View style={[styles.tile, { backgroundColor: accent ? "transparent" : color.lime + "25" }]}><Icon name={icon} color={ink} size={23} /></View>
    <View style={styles.metric}>
      <Text style={[styles.linkTitle, { color: ink }]}>{title}</Text>
      {!!subtitle && <Text style={[styles.meta, { color: accent ? ink : color.muted }]}>{subtitle}</Text>}
    </View>
    <Text style={[styles.chevron, { color: ink }]}>{expanded ? "⌄" : "›"}</Text>
  </Pressable>
}

function Segments({ count, filled, cups = false }: { count: number; filled: number; cups?: boolean }) {
  const color = usePalette()
  const size = Math.min(count, 10)
  return <View accessible={false} style={styles.segments}>
    {Array.from({ length: size }, (_, i) => <View key={i} style={[styles.segment, cups && styles.cup,
      { backgroundColor: i < Math.round(filled * size / count) ? cups ? color.accent : color.lime : color.line }]} />)}
  </View>
}

export function NutritionTools({ openChat, scanner, startImport, acceptImport }: {
  openChat: (message?: string) => void
  scanner: () => void
  startImport?: boolean
  acceptImport: () => void
}) {
  const color = usePalette()
  const { width, fontScale } = useWindowDimensions()
  const router = useRouter()
  const preferences = usePreferences()
  const plan = readPlan(preferences.values.nutrition_plan)
  const today = localDay()
  const [data, setData] = useState<{ events: Event[]; checkIns: CheckIn[] }>()
  const [mode, setMode] = useState<"dashboard" | "import" | "edit">(startImport ? "import" : "dashboard")
  const [entry, setEntry] = useState<"document" | "text" | "describe">()
  const [selectedDay, setSelectedDay] = useState<string>()
  const [expanded, setExpanded] = useState<string>()
  const [menu, setMenu] = useState<"day" | "range" | "meal">()
  const [showPlan, setShowPlan] = useState(false)
  const [showWater, setShowWater] = useState(false)
  const [showQuestions, setShowQuestions] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showReports, setShowReports] = useState(false)
  const [range, setRange] = useState(7)
  const [mealFilter, setMealFilter] = useState("")
  const [notice, setNotice] = useState("")
  const action = useAction()
  const day = selectedDay ?? today
  const isToday = day === today
  const goal = waterGoal(preferences.values.water_goal)

  const load = useCallback(async () => {
    const [events, checkIns] = await Promise.all([rows<Event>("events"), rows<CheckIn>("checkins")])
    setData({ events, checkIns })
  }, [])
  useFocusEffect(useCallback(() => {
    if (startImport) {
      setEntry(undefined)
      setMode("import")
      acceptImport()
    }
    void action.run(load)
  }, [load, startImport]))

  const events = data?.events ?? []
  const water = data && hydrationOn(day, data.checkIns, events).cups
  const logs = latestMealLogs(events)
  const dayMeals = plan ? [...plan.meals].sort((a, b) => (a.time || "99").localeCompare(b.time || "99")) : []
  const byMeal = new Map(logs.filter(log => log.planId === plan?.id && log.day === day).map(log => [log.mealId, log]))
  const eaten = dayMeals.filter(meal => {
    const status = byMeal.get(meal.id)?.status
    return status === "completed" || status === "partial" || status === "substituted"
  }).length
  const from = stepDay(today, 1 - range)
  const mealNames = [...new Set(logs.map(log => log.mealName))].sort((a, b) => a.localeCompare(b, "pt-BR"))
  const history = logs.filter(log => log.day >= from && log.day <= today && (!mealFilter || log.mealName === mealFilter))
  const days = Array.from({ length: 7 }, (_, i) => stepDay(today, -i))
  const horizontal = width >= 340 && fontScale <= 1.35
  const statusColors = { completed: color.lime, partial: "#FFB36A", substituted: color.accent, skipped: "#F18CB0" }

  function start(source?: typeof entry) {
    setEntry(source)
    setMode("import")
  }

  function archivePlan() {
    Alert.alert("Desativar o plano atual?", "Os registros de consumo continuam no histórico.", [
      { text: "Cancelar", style: "cancel" },
      { text: "Desativar", style: "destructive", onPress: () => void action.run(async () => {
        await preferences.save("nutrition_plan", null)
        setShowPlan(false)
        setNotice("Plano desativado.")
      }) },
    ])
  }

  function mark(status?: MealStatus) {
    return <View style={[styles.mark, { borderColor: status ? statusColors[status] : color.line, backgroundColor: status ? statusColors[status] : "transparent" }]}>
      {!!status && <Text style={[styles.smallTitle, { color: tones.onAction }]}>{statusGlyph[status]}</Text>}
    </View>
  }

  return <>
    {mode !== "dashboard" ? (
      <NutritionImport key={mode} events={events} current={mode === "edit" ? plan : undefined} scanner={scanner}
        entry={mode === "import" ? entry : undefined}
        close={() => setMode("dashboard")} activate={async draft => {
          await preferences.save("nutrition_plan", draft)
          setNotice("Plano confirmado.")
          setExpanded(undefined)
          setSelectedDay(undefined)
          setShowPlan(false)
          setMode("dashboard")
        }} />
    ) : <>
      {plan ? <>
        <LinkRow title="Seu plano alimentar" subtitle={plan.name} icon="record" expanded={showPlan} press={() => setShowPlan(!showPlan)} />
        {showPlan && <Card>
          {!!plan.notes && <Copy label={plan.notes} />}
          <Row>
            <Button label="Revisar plano" icon="edit" selected={false} onPress={() => setMode("edit")} />
            <Button label="Importar novo" icon="scan" selected={false} onPress={() => start()} />
            <Button label="Desativar plano" selected={false} disabled={action.busy} onPress={archivePlan} />
          </Row>
        </Card>}
        <View style={[styles.header, horizontal && styles.horizontal]}>
          <View style={styles.metric}>
            <Text accessibilityRole="header" style={[styles.title, { color: color.ink }]}>{isToday ? "Hoje" : dateLabel.format(dateOf(day))}</Text>
            <Copy muted label={fullDate.format(dateOf(day))} />
          </View>
          <View style={horizontal ? styles.datePicker : undefined}>
            <Menu standalone label="Data do acompanhamento" value={day} options={days} format={value => value === today ? "Hoje" : dateLabel.format(dateOf(value))}
              select={value => { setSelectedDay(value === today ? undefined : value); setExpanded(undefined) }}
              menu={menu === "day"} toggle={() => setMenu(menu === "day" ? undefined : "day")} />
          </View>
        </View>
      </> : <>
        <View style={styles.empty}>
          <View pointerEvents="none" importantForAccessibility="no-hide-descendants" style={styles.orbits}><CheckInOrbits ink={color.accent} /></View>
          <Text accessibilityRole="header" style={[styles.emptyTitle, { color: color.ink }]}>Ainda não há uma dieta registrada</Text>
          <Copy label="Envie seu plano alimentar para acompanhar suas refeições e sua hidratação." />
        </View>
        <View style={styles.list}>
          <LinkRow title="Escanear documento" subtitle="PDF, imagem ou foto" icon="scan" press={() => start("document")} />
          <LinkRow title="Colar texto" subtitle="Cole o texto do seu plano" icon="record" press={() => start("text")} />
          <LinkRow title="Descrever com a IA" subtitle="Descreva as refeições do seu plano" icon="message" press={() => start("describe")} />
        </View>
        <View style={[styles.tip, { backgroundColor: color.lime }]}>
          <Icon name="spark" size={23} color={tones.onAction} />
          <View style={styles.metric}>
            <Text style={[styles.linkTitle, { color: tones.onAction }]}>Dica</Text>
            <Text style={[styles.meta, { color: tones.onAction }]}>Revise os alimentos, porções e horários antes de confirmar o plano.</Text>
          </View>
        </View>
      </>}

      <View style={[styles.box, styles.stats, horizontal && styles.horizontal, { backgroundColor: color.surface, borderColor: color.line }]}>
        {plan && <View style={[styles.metric, styles.stat, horizontal && styles.metricDivider, { borderColor: color.line }]}>
          <Text style={[styles.smallTitle, { color: color.ink }]}>Refeições</Text>
          <Text accessibilityLabel={data ? eaten + " de " + dayMeals.length + " refeições consumidas" : "Carregando refeições"}
            style={[styles.figure, { color: color.ink }]}>{data && dayMeals.length ? eaten + "/" + dayMeals.length : "–"}</Text>
          <Segments count={dayMeals.length} filled={data ? eaten : 0} />
        </View>}
        <View style={[styles.metric, styles.stat]}>
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: showWater }} onPress={() => setShowWater(!showWater)} style={styles.waterControl}>
            <Text style={[styles.smallTitle, styles.metric, { color: color.ink }]}>Hidratação</Text>
            <Text style={{ color: color.ink }}>{showWater ? "⌃" : "⌄"}</Text>
          </Pressable>
          <Text style={[styles.figure, { color: color.ink }]}>{water ?? "–"}{goal ? "/" + goal : ""} <Text style={[styles.meta, { color: color.muted }]}>copos</Text></Text>
          {goal !== undefined && <Segments count={goal} filled={water ?? 0} cups />}
        </View>
      </View>
      {showWater && <Row>
        {isToday && <Button label="Adicionar um copo" icon="plus" disabled={action.busy || water === undefined} onPress={() =>
          void action.run(async () => {
            await put("events", { type: "water.logged", payload: { amount: 1, source: "agent-toolkit", day } })
            await load()
          })} />}
        <Button label="Ver Hoje" selected={false} onPress={() => router.navigate("/today")} />
      </Row>}

      {plan && <>
        <Text accessibilityRole="header" style={[styles.section, { color: color.ink }]}>{isToday ? "Refeições de hoje" : "Refeições do dia"}</Text>
        {!isToday && byMeal.size === 0 && <Copy muted label="Nenhum registro do plano atual nesta data." />}
        <View style={styles.list}>
          {dayMeals.map(meal => {
            const log = byMeal.get(meal.id)
            const open = expanded === meal.id
            const summary = log?.actual || (log?.status === "skipped" ? "Consumo não registrado" : meal.foods.map(food => food.name).join(", "))
            return <View key={meal.id} style={[styles.box, { borderColor: color.line, backgroundColor: color.surface }]}>
              <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }}
                onPress={() => setExpanded(open ? undefined : meal.id)} style={({ pressed }) => [styles.mealHeader, { opacity: pressed ? 0.7 : 1 }]}>
                {mark(log?.status)}
                <View style={styles.metric}>
                  <View style={styles.mealTitle}>
                    <Text style={[styles.smallTitle, { color: color.ink }]}>{meal.name}</Text>
                    {!!meal.time && <Text style={[styles.meta, { color: color.muted }]}>{meal.time}</Text>}
                  </View>
                  {!!summary && <Text numberOfLines={1} style={[styles.meta, { color: color.muted }]}>{summary}</Text>}
                </View>
                {!!log && <Text style={[styles.badge, { color: tones.onAction, backgroundColor: statusColors[log.status] }]}>{mealStatus[log.status]}</Text>}
                <Text style={[styles.chevron, { color: color.ink }]}>{open ? "⌄" : "›"}</Text>
              </Pressable>
              {open && <View style={[styles.details, { borderColor: color.line }]}>
                {meal.foods.map((food, index) => <View key={index} style={styles.food}>
                  <Copy label={food.name + (food.portion ? " — " + food.portion : "")} />
                  {!!food.alternatives && <Copy muted label={"Alternativas: " + food.alternatives} />}
                </View>)}
                {!!meal.notes && <Copy muted label={meal.notes} />}
                {!!log?.actual && <Copy label={log.actual} />}
                <Button label="Conversar sobre esta refeição" icon="message" selected={false} onPress={() => openChat(mealDraft(plan, meal))} />
                {!!data && isToday && <Consumption key={meal.id + (log?.id ?? "")} meal={meal} log={log}
                  save={async (status, actual) => {
                    await put("events", { type: "nutrition.meal.logged", payload: { planId: plan.id, mealId: meal.id, mealName: meal.name, day: today, status, actual } })
                    setNotice("Consumo registrado.")
                    await load()
                  }} />}
              </View>}
            </View>
          })}
        </View>
        <LinkRow title="Perguntar sobre uma refeição" subtitle="Tire dúvidas ou converse sobre substituições." icon="message"
          accent expanded={showQuestions} press={() => setShowQuestions(!showQuestions)} />
        {showQuestions && <Card><Row>{dayMeals.map(meal =>
          <Button key={meal.id} label={meal.name} selected={false} onPress={() => openChat(mealDraft(plan, meal))} />)}</Row></Card>}
      </>}

      {(plan || logs.length > 0) && <>
        <Text accessibilityRole="header" style={[styles.section, { color: color.ink }]}>Histórico alimentar</Text>
        <View style={[styles.filters, horizontal && styles.horizontal]}>
          <Menu label="Período do histórico" value={range} options={[1, 7, 30]} format={days => days === 1 ? "Hoje" : "Últimos " + days + " dias"}
            select={setRange} menu={menu === "range"} toggle={() => setMenu(menu === "range" ? undefined : "range")} />
          <Menu label="Refeição do histórico" value={mealFilter} options={["", ...mealNames]} format={name => name || "Todas as refeições"}
            select={setMealFilter} menu={menu === "meal"} toggle={() => setMenu(menu === "meal" ? undefined : "meal")} />
        </View>
        <View style={[styles.box, styles.counts, { borderColor: color.line, backgroundColor: color.surface }]}>
          {statusOrder.map((status, i) => <View key={status} style={[
            styles.count, horizontal ? styles.metric : styles.half, horizontal && i > 0 && styles.countDivider, { borderColor: color.line },
          ]}>
            {mark(status)}
            <Text style={[styles.countNumber, { color: color.ink }]}>{data ? history.filter(log => log.status === status).length : "–"}</Text>
            <Text style={[styles.countLabel, { color: color.muted }]}>{["Realizadas", "Parciais", "Substituídas", "Puladas"][i]}</Text>
          </View>)}
        </View>
        <LinkRow title={showHistory ? "Recolher histórico" : "Ver histórico completo"} icon="record" expanded={showHistory}
          press={() => setShowHistory(!showHistory)} />
        {showHistory && <Card>
          {!!data && history.length === 0 && <Copy muted label="Nenhum consumo registrado com esses filtros." />}
          {history.map(log => <View key={log.id} style={[styles.historyRow, { borderColor: color.line }]}>
            {mark(log.status)}
            <View style={styles.metric}>
              <Copy label={log.mealName} />
              <Copy muted label={mealStatus[log.status] + " · " + dateLabel.format(dateOf(log.day))} />
              {!!log.actual && <Copy label={log.actual} />}
            </View>
          </View>)}
        </Card>}
      </>}
      <Button label={showReports ? "Recolher relatórios" : "Relatórios e notas"} icon="note" selected={showReports} onPress={() => setShowReports(!showReports)} />
      {showReports && <AgentReports agent="nutrition" events={events} refresh={load} openChat={openChat} />}
    </>}
    <Status {...action} />
    {!!action.error && <Button label="Atualizar acompanhamento" selected={false} onPress={() => void action.run(load)} />}
    {!!notice && <Copy muted label={notice} />}
  </>
}

const styles = StyleSheet.create({
  header: { gap: 8, marginTop: 3 },
  horizontal: { flexDirection: "row", alignItems: "flex-start" },
  title: { fontSize: 37, fontWeight: "900", letterSpacing: -1.5 },
  emptyTitle: { fontSize: 35, fontWeight: "900", letterSpacing: -1.4 },
  section: { fontSize: 24, fontWeight: "900", letterSpacing: -0.65, marginTop: 7 },
  empty: { gap: 7, paddingHorizontal: 7, paddingBottom: 5 },
  orbits: { width: "72%", maxWidth: 280, height: 150, alignSelf: "center" },
  list: { gap: 6 },
  box: { borderWidth: 1, borderRadius: 14 },
  link: { borderWidth: 1, borderRadius: 14, padding: 9, minHeight: 55, flexDirection: "row", alignItems: "center", gap: 9 },
  tile: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  linkTitle: { fontSize: 17, fontWeight: "900", letterSpacing: -0.3 },
  tip: { padding: 14, borderRadius: 14, flexDirection: "row", gap: 10 },
  stats: { padding: 12, gap: 11 },
  stat: { gap: 3 },
  metric: { flex: 1, minWidth: 0 },
  metricDivider: { borderRightWidth: StyleSheet.hairlineWidth, paddingRight: 11 },
  waterControl: { flexDirection: "row", alignItems: "center", minHeight: 24 },
  figure: { fontSize: 30, fontWeight: "900", letterSpacing: -1 },
  segments: { flexDirection: "row", gap: 3, alignItems: "center", minHeight: 14 },
  segment: { flex: 1, height: 7, borderRadius: 4 },
  cup: { height: 12, borderRadius: 2 },
  mealHeader: { flexDirection: "row", minHeight: 53, gap: 7, padding: 8, alignItems: "center" },
  mealTitle: { flexDirection: "row", alignItems: "baseline", flexWrap: "wrap", columnGap: 6 },
  mark: { width: 25, height: 25, borderWidth: 1, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  smallTitle: { fontSize: 14, fontWeight: "800" },
  meta: { fontSize: 13 },
  badge: { fontSize: 11, fontWeight: "800", borderRadius: 12, paddingVertical: 3, paddingHorizontal: 5, maxWidth: "33%" },
  chevron: { fontSize: 23, lineHeight: 25 },
  details: { gap: 8, borderTopWidth: StyleSheet.hairlineWidth, padding: 10 },
  food: { gap: 2 },
  filters: { gap: 6 },
  picker: { minHeight: 42, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
  option: { minHeight: 44, justifyContent: "center", paddingHorizontal: 10, paddingVertical: 6 },
  datePicker: { minWidth: 92, marginTop: 3 },
  counts: { paddingVertical: 9, flexDirection: "row", flexWrap: "wrap" },
  count: { alignItems: "center", gap: 3, paddingHorizontal: 2, paddingVertical: 4 },
  half: { width: "50%" },
  countDivider: { borderLeftWidth: StyleSheet.hairlineWidth },
  countNumber: { fontSize: 20, fontWeight: "900" },
  countLabel: { fontSize: 11, textAlign: "center" },
  historyRow: { borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: 7, flexDirection: "row", alignItems: "flex-start", gap: 7 },
})

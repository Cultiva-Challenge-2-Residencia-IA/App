import { useCallback, useState } from "react"
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native"
import { useFocusEffect, useRouter } from "expo-router"
import { randomUUID } from "expo-crypto"
import * as DocumentPicker from "expo-document-picker"
import { File, Paths } from "expo-file-system"
import Svg, { Path } from "react-native-svg"
import { client, localDay, put, rows, type Event } from "./backend"
import { AgentReports } from "./agent-reports"
import { agendaDraft } from "./agenda-suggestions"
import { Icon, type IconName } from "./icons"
import { usePreferences } from "./preferences"
import { Button, Card, Copy, Field, Row, Status, tones, useAction, usePalette } from "./ui"

const fields = ["Séries", "Repetições", "Carga", "Descanso"] as const
type Exercise = { id: string; name: string; details: string[] }
type Workout = { id: string; name: string; exercises: Exercise[] }
const mobility: Workout = {
  id: "mobility", name: "Mobilidade para coluna",
  exercises: [{ id: "mobilidade-coluna", name: "Mobilidade para coluna", details: [] }],
}
const emptyExercise = (): Exercise => ({ id: randomUUID(), name: "", details: [] })

export function WorkoutTools({ scanner, openChat, startImport, acceptImport }: {
  scanner: () => void; openChat: (message?: string) => void; startImport: boolean; acceptImport: () => void
}) {
  const color = usePalette()
  const router = useRouter()
  const { width, fontScale } = useWindowDimensions()
  const prefs = usePreferences()
  const action = useAction()
  const [events, setEvents] = useState<Event[]>()
  const [panel, setPanel] = useState<"import" | "history" | "switch" | "reports">()
  const [draft, setDraft] = useState<Workout>()
  const [source, setSource] = useState("")
  const [showScans, setShowScans] = useState(false)
  const [expanded, setExpanded] = useState<string>()
  const today = localDay()
  const stored = prefs.values.physical_workouts as { active?: string; workouts?: Workout[] } | undefined
  const workouts = Array.isArray(stored?.workouts) ? stored.workouts : []
  const active = workouts.find(workout => workout.id === stored?.active)
  const workout = active ?? mobility
  const latest = events?.find(event => event.type === "workout.progress" && event.payload.workoutId === workout.id && event.payload.day === today)
  const legacy = events?.find(event => (event.type === "exercise.completed" || event.type === "exercise.uncompleted") &&
    event.payload.exercise === "mobilidade-coluna" && localDay(new Date(event.created_at)) === today)
  const checked = Array.isArray(latest?.payload.completed) ? latest.payload.completed as string[] :
    !active && legacy?.type === "exercise.completed" ? ["mobilidade-coluna"] : []
  const all = workout.exercises.every(exercise => checked.includes(exercise.id))
  const history = new Map<string, { name: string; day: string; done: number; total: number }>()
  for (const event of events ?? []) {
    if (event.type === "workout.progress" && typeof event.payload.day === "string" &&
      typeof event.payload.workoutName === "string" && typeof event.payload.total === "number" && Array.isArray(event.payload.completed)) {
      const key = JSON.stringify([event.payload.workoutId, event.payload.day])
      if (!history.has(key)) history.set(key, {
        name: event.payload.workoutName, day: event.payload.day, done: event.payload.completed.length, total: event.payload.total,
      })
    } else if ((event.type === "exercise.completed" || event.type === "exercise.uncompleted") &&
      event.payload.exercise === "mobilidade-coluna") {
      const day = localDay(new Date(event.created_at))
      const key = JSON.stringify([mobility.id, day])
      if (!history.has(key)) history.set(key, { name: mobility.name, day, done: Number(event.type === "exercise.completed"), total: 1 })
    }
  }

  const load = useCallback(async () => setEvents(await rows<Event>("events")), [])
  useFocusEffect(useCallback(() => {
    if (startImport) {
      setPanel("import")
      setShowScans(true)
      acceptImport()
    }
    void action.run(load)
  }, [load, startImport]))

  function saveProgress(completed: string[]) {
    void action.run(async () => {
      await put("events", { type: "workout.progress", payload: {
        day: today, workoutId: workout.id, workoutName: workout.name, completed, total: workout.exercises.length,
      } })
      await load()
    })
  }

  function changeExercise(id: string, update: Partial<Exercise>) {
    setDraft(value => value && { ...value, exercises: value.exercises.map(exercise => exercise.id === id ? { ...exercise, ...update } : exercise) })
  }

  function reviewText(text: string, name = "") {
    const exercises = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean).slice(0, 30).map(line => {
      const [name, ...details] = line.split("|").map(part => part.trim())
      return { id: randomUUID(), name: name.slice(0, 160), details: details.slice(0, 4).map(detail => detail.slice(0, 80)) }
    }).filter(exercise => exercise.name)
    setDraft({ id: randomUUID(), name, exercises: exercises.length ? exercises : [emptyExercise()] })
  }

  function toggle(panelName: typeof panel) {
    setPanel(panel === panelName ? undefined : panelName)
  }

  function choosePdf() {
    void action.run(async () => {
      const result = await DocumentPicker.getDocumentAsync({ type: "application/pdf", copyToCacheDirectory: true })
      if (result.canceled) return
      const file = new File(result.assets[0].uri)
      try {
        if (file.size > 2_000_000) throw new Error("Selecione um PDF de até 2 MB.")
        const { data, error } = await client().functions.invoke("nutrition-plan", {
          body: { mode: "extract-pdf", pdf: await file.base64() },
        })
        if (error) {
          const detail = await error.context?.json?.().catch(() => undefined)
          throw new Error(detail?.error ?? error.message)
        }
        if (typeof data?.source !== "string" || !data.source.trim()) throw new Error("O PDF não retornou texto para revisar.")
        setSource(data.source)
      } finally {
        const cache = Paths.cache.uri.replace(/\/$/, "") + "/"
        if (file.uri.startsWith(cache) && file.exists) file.delete()
      }
    })
  }

  const shortcuts: { title: string; caption: string; icon: IconName; press: () => void }[] = [
    { title: "Importar ficha", caption: "PDF, imagem ou texto", icon: "record", press: () => toggle("import") },
    { title: "Evolução", caption: "Histórico e progresso", icon: "activity", press: () => toggle("history") },
    { title: "Planejamento", caption: "Organize seus treinos", icon: "calendar", press: () => router.navigate({
      pathname: "/agenda", params: { draft: JSON.stringify({ ...agendaDraft("physical"), label: active?.name ?? "Treino" }) },
    }) },
  ]
  const surface = { backgroundColor: color.surface, borderColor: color.line }
  const wide = width >= 350 && fontScale <= 1.25
  const scans = events?.filter(event => event.type === "scan.saved" && event.payload.agent === "physical" && typeof event.payload.details === "string") ?? []

  return <>
    <View style={[styles.card, styles.hero, surface]}>
      {wide && <View pointerEvents="none" style={styles.art}>
        <Svg viewBox="0 0 128 100" width="100%" height="100%" accessible={false}>
          <Path d="M45 18H81L63 41H27Z M63 41H99L75 69H40Z M87 57H123L105 82H69Z" fill="none" stroke={color.accent} strokeWidth={1.5} />
          <Path d="M88 3H125L109 24H72Z M22 71H59L41 96H4Z" fill={color.accent} />
        </Svg>
      </View>}
      <Text style={[styles.kicker, { color: color.muted }]}>SEU TREINO</Text>
      <Text accessibilityRole="header" style={[styles.title, { color: color.ink }]}>Treino do dia</Text>
      <Copy muted label={active ? active.name + " · " + checked.length + "/" + workout.exercises.length + " concluídos" : "Importe sua ficha para acompanhar o treino."} />
      <Row>
        <Button label="Iniciar treino" icon="check" variant="highlight" disabled={!events} onPress={() => {
          setPanel(undefined)
          setExpanded((workout.exercises.find(exercise => !checked.includes(exercise.id)) ?? workout.exercises[0]).id)
        }} />
        <Button label="Trocar treino" selected={panel === "switch"} onPress={() => toggle("switch")} />
      </Row>
    </View>
    <View style={[styles.shortcuts, wide && styles.sideBySide]}>
      {shortcuts.map(item => <Pressable key={item.title} accessibilityRole="button" onPress={item.press}
        style={({ pressed }) => [styles.card, styles.shortcut, wide && styles.flex, surface, { opacity: pressed ? 0.7 : 1 }]}>
        <Icon name={item.icon} color={color.accent} size={23} />
        <Text style={[styles.name, { color: color.ink }]}>{item.title}</Text>
        <Copy muted label={item.caption} />
      </Pressable>)}
    </View>
    {panel === "switch" && <Card>
      <Copy heading label="Escolher treino" />
      {workouts.map(item => <Button key={item.id} label={item.name} selected={item.id === active?.id} disabled={action.busy}
        onPress={() => void action.run(async () => {
          await prefs.save("physical_workouts", { active: item.id, workouts })
          setExpanded(undefined)
          setPanel(undefined)
        })} />)}
      <Button label="Mobilidade para coluna" selected={!active} disabled={action.busy} onPress={() => void action.run(async () => {
        await prefs.save("physical_workouts", { workouts })
        setExpanded(undefined)
        setPanel(undefined)
      })} />
      <Button label="Importar outra ficha" selected={false} onPress={() => setPanel("import")} />
    </Card>}
    {panel === "history" && <Card>
      <Copy heading label="Evolução" />
      {!!events && history.size === 0 && <Copy muted label="Seu progresso aparecerá aqui após o primeiro registro." />}
      {[...history].map(([key, entry]) => <Copy key={key} label={
        entry.name + " · " + new Date(entry.day + "T12:00:00").toLocaleDateString("pt-BR") +
        " · " + entry.done + "/" + entry.total + " concluídos"
      } />)}
    </Card>}
    {panel === "import" && <Card>
      <Copy heading label={draft ? "Revisar ficha" : "Importar ficha"} />
      {draft ? <>
        <Field label="Nome do treino" value={draft.name} maxLength={160} onChangeText={name => setDraft({ ...draft, name })} />
        {draft.exercises.map(exercise => <Card key={exercise.id}>
          <Field label="Exercício" value={exercise.name} maxLength={160} onChangeText={name => changeExercise(exercise.id, { name })} />
          {fields.map((label, index) => <Field key={label} label={label} value={exercise.details[index] ?? ""} maxLength={80}
            onChangeText={value => changeExercise(exercise.id, { details: fields.map((_, i) => i === index ? value : exercise.details[i] ?? "") })} />)}
          {draft.exercises.length > 1 && <Button label="Remover da ficha" selected={false}
            onPress={() => setDraft({ ...draft, exercises: draft.exercises.filter(item => item.id !== exercise.id) })} />}
        </Card>)}
        <Row>
          <Button label="Adicionar exercício" selected={false} disabled={draft.exercises.length >= 30}
            onPress={() => setDraft({ ...draft, exercises: [...draft.exercises, emptyExercise()] })} />
          <Button label="Salvar ficha" disabled={action.busy || !draft.name.trim() || draft.exercises.some(item => !item.name.trim())}
            onPress={() => void action.run(async () => {
              const saved = { ...draft, name: draft.name.trim(), exercises: draft.exercises.map(item => ({ ...item, name: item.name.trim() })) }
              await prefs.save("physical_workouts", { active: saved.id, workouts: [...workouts, saved] })
              setDraft(undefined)
              setSource("")
              setExpanded(undefined)
              setPanel(undefined)
            })} />
          <Button label="Voltar à importação" selected={false} disabled={action.busy} onPress={() => setDraft(undefined)} />
        </Row>
      </> : <>
        <Row>
          <Button label="Escolher PDF" icon="record" selected={false} disabled={action.busy} onPress={choosePdf} />
          <Button label="Abrir Scanner" icon="scan" selected={false} onPress={scanner} />
          {!!scans.length && <Button label="Usar registro do Scanner" selected={showScans} onPress={() => setShowScans(!showScans)} />}
        </Row>
        {showScans && scans.map(event => <Button key={event.id} label={String(event.payload.title ?? "Ficha digitalizada")}
          selected={false} onPress={() => reviewText(String(event.payload.details), String(event.payload.title ?? "").slice(0, 160))} />)}
        <Copy muted label="Cole até 30 exercícios, um por linha. Se quiser incluir detalhes, separe nome, séries, repetições, carga e descanso com barras verticais (|)." />
        <Field label="Texto da ficha" value={source} onChangeText={setSource} multiline maxLength={12000} />
        <Button label={source.trim() ? "Revisar texto" : "Preencher manualmente"} disabled={action.busy} onPress={() => reviewText(source)} />
      </>}
      <Status {...action} />
    </Card>}
    <View style={styles.heading}>
      <Text accessibilityRole="header" style={[styles.section, { color: color.ink }]}>Exercícios</Text>
      <Button label={all ? "Desmarcar todos" : "Marcar todos"} selected={false} disabled={!events || action.busy}
        onPress={() => saveProgress(all ? [] : workout.exercises.map(item => item.id))} />
    </View>
    {workout.exercises.map(exercise => {
      const open = expanded === exercise.id
      const done = checked.includes(exercise.id)
      const toggleDone = () => saveProgress(done ? checked.filter(id => id !== exercise.id) : [...checked, exercise.id])
      return <View key={exercise.id} style={[styles.card, surface, open && { borderColor: color.accent }]}>
        <View style={styles.exerciseHeader}>
          <Pressable accessibilityRole="checkbox" accessibilityLabel={exercise.name} accessibilityState={{ checked: done, disabled: action.busy || !events }}
            disabled={action.busy || !events} onPress={toggleDone} style={styles.checkTarget}>
            <View style={[styles.check, { borderColor: done ? color.lime : color.muted, backgroundColor: done ? color.lime : "transparent" }]}>
              {done && <Icon name="check" color={tones.onAction} size={17} />}
            </View>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setExpanded(open ? undefined : exercise.id)}
            style={[styles.exerciseHeader, styles.flex]}>
            <Text style={[styles.exerciseName, styles.flex, { color: color.ink }]}>{exercise.name}</Text>
            <Text style={{ color: color.ink, fontSize: 20 }}>{open ? "⌃" : "⌄"}</Text>
          </Pressable>
        </View>
        {open && <View style={[styles.details, { borderColor: color.line }]}>
          <View style={styles.metrics}>
            {fields.map((label, i) => <View key={label} style={wide ? styles.flex : styles.half}>
              <Text style={[styles.metricLabel, { color: color.muted }]}>{label}</Text>
              <Text style={[styles.value, { color: color.ink, borderColor: color.line }]}>{exercise.details[i] || "—"}</Text>
            </View>)}
          </View>
          <Button label={done ? "Desmarcar conclusão" : "Marcar como concluído"} icon="check" selected={false}
            disabled={action.busy || !events} onPress={toggleDone} />
        </View>}
      </View>
    })}
    <Row>
      <Button label="Pedir orientação" icon="message" selected={false} onPress={() => openChat()} />
      <Button label="Relatórios" icon="note" selected={panel === "reports"} onPress={() => toggle("reports")} />
    </Row>
    {panel === "reports" && <AgentReports agent="physical" events={events ?? []} refresh={load} openChat={openChat} />}
    {panel !== "import" && <Status {...action} />}
    {!!action.error && <Button label="Atualizar treino" selected={false} onPress={() => void action.run(load)} />}
  </>
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 15, padding: 10 },
  hero: { padding: 14, gap: 7, overflow: "hidden" },
  art: { position: "absolute", width: "32%", height: 104, right: 5, top: 9, opacity: 0.52 },
  kicker: { fontSize: 11, letterSpacing: 2 },
  title: { fontSize: 33, fontWeight: "900", letterSpacing: -1.4 },
  section: { fontSize: 25, fontWeight: "900", letterSpacing: -0.6 },
  shortcuts: { gap: 7 },
  sideBySide: { flexDirection: "row" },
  shortcut: { minHeight: 76, gap: 3 },
  name: { fontSize: 15, fontWeight: "800" },
  flex: { flex: 1, minWidth: 0 },
  heading: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 8 },
  exerciseHeader: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 44 },
  exerciseName: { fontSize: 18, fontWeight: "900" },
  checkTarget: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  check: { width: 25, height: 25, borderWidth: 1, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  details: { padding: 8, borderWidth: 1, borderRadius: 10, gap: 8 },
  metrics: { flexDirection: "row", flexWrap: "wrap", columnGap: 5, rowGap: 8 },
  half: { width: "47%" },
  metricLabel: { fontSize: 11, marginBottom: 4 },
  value: { textAlign: "center", fontSize: 13, paddingVertical: 6, paddingHorizontal: 2, borderWidth: 1, borderRadius: 8 },
})

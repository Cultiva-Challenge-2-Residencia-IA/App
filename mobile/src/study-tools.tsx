import { useCallback, useEffect, useState } from "react"
import { Alert, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native"
import { useFocusEffect, useRouter } from "expo-router"
import Svg, { Path } from "react-native-svg"
import { agendaAgent, agendaDraft } from "./agenda-suggestions"
import { AgentReports } from "./agent-reports"
import { localDay, put, rows, stepDay, type Event, type Task } from "./backend"
import { Icon, type IconName } from "./icons"
import { Button, Copy, Field, Row, Status, tones, useAction, usePalette } from "./ui"
import { FormScreen } from "./form-screen"

type Panel = "setup" | "subjects" | "reviews" | "cards" | "history" | "reports"
export type FocusSession = { subject: string; start: number; end: number; pausedAt?: number }
const dateLabel = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" })

function topicOf(event: Event) {
  return typeof event.payload.topic === "string" ? event.payload.topic.trim() : ""
}

export function StudyTools({ openChat, session, setSession }: {
  openChat: (message?: string) => void
  session?: FocusSession
  setSession: (session?: FocusSession) => void
}) {
  const palette = usePalette()
  const router = useRouter()
  const { width, fontScale } = useWindowDimensions()
  const wide = width >= 350 && fontScale <= 1.25
  const action = useAction()
  const [data, setData] = useState<{ events: Event[]; tasks: Task[] }>()
  const [panel, setPanel] = useState<Panel>()
  const [subject, setSubject] = useState("")
  const [newSubject, setNewSubject] = useState("")
  const [topic, setTopic] = useState("")
  const [question, setQuestion] = useState("")
  const [answer, setAnswer] = useState("")
  const [reveal, setReveal] = useState(false)
  const [index, setIndex] = useState(0)
  const [minutes, setMinutes] = useState(25)
  const [now, setNow] = useState(Date.now)
  const today = localDay()
  const events = data?.events ?? []
  const cards = events.filter(event => event.type === "flashcard.created")
  const history = events.filter(event => event.type === "study.focus.completed")
  const reviews = new Map<string, Event>()
  for (const event of events) {
    if (event.type === "flashcard.reviewed" && typeof event.payload.cardId === "string" && !reviews.has(event.payload.cardId)) {
      reviews.set(event.payload.cardId, event)
    }
  }
  const due = cards.filter(card => {
    const review = reviews.get(card.id)
    return !review || stepDay(localDay(new Date(review.created_at)), review.payload.known === true ? 3 : 1) <= today
  })
  const subjects = [...new Set(events.filter(event => ["study.subject.created", "flashcard.created", "study.focus.completed"].includes(event.type))
    .map(topicOf).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR"))
  const scoped = (panel === "reviews" ? due : cards).filter(card => !subject || topicOf(card) === subject)
  const current = scoped[index % Math.max(1, scoped.length)]
  const upcoming = data?.tasks.filter(task => !task.done && task.due_date >= today && agendaAgent(task.category) === "study")
    .sort((a, b) => (a.due_date + (a.due_time ?? "99")).localeCompare(b.due_date + (b.due_time ?? "99"))).slice(0, 4)
  const elapsed = session ? Math.min(Math.max(0, now - session.start), session.end - session.start) : 0
  const seconds = session ? Math.max(0, Math.ceil((session.end - now) / 1000)) : 0
  const surface = { backgroundColor: palette.surface, borderColor: palette.line }

  const load = useCallback(async () => {
    const [events, tasks] = await Promise.all([rows<Event>("events"), rows<Task>("tasks")])
    setData({ events, tasks })
  }, [])
  useFocusEffect(useCallback(() => { void action.run(load) }, [load]))

  useEffect(() => {
    if (!session || session.pausedAt !== undefined) return
    const interval = setInterval(() => {
      const time = Date.now()
      setNow(time)
      if (time >= session.end) clearInterval(interval)
    }, 250)
    return () => clearInterval(interval)
  }, [session])

  function show(next: Panel, target = "") {
    setPanel(next)
    setSubject(target)
    setIndex(0)
    setReveal(false)
  }

  function schedule(label: string) {
    setPanel(undefined)
    router.navigate({ pathname: "/agenda", params: { draft: JSON.stringify({ ...agendaDraft("study"), label }) } })
  }

  function pauseOrResume() {
    if (!session) return
    const time = Date.now()
    setNow(time)
    if (session.pausedAt === undefined) {
      setSession({ ...session, pausedAt: time })
    } else {
      const duration = time - session.pausedAt
      setSession({ subject: session.subject, start: session.start + duration, end: session.end + duration })
    }
  }

  function closePanel() {
    if (!action.busy) setPanel(undefined)
  }

  function tile(title: string, caption: string, icon: IconName, press: () => void, fill = false, trailing?: React.ReactNode) {
    return <Pressable accessibilityRole="button" onPress={press}
      style={({ pressed }) => [styles.card, styles.tile, surface, fill && styles.flex, { opacity: pressed ? 0.7 : 1 }]}>
      <View style={[styles.icon, { backgroundColor: palette.lime }]}><Icon name={icon} size={18} color={tones.onAction} /></View>
      <View style={styles.flex}>
        <Text style={[styles.name, { color: palette.ink }]}>{title}</Text>
        <Text style={[styles.meta, { color: palette.muted }]}>{caption}</Text>
      </View>
      {trailing}
      <Text style={[styles.arrow, { color: palette.ink }]}>›</Text>
    </Pressable>
  }

  return <>
    <View style={[styles.card, styles.hero, surface]}>
      {wide && <View pointerEvents="none" style={styles.art}>
        <Svg viewBox="0 0 130 110" width="100%" height="100%" accessible={false}>
          <Path d="M14 36L123 52L114 82L4 63Z" stroke={palette.accent} fill="none" />
          <Path d="M40 8H105C103 32 91 44 79 52C73 56 73 60 79 65C92 73 103 85 105 102H40C42 85 53 73 66 65C72 60 72 56 66 52C54 44 42 32 40 8Z"
            fill={palette.surface} stroke={palette.accent} strokeWidth={2} />
          <Path d="M52 33H94Q89 44 74 54V83Q87 84 98 98H48Q58 84 72 83V54Q58 44 52 33Z" fill={palette.accent} />
        </Svg>
      </View>}
      <View style={[styles.heroCopy, wide && styles.heroNarrow]}>
        <Text style={[styles.kicker, { color: palette.muted }]}>FOCO AGORA</Text>
        <Text accessibilityRole="header" style={[styles.title, { color: palette.ink }]}>Sessão de estudo</Text>
        <Copy muted label={session ? session.subject : "Defina o tempo, a matéria e comece."} />
        {session && <Text style={[styles.clock, { color: palette.ink }]}>
          {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
        </Text>}
      </View>
      <Row>
        {session ? <>
          {seconds > 0 && <Button label={session.pausedAt === undefined ? "Pausar" : "Retomar"} onPress={pauseOrResume} />}
          <Button label={seconds ? "Salvar e encerrar" : "Salvar sessão"} disabled={action.busy || elapsed < 1000}
            selected={seconds > 0 ? false : undefined}
            onPress={() => void action.run(async () => {
              await put("events", { type: "study.focus.completed", payload: {
                topic: session.subject, seconds: Math.floor(elapsed / 1000),
              } })
              setSession(undefined)
              show("history")
              await load()
            })} />
          <Button label="Descartar sessão" selected={false} disabled={action.busy} onPress={() =>
            Alert.alert("Descartar sessão?", "O tempo desta sessão será perdido.", [
              { text: "Cancelar", style: "cancel" },
              { text: "Descartar", style: "destructive", onPress: () => setSession(undefined) },
            ])} />
        </> : <Button label="Iniciar foco" variant="highlight" onPress={() => show("setup")} />}
      </Row>
    </View>
    {panel === "setup" && <FormScreen title="Preparar sessão de foco" close={closePanel}>
      <Field label="Matéria" value={subject} maxLength={120} onChangeText={setSubject} />
      {!!subjects.length && <Row>{subjects.map(name => <Button key={name} label={name} selected={subject === name} onPress={() => setSubject(name)} />)}</Row>}
      <Row>{[15, 25, 45, 60].map(time => <Button key={time} label={time + " min"} selected={time === minutes} onPress={() => setMinutes(time)} />)}</Row>
      <Row>
        <Button label="Começar" disabled={!subject.trim()} onPress={() => {
          const start = Date.now()
          setNow(start)
          setSession({ start, end: start + minutes * 60000, subject: subject.trim() })
          setPanel(undefined)
        }} />
        <Button label="Cancelar" selected={false} onPress={() => setPanel(undefined)} />
      </Row>
    </FormScreen>}
    <View style={[styles.group, wide && styles.columns]}>
      {tile("Planejamento semanal", "Organize sua rotina de estudos.", "calendar", () => schedule("Sessão de estudo"), wide)}
      {tile("Revisões", data ? due.length + " para revisar" : "Acompanhe e planeje revisões.", "book", () => show("reviews"), wide)}
    </View>
    <View style={styles.heading}>
      <Text accessibilityRole="header" style={[styles.section, { color: palette.ink }]}>Minhas matérias</Text>
      <Button label="Nova matéria" icon="plus" selected={panel === "subjects"} onPress={() => panel === "subjects" ? setPanel(undefined) : show("subjects")} />
    </View>
    {panel === "subjects" && <FormScreen title="Nova matéria" close={closePanel} busy={action.busy}>
      <Field label="Nome da matéria" value={newSubject} onChangeText={setNewSubject} maxLength={120} />
      <Button label="Salvar matéria" disabled={action.busy || !data || !newSubject.trim() ||
        subjects.some(name => name.toLocaleLowerCase() === newSubject.trim().toLocaleLowerCase())}
        onPress={() => void action.run(async () => {
          await put("events", { type: "study.subject.created", payload: { topic: newSubject.trim() } })
          setNewSubject("")
          setPanel(undefined)
          await load()
        })} />
      <Status {...action} />
    </FormScreen>}
    {!!data && subjects.length === 0 && <Copy muted label="Adicione uma matéria para organizar estudos e revisões." />}
    {subjects.map(name => {
      const total = cards.filter(card => topicOf(card) === name).length
      const pending = due.filter(card => topicOf(card) === name).length
      const segments = Math.round(5 * (total - pending) / Math.max(total, 1))
      return <View key={name}>{tile(name, pending + (pending === 1 ? " revisão pendente" : " revisões pendentes"), "record",
        () => show("reviews", name), false, wide && total > 0 && <View style={styles.segments} accessible={false}>
          {Array.from({ length: 5 }, (_, i) => <View key={i} style={[styles.segment, { backgroundColor: i < segments ? palette.lime : palette.line }]} />)}
        </View>)}</View>
    })}
    <View style={[styles.group, wide && styles.columns]}>
      {tile("Flashcards", "Crie cartões e revise.", "note", () => show("cards"), wide)}
      {tile("Histórico de estudo", "Veja seu tempo de foco.", "activity", () => show("history"), wide)}
    </View>
    {(panel === "reviews" || panel === "cards" || panel === "history") && <FormScreen
      title={panel === "history" ? "Histórico de estudo" : panel === "cards" ? "Flashcards" : "Revisões" + (subject ? " · " + subject : "")}
      close={closePanel} busy={action.busy}>
      {panel === "history" ? <>
        {!!data && !history.length && <Copy muted label="Salve uma sessão de foco para começar seu histórico." />}
        {history.map(item => {
          const totalSeconds = typeof item.payload.seconds === "number" ? item.payload.seconds : 0
          return <Copy key={item.id} label={topicOf(item) + " · " + dateLabel.format(new Date(item.created_at)) + " · " +
            Math.floor(totalSeconds / 60) + " min " + totalSeconds % 60 + " s"} />
        })}
      </> : <>
        {panel === "reviews" && <Row>
          <Button label="Agendar revisão" icon="calendar" selected={false} onPress={() => schedule(subject ? "Revisar " + subject : "Revisão de estudos")} />
          {!!subject && <Button label="Criar flashcard" selected={false} onPress={() => { setTopic(subject); show("cards", subject) }} />}
        </Row>}
        {!!data && !current && <Copy muted label={panel === "reviews" ? "Nenhum cartão pendente." : "Crie um cartão para começar."} />}
        {current && <>
          <Copy muted label={topicOf(current)} />
          <Copy heading label={String(current.payload.question)} />
          {reveal ? <>
            <Copy label={String(current.payload.answer)} />
            <Row>{[false, true].map(known => <Button key={String(known)} label={known ? "Já sei" : "Revisar depois"} disabled={action.busy}
              onPress={() => void action.run(async () => {
                await put("events", { type: "flashcard.reviewed", payload: { cardId: current.id, topic: topicOf(current), known } })
                setReveal(false)
                if (panel === "cards") setIndex(index + 1)
                await load()
              })} />)}</Row>
          </> : <Row>
            <Button label="Ver resposta" onPress={() => setReveal(true)} />
            {scoped.length > 1 && <Button label="Próximo cartão" selected={false} onPress={() => setIndex(index + 1)} />}
          </Row>}
        </>}
        {panel === "cards" && <>
          <Copy heading label="Novo cartão" />
          <Field label="Matéria" value={topic} onChangeText={setTopic} maxLength={120} />
          <Field label="Pergunta" value={question} onChangeText={setQuestion} maxLength={500} />
          <Field label="Resposta" value={answer} onChangeText={setAnswer} maxLength={1200} multiline />
          <Button label="Criar cartão" disabled={action.busy || !topic.trim() || !question.trim() || !answer.trim()}
            onPress={() => void action.run(async () => {
              await put("events", { type: "flashcard.created", payload: { topic: topic.trim(), question: question.trim(), answer: answer.trim() } })
              setQuestion("")
              setAnswer("")
              setReveal(false)
              setIndex(0)
              await load()
            })} />
        </>}
      </>}
      <Status {...action} />
    </FormScreen>}
    <View style={styles.heading}>
      <Text accessibilityRole="header" style={[styles.section, { color: palette.ink }]}>Próximos estudos</Text>
      <Button label="Ver agenda" selected={false} onPress={() => router.navigate("/agenda")} />
    </View>
    {upcoming?.length === 0 && tile("Agenda de estudos", "Nenhuma sessão agendada.", "calendar", () => schedule("Sessão de estudo"))}
    {upcoming?.map(task => <View key={task.id}>{tile(task.label,
      (task.due_date === today ? "Hoje" : dateLabel.format(new Date(task.due_date + "T12:00:00"))) +
      (task.due_time ? " · " + task.due_time.slice(0, 5) : ""), "calendar", () => router.navigate("/agenda"))}</View>)}
    <Row>
      <Button label="Relatórios" icon="note" selected={panel === "reports"} onPress={() => panel === "reports" ? setPanel(undefined) : show("reports")} />
      <Button label="Conversar com o agente" icon="message" selected={false} onPress={() => openChat()} />
    </Row>
    {panel === "reports" && <FormScreen title="Relatórios de estudos" close={closePanel}>
      <AgentReports agent="study" events={events} refresh={load} openChat={message => { closePanel(); openChat(message) }}
      makeCard={(reportTopic, excerpt) => {
        setTopic(reportTopic)
        setQuestion("")
        setAnswer(excerpt)
        show("cards")
      }} />
    </FormScreen>}
    {!panel && <Status {...action} />}
    {!panel && !!action.error && <Button label="Atualizar estudos" selected={false} onPress={() => void action.run(load)} />}
  </>
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 15, padding: 11 },
  hero: { padding: 15, overflow: "hidden", gap: 9 },
  heroCopy: { gap: 4 },
  heroNarrow: { width: "71%" },
  art: { position: "absolute", right: 5, bottom: 5, width: "32%", height: 104 },
  kicker: { fontSize: 11, fontWeight: "700", letterSpacing: 1.7 },
  title: { fontSize: 29, fontWeight: "900", letterSpacing: -0.9 },
  clock: { fontSize: 32, fontWeight: "900", fontVariant: ["tabular-nums"] },
  group: { gap: 7 },
  columns: { flexDirection: "row" },
  flex: { flex: 1, minWidth: 0 },
  tile: { gap: 7, flexDirection: "row", alignItems: "center", minHeight: 60 },
  icon: { width: 30, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  name: { fontSize: 15, fontWeight: "900" },
  meta: { fontSize: 13, marginTop: 2 },
  arrow: { fontSize: 21 },
  heading: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 6 },
  section: { fontSize: 23, fontWeight: "900", letterSpacing: -0.5 },
  segments: { flexDirection: "row", gap: 3 },
  segment: { width: 9, height: 7, borderRadius: 3 },
})

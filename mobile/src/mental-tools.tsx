import { useCallback, useEffect, useState } from "react"
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native"
import { useFocusEffect, useRouter } from "expo-router"
import { randomUUID } from "expo-crypto"
import Svg, { Ellipse, Path } from "react-native-svg"
import { AgentReports } from "./agent-reports"
import { rows, type CheckIn, type Event } from "./backend"
import { Icon, type IconName } from "./icons"
import { useMotionReduced } from "./motion"
import { usePreferences } from "./preferences"
import { Button, Card, Copy, Field, Row, Status, tones, useAction, usePalette } from "./ui"

const tools = [
  { key: "journal", title: "Diário emocional", text: "Escreva sobre o que você está sentindo.", icon: "book" },
  { key: "mood", title: "Registro de humor", text: "Acompanhe seus check-ins ao longo do tempo.", icon: "activity" },
  { key: "breathing", title: "Exercícios de respiração", text: "Faça uma pausa e respire no seu ritmo.", icon: "spark" },
  { key: "therapy", title: "Sessão de terapia", text: "Organize tópicos para levar à sessão.", icon: "calendar" },
  { key: "private", title: "Anotações privadas", text: "Guarde um rascunho pessoal na sua conta.", icon: "note" },
  { key: "guided", title: "Pausa guiada", text: "Respiração · 3 min", icon: "check" },
  { key: "relax", title: "Relaxamento", text: "Pausa silenciosa · 2 min", icon: "leaf" },
  { key: "privacy", title: "Privacidade e segurança", text: "Consulte seus controles de dados e recursos de apoio.", icon: "record" },
] as const satisfies readonly { key: string; title: string; text: string; icon: IconName }[]

const duration = { breathing: 30, guided: 180, relax: 120 }
type Tool = typeof tools[number]
type Entry = { id: string; text: string; at: string }
const timestamp = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" })

export function MentalTools({ openChat }: { openChat: (message?: string) => void }) {
  const reduced = useMotionReduced()
  const color = usePalette()
  const router = useRouter()
  const { width, fontScale } = useWindowDimensions()
  const prefs = usePreferences()
  const loading = useAction()
  const moodAction = useAction()
  const action = useAction()
  const [events, setEvents] = useState<Event[]>([])
  const [checkIns, setCheckIns] = useState<CheckIn[]>()
  const [panel, setPanel] = useState<Tool>()
  const [reports, setReports] = useState(false)
  const [draft, setDraft] = useState("")
  const [deadline, setDeadline] = useState<number>()
  const [remaining, setRemaining] = useState(0)
  const [finished, setFinished] = useState(false)
  const [saved, setSaved] = useState(false)
  const journal = Array.isArray(prefs.values.mental_journal) ? prefs.values.mental_journal as Entry[] : []
  const moods = checkIns?.filter(item => Number.isInteger(item.mood) && item.mood >= 1 && item.mood <= 5)
  const timerKey = panel?.key === "breathing" || panel?.key === "guided" || panel?.key === "relax" ? panel.key : undefined
  const surface = { backgroundColor: color.surface, borderColor: color.line }
  const wide = width >= 345 && fontScale <= 1.3

  const loadReports = useCallback(async () => setEvents(await rows<Event>("events")), [])
  const loadMood = useCallback(async () => setCheckIns(await rows<CheckIn>("checkins")), [])
  useFocusEffect(useCallback(() => {
    void loading.run(loadReports)
  }, [loadReports]))

  useEffect(() => {
    if (!deadline) return
    const tick = () => {
      const seconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
      setRemaining(seconds)
      if (seconds === 0) {
        setDeadline(undefined)
        setFinished(true)
      }
    }
    const interval = setInterval(tick, 250)
    return () => clearInterval(interval)
  }, [deadline])

  function open(tool: Tool) {
    if (tool.key === "privacy") {
      router.navigate("/profile")
      return
    }
    const text = tool.key === "private" ? prefs.values.private_note : tool.key === "therapy" ? prefs.values.mental_therapy : ""
    setDraft(typeof text === "string" ? text : "")
    setSaved(false)
    setFinished(false)
    setPanel(tool)
    if (tool.key === "mood") void moodAction.run(loadMood)
  }

  function close() {
    if (action.busy) return
    setPanel(undefined)
    setDeadline(undefined)
    setRemaining(0)
  }

  function toolCard(tool: Tool, horizontal = false, fill = false) {
    return <Pressable key={tool.key} accessibilityRole="button" onPress={() => open(tool)}
      style={({ pressed }) => [styles.card, surface, horizontal && styles.inline, fill && styles.flex, { opacity: pressed ? 0.7 : 1 }]}>
      <View style={[styles.tile, { backgroundColor: color.lime }]}>
        <Icon name={tool.icon} color={tones.onAction} size={21} />
      </View>
      <View style={horizontal ? styles.flex : undefined}>
        <Text style={[styles.cardTitle, { color: color.ink }]}>{tool.title}</Text>
        <Text style={[styles.caption, { color: color.muted }]}>{tool.text}</Text>
      </View>
      {horizontal && <Text style={[styles.arrow, { color: color.ink }]}>›</Text>}
    </Pressable>
  }

  return <>
    <View style={[styles.card, styles.hero, surface]}>
      {wide && <View pointerEvents="none" style={styles.art}>
        <Svg width="100%" height="100%" viewBox="0 0 150 115" accessible={false}>
          <Ellipse cx="66" cy="28" rx="30" ry="13" rotation="-15" origin="66,28" fill="none" stroke={color.accent} strokeWidth={1.5} />
          <Ellipse cx="63" cy="58" rx="43" ry="15" rotation="-15" origin="63,58" fill={color.accent} />
          <Ellipse cx="76" cy="83" rx="68" ry="20" rotation="-15" origin="76,83" fill="none" stroke={color.accent} strokeWidth={1.5} />
          <Path d="M125 10Q127 24 140 26Q127 28 125 42Q123 28 110 26Q123 24 125 10Z" fill={color.accent} />
        </Svg>
      </View>}
      <View style={[styles.heroText, wide && styles.heroTextNarrow]}>
        <Text style={[styles.kicker, { color: color.muted }]}>BEM-ESTAR EM FOCO</Text>
        <Text accessibilityRole="header" style={[styles.title, { color: color.ink }]}>Cuide da sua mente no seu ritmo.</Text>
        <Copy muted label="Registre, reflita, respire e se prepare." />
      </View>
    </View>
    {[tools.slice(0, 2), tools.slice(2, 4)].map((pair, index) =>
      <View key={index} style={[styles.group, wide && styles.columns]}>
        {pair.map(tool => toolCard(tool, false, wide))}
      </View>)}
    {toolCard(tools[4], true)}
    <Text accessibilityRole="header" style={[styles.section, { color: color.ink }]}>Acesso rápido</Text>
    <View style={[styles.group, wide && styles.columns]}>
      {toolCard(tools[5], true, wide)}
      {toolCard(tools[6], true, wide)}
    </View>
    {toolCard(tools[7], true)}
    <Row>
      <Button label="Relatórios" icon="note" selected={reports} onPress={() => setReports(!reports)} />
      <Button label="Conversar com o agente" icon="message" selected={false} onPress={() => openChat()} />
    </Row>
    {reports && <AgentReports agent="mental" events={events} refresh={loadReports} openChat={openChat} />}
    <Status {...loading} />
    {!!loading.error && <Button label="Atualizar ferramentas" selected={false} onPress={() => void loading.run(loadReports)} />}

    {!!panel && <Modal transparent animationType={reduced ? "none" : "slide"} visible onRequestClose={close}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View accessibilityViewIsModal style={[styles.sheet, { backgroundColor: color.paper, borderColor: color.line }]}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.sheetContent}>
            <View style={styles.sheetHeader}>
              <Text accessibilityRole="header" style={[styles.section, styles.flex, { color: color.ink }]}>{panel.title}</Text>
              <Button label="Fechar" selected={false} disabled={action.busy} onPress={close} />
            </View>
            {timerKey && <>
              <Copy label={timerKey === "relax" ? "Encontre uma posição confortável e descanse por alguns instantes." :
                "Respire com calma, num ritmo confortável para você."} />
              <Text style={[styles.clock, { color: color.ink }]}>
                {Math.floor((deadline || finished ? remaining : duration[timerKey]) / 60)}:
                {String((deadline || finished ? remaining : duration[timerKey]) % 60).padStart(2, "0")}
              </Text>
              {!!deadline && timerKey === "guided" && <Copy heading label={(duration.guided - remaining) % 8 < 4 ? "Inspire suavemente" : "Expire suavemente"} />}
              {finished && <Copy label="Pausa concluída." />}
              <Button label={deadline ? "Encerrar pausa" : "Iniciar pausa"} onPress={() => {
                setFinished(false)
                if (deadline) {
                  setDeadline(undefined)
                  return
                }
                setRemaining(duration[timerKey])
                setDeadline(Date.now() + duration[timerKey] * 1000)
              }} />
            </>}
            {panel.key === "mood" && <>
              <Copy label="Humor registrado nos seus check-ins, em uma escala de 1 a 5." />
              <Button label="Abrir check-in em Hoje" onPress={() => { close(); router.navigate("/today") }} />
              {moods?.length === 0 && <Copy muted label="Seus registros aparecerão aqui após o primeiro check-in." />}
              {moods?.slice(0, 14).map(item => <View key={item.id} style={[styles.mood, { borderColor: color.line }]}>
                <Text style={{ color: color.ink }}>{timestamp.format(new Date(item.created_at))}</Text>
                <Text style={[styles.cardTitle, { color: color.ink }]}>{item.mood}/5</Text>
              </View>)}
              <Status {...moodAction} />
              {!!moodAction.error && <Button label="Atualizar humor" selected={false} onPress={() => void moodAction.run(loadMood)} />}
            </>}
            {(panel.key === "journal" || panel.key === "therapy" || panel.key === "private") && <>
              <Field label={panel.key === "journal" ? "Como você está se sentindo?" :
                panel.key === "therapy" ? "Pensamentos, metas e tópicos para a sessão" : "Anotação privada"}
                value={draft} multiline maxLength={4000} onChangeText={text => { setDraft(text); setSaved(false) }} />
              <Button label="Salvar" icon="check" disabled={action.busy || (panel.key === "journal" && !draft.trim())}
                onPress={() => void action.run(async () => {
                  if (panel.key === "journal") {
                    await prefs.save("mental_journal", [{ id: randomUUID(), text: draft.trim(), at: new Date().toISOString() }, ...journal])
                    setDraft("")
                  } else {
                    await prefs.save(panel.key === "therapy" ? "mental_therapy" : "private_note", draft.trim())
                  }
                  setSaved(true)
                })} />
              {saved && <Copy muted label="Salvo." />}
              {panel.key === "journal" && journal.map(entry => <Card key={entry.id}>
                <Copy muted label={timestamp.format(new Date(entry.at))} />
                <Copy label={entry.text} />
              </Card>)}
              <Status {...action} />
            </>}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>}
  </>
}

const styles = StyleSheet.create({
  card: { padding: 11, gap: 6, borderRadius: 15, borderWidth: 1 },
  hero: { padding: 15, overflow: "hidden" },
  heroText: { gap: 5 },
  heroTextNarrow: { maxWidth: "70%" },
  art: { position: "absolute", right: 4, bottom: 4, width: "31%", height: 102 },
  kicker: { fontSize: 11, letterSpacing: 1.1, fontWeight: "700" },
  title: { fontSize: 28, fontWeight: "900", letterSpacing: -0.85 },
  group: { gap: 8 },
  columns: { flexDirection: "row" },
  flex: { flex: 1, minWidth: 0 },
  inline: { flexDirection: "row", alignItems: "center", gap: 7 },
  tile: { width: 34, height: 34, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  caption: { fontSize: 13, marginTop: 2 },
  cardTitle: { fontSize: 15, fontWeight: "900", letterSpacing: -0.2 },
  section: { fontSize: 23, fontWeight: "900", letterSpacing: -0.5 },
  arrow: { fontSize: 21 },
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "#0008" },
  sheet: { maxHeight: "87%", borderWidth: 1, borderTopLeftRadius: 22, borderTopRightRadius: 22 },
  sheetContent: { padding: 16, paddingBottom: 36, gap: 10 },
  sheetHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  clock: { fontSize: 42, fontWeight: "900", textAlign: "center", fontVariant: ["tabular-nums"] },
  mood: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 8 },
})

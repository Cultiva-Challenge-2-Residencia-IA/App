import { useRef, useState, type ComponentRef } from "react"
import { ActivityIndicator, FlatList, Keyboard, Platform, Pressable, Share, StyleSheet, Text, TextInput, View } from "react-native"
import { MotionPressable } from "./motion"
import Svg, { Defs, Path, Pattern, Rect } from "react-native-svg"
import { AgentMenu, type MenuAction } from "./agent-workspace"
import { agents, localDay, type Agent, type Message } from "./backend"
import { Icon, type IconName } from "./icons"
import { useAccount } from "./session"
import { AgentMonogram } from "./today-art"
import { Button, Status, tones, usePalette } from "./ui"
import { agendaSuggestion, type TaskDraft } from "./agenda-suggestions"
import { ChatMarkdown } from "./chat-markdown"

type Suggestion = { label: string; icon: IconName; prompt: string }
const prompts: Record<Agent, Suggestion[]> = {
  nutrition: [
    { label: "Planejar refeições", icon: "calendar", prompt: "Pode me ajudar a planejar refeições para a semana?" },
    { label: "Lista de compras", icon: "note", prompt: "Me ajude a montar uma lista de compras." },
    { label: "Organizar hidratação", icon: "water", prompt: "Como posso lembrar de registrar minha água ao longo do dia?" },
  ],
  physical: [
    { label: "Organizar rotina", icon: "calendar", prompt: "Quero organizar minha rotina de movimento nesta semana." },
    { label: "Preparar sessão", icon: "note", prompt: "Me ajude a organizar perguntas para minha próxima sessão." },
    { label: "Registrar atividade", icon: "activity", prompt: "Quero registrar uma atividade que fiz hoje." },
  ],
  mental: [
    { label: "Fazer uma pausa", icon: "heart", prompt: "Pode me acompanhar em uma breve pausa para refletir?" },
    { label: "Organizar pensamentos", icon: "note", prompt: "Quero organizar o que estou pensando hoje." },
    { label: "Preparar conversa", icon: "message", prompt: "Me ajude a reunir pontos que quero levar para uma conversa." },
  ],
  study: [
    { label: "Planejar semana", icon: "calendar", prompt: "Me ajude a planejar minha semana de estudos." },
    { label: "Definir metas", icon: "check", prompt: "Quero definir metas realistas de estudo." },
    { label: "Revisar conteúdo", icon: "book", prompt: "Me ajude a revisar um conteúdo." },
    { label: "Tirar dúvida", icon: "message", prompt: "Tenho uma dúvida sobre um conteúdo que estou estudando." },
  ],
}

const intro: Record<Agent, string> = {
  nutrition: "Posso ajudar você a organizar refeições, compras e registros de hidratação.",
  physical: "Podemos organizar sua rotina de movimento ou preparar perguntas para sua próxima sessão.",
  mental: "Este é um espaço para fazer uma pausa, refletir e organizar pontos para conversar.",
  study: "Posso ajudar você a planejar, revisar conteúdos e organizar sua rotina de estudos.",
}

const dateLabel = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", year: "numeric" })
const timeLabel = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" })

function Avatar({ agent }: { agent: Agent }) {
  const colors = usePalette()
  return (
    <View style={[styles.avatar, { backgroundColor: colors.lime }]} importantForAccessibility="no-hide-descendants">
      <AgentMonogram agent={agent} ink={tones.onAction} />
    </View>
  )
}

function ChatGrid() {
  const colors = usePalette()
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" importantForAccessibility="no-hide-descendants">
      <Svg width="100%" height="100%" accessible={false}>
        <Defs>
          <Pattern id="chat-grid" width={26} height={26} patternUnits="userSpaceOnUse">
            <Path d="M0 26V0H26" stroke={colors.lime} strokeOpacity={0.09} fill="none" />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#chat-grid)" />
      </Svg>
    </View>
  )
}

export function AgentChatView({ agent, messages, draft, changeDraft, busy, error, send, retry, refresh, openAgenda, actions, saveNote }: {
  saveNote: (message: Message, text: string) => void
  agent: Agent
  messages?: Message[]
  draft: string
  changeDraft: (text: string) => void
  busy: boolean
  error: string
  send: () => void
  retry: () => void
  refresh: () => void
  openAgenda: (draft: TaskDraft) => void
  actions: MenuAction[]
}) {
  const colors = usePalette()
  const user = useAccount()
  const [menu, setMenu] = useState(false)
  const [selectedMessage, setSelectedMessage] = useState<{ item: Message; text: string }>()
  const [started, setStarted] = useState(false)
  const [composerFocused, setComposerFocused] = useState(false)
  const input = useRef<ComponentRef<typeof TextInput>>(null)
  const history = useRef<FlatList<Message>>(null)
  const pinned = useRef(true)
  const firstName = typeof user.user_metadata.name === "string"
    ? user.user_metadata.name.trim().split(/\s+/)[0]
    : ""
  const last = messages?.at(-1)
  const editing = draft.trim().length > 0
  const canSend = !busy && editing

  function submit() {
    if (!canSend) return
    pinned.current = true
    setStarted(true)
    send()
  }

  function keepEndVisible() {
    if (pinned.current && messages?.length) requestAnimationFrame(() => {
      if (pinned.current) history.current?.scrollToEnd({ animated: false })
    })
  }

  return (
    <View style={styles.chat}>
      <View style={[styles.conversation, { backgroundColor: messages?.length ? colors.paper : colors.hero }]}>
        {!messages?.length && <ChatGrid />}
        <FlatList
          ref={history}
          style={styles.history}
          data={messages}
          keyExtractor={message => message.id}
          contentContainerStyle={styles.historyContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          scrollEventThrottle={32}
          onScroll={({ nativeEvent }) => {
            const { contentSize, contentOffset, layoutMeasurement } = nativeEvent
            pinned.current = contentSize.height - contentOffset.y - layoutMeasurement.height < 90
          }}
          onContentSizeChange={keepEndVisible}
          onLayout={keepEndVisible}
          renderItem={({ item, index }) => {
            const date = new Date(item.created_at)
            const day = localDay(date)
            const previous = messages?.[index - 1]
            const newDay = !previous || localDay(new Date(previous.created_at)) !== day
            const assistant = item.role === "assistant"
            const { text, draft: proposal } = assistant
              ? agendaSuggestion(agent, item.content)
              : { text: item.content, draft: undefined }
            return (
              <View style={styles.messageGroup}>
                {newDay && (
                  <Text style={[styles.date, { color: colors.muted, backgroundColor: colors.surface }]}>{day === localDay() ? "Hoje" : dateLabel.format(date)}</Text>
                )}
                <View style={[styles.messageRow, !assistant && styles.alignRight]}>
                  <View style={[
                    styles.bubble, assistant ? styles.assistant : styles.user,
                    { backgroundColor: assistant ? colors.surface : colors.lime },
                  ]}>
                    {assistant && <Text style={[styles.byline, { color: colors.muted }]}>{agents[agent].title}</Text>}
                    {!!text && (assistant ? <ChatMarkdown text={text} /> :
                      <Text selectable style={[styles.message, { color: tones.onAction }]}>{text}</Text>)}
                    {proposal && <Button label="Revisar lembrete" icon="calendar" selected={false} onPress={() => openAgenda(proposal)} />}
                    <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8, justifyContent: "space-between" }}>
                      <Text style={[styles.timestamp, { color: assistant ? colors.muted : tones.onAction }]}>{timeLabel.format(date)}</Text>
                      {!!text && <Pressable accessibilityRole="button" accessibilityLabel="Ações da mensagem"
                        onPress={() => { Keyboard.dismiss(); setSelectedMessage({ item, text }) }} style={styles.messageAction}>
                        <Icon name="settings" size={17} color={assistant ? colors.muted : tones.onAction} />
                      </Pressable>}
                    </View>
                  </View>
                </View>
              </View>
            )
          }}
          ListEmptyComponent={messages && !error ? (
            <View style={styles.welcome}>
              <View style={styles.messageRow}>
                <Avatar agent={agent} />
                <View style={[styles.bubble, styles.assistant, { backgroundColor: colors.surface }]}>
                  <Text accessibilityRole="header" style={[styles.welcomeTitle, { color: colors.ink }]}>
                    {firstName ? `Oi, ${firstName}!` : "Olá!"}
                  </Text>
                  <Text style={[styles.message, { color: colors.ink }]}>{intro[agent]}</Text>
                </View>
              </View>
              {!editing && !started && (
                <View style={styles.suggestions}>
                  {prompts[agent].map(item => (
                    <Pressable key={item.label} accessibilityRole="button" onPress={() => {
                      changeDraft(item.prompt)
                      input.current?.focus()
                    }} style={({ pressed }) => [
                      styles.suggestion, { borderColor: colors.lime, opacity: pressed ? 0.65 : 1 },
                    ]}>
                      <Icon name={item.icon} color={colors.lime} size={17} />
                      <Text style={styles.suggestionLabel}>{item.label}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          ) : undefined}
          ListFooterComponent={(
            <View style={styles.footer}>
              {busy && (
                <View accessibilityLiveRegion="polite" style={styles.loading}>
                  <ActivityIndicator color={messages?.length ? colors.ink : colors.lime} />
                  <Text style={[styles.loadingText, { color: messages?.length ? colors.muted : tones.onCanvas }]}>{messages ? "Aguardando resposta…" : "Carregando conversa…"}</Text>
                </View>
              )}
              {!!error && <Status error={error} />}
              {!busy && last?.role === "user" ? (
                <Button label="Tentar resposta novamente" icon="message" variant="highlight" disabled={busy} onPress={() => {
                  pinned.current = true
                  retry()
                }} />
              ) : !!error && (
                <Button label="Atualizar conversa" variant="highlight" disabled={busy} onPress={refresh} />
              )}
            </View>
          )}
        />
      </View>
      <View style={styles.composer}>
        <Pressable accessibilityRole="button" accessibilityLabel="Mais ações" accessibilityState={{ expanded: menu }}
          onPress={() => { Keyboard.dismiss(); setMenu(true) }}
          style={({ pressed }) => [
            styles.actionButton, { backgroundColor: pressed ? colors.surface : colors.paper, borderColor: colors.line },
          ]}>
          <Icon name="plus" color={colors.ink} size={23} />
        </Pressable>
        <TextInput
          ref={input}
          accessibilityLabel="Mensagem para o agente"
          placeholder="Mensagem para o agente…"
          placeholderTextColor={colors.muted}
          value={draft}
          onChangeText={changeDraft}
          onFocus={() => setComposerFocused(true)}
          onBlur={() => setComposerFocused(false)}
          multiline
          maxLength={4000}
          editable={!busy}
          style={[styles.input, {
            color: colors.ink,
            backgroundColor: colors.surface,
            borderColor: composerFocused ? colors.ink : colors.muted,
          }]}
        />
        <MotionPressable accessibilityRole="button" accessibilityLabel="Enviar mensagem" accessibilityState={{ disabled: !canSend }}
          disabled={!canSend} onPress={submit}
          style={[
            styles.actionButton, { backgroundColor: colors.lime, borderColor: colors.lime },
          ]}>
          <Icon name="send" color={tones.onAction} size={22} />
        </MotionPressable>
      </View>
      <AgentMenu title="Ações da conversa" visible={menu} close={() => setMenu(false)} actions={actions} />
      <AgentMenu title="Ações da mensagem" visible={!!selectedMessage} close={() => setSelectedMessage(undefined)}
        actions={selectedMessage ? [
          { label: "Salvar como nota", icon: "note", run: () => saveNote(selectedMessage.item, selectedMessage.text) },
          ...(Platform.OS === "web" ? [] : [{
            label: "Compartilhar texto", icon: "arrow" as const,
            run: () => { void Share.share({ message: selectedMessage.text }).catch(() => {}) },
          }]),
        ] : []} />
    </View>
  )
}

const styles = StyleSheet.create({
  chat: { flex: 1, minHeight: 0, gap: 8, paddingHorizontal: 10, paddingTop: 7, paddingBottom: 8 },
  conversation: { flex: 1, minHeight: 0, borderRadius: 16, overflow: "hidden" },
  history: { flex: 1 },
  historyContent: { padding: 11, gap: 8 },
  messageGroup: { gap: 8 },
  date: { alignSelf: "center", backgroundColor: "#ffffff25", borderRadius: 7, overflow: "hidden", color: tones.onCanvas, paddingVertical: 4, paddingHorizontal: 9, fontSize: 12, fontWeight: "600" },
  messageRow: { flexDirection: "row", alignItems: "flex-start", gap: 7 },
  alignRight: { justifyContent: "flex-end" },
  avatar: { width: 32, height: 32, borderRadius: 7, alignItems: "center", justifyContent: "center" },
  bubble: { flexShrink: 1, maxWidth: "86%", padding: 11, gap: 5, borderRadius: 13 },
  assistant: { width: "100%", maxWidth: "100%", borderTopLeftRadius: 4 },
  user: { borderTopRightRadius: 4 },
  message: { fontSize: 15, lineHeight: 21 },
  byline: { fontSize: 12, fontWeight: "700" },
  messageAction: { minWidth: 48, minHeight: 48, alignItems: "center", justifyContent: "center" },
  timestamp: { alignSelf: "flex-end", fontSize: 11, marginTop: 1, fontVariant: ["tabular-nums"] },
  welcome: { gap: 12 },
  welcomeTitle: { fontSize: 19, fontWeight: "900", letterSpacing: -0.25 },
  suggestions: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  suggestion: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, minHeight: 44, borderWidth: 1, borderRadius: 20 },
  suggestionLabel: { color: tones.onCanvas, fontSize: 13, fontWeight: "600", flexShrink: 1 },
  footer: { gap: 8 },
  loading: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 },
  loadingText: { color: tones.onCanvas, fontSize: 13 },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: 6 },
  actionButton: { width: 46, height: 46, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  input: { flex: 1, minHeight: 46, maxHeight: 108, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingTop: 11, paddingBottom: 9, fontSize: 16, textAlignVertical: "center" },
})

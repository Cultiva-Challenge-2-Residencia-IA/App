import { useCallback, useEffect, useRef, useState } from "react"
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router"
import { Alert, Image, View } from "react-native"
import * as ImagePicker from "expo-image-picker"
import { AgentDirectory } from "../../src/agent-directory"
import { StudyTools, type FocusSession } from "../../src/study-tools"
import { NutritionTools } from "../../src/nutrition-tools"
import { WorkoutTools } from "../../src/workout-tools"
import { MentalTools } from "../../src/mental-tools"
import { AgentChatView } from "../../src/agent-chat-view"
import { MotionIn } from "../../src/motion"
import { Notebook } from "../../src/notebook"
import { useNotebook } from "../../src/notebook-data"
import { AgentWorkspace, type WorkspaceTab } from "../../src/agent-workspace"
import { File } from "expo-file-system"
import { randomUUID } from "expo-crypto"
import {
  agents,
  client,
  fail,
  localDay,
  put,
  rows,
  type Agent,
  type Event,
  type Message,
} from "../../src/backend"
import { usePreferences } from "../../src/preferences"
import { agendaDraft, type TaskDraft } from "../../src/agenda-suggestions"
import {
  Button,
  Card,
  Copy,
  Field,
  Row,
  Status,
  useAction,
} from "../../src/ui"

function Chat({ agent, draft, setDraft, changeTab }: {
  agent: Agent
  draft: string
  setDraft: (draft: string) => void
  changeTab: (tab: WorkspaceTab) => void
}) {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>()
  const pending = useRef<{ id: string; content: string }>(null)
  const action = useAction()
  const notebook = useNotebook()
  async function load() {
    setMessages(
      (
        await rows<Message>("messages", { column: "agent", value: agent })
      ).reverse(),
    )
  }
  useFocusEffect(
    useCallback(() => {
      void action.run(load)
    }, [agent]),
  )

  async function reply(id: string) {
    const database = client()
    const { data: existing, error: lookupError } = await database.from("messages")
      .select("id").eq("agent", agent).eq("in_reply_to", id).maybeSingle()
    fail(lookupError)
    if (existing) {
      await load()
      return
    }
    const { data, error } = await database.functions.invoke("agent-chat", {
      body: { agent, messageId: id, localDay: localDay() },
    })
    if (error) {
      const response = error.context
      const detail = await response?.json?.().catch(() => undefined)
      if (response?.status === 404 && (detail?.code === "NOT_FOUND" || detail?.message === "Requested function was not found" ||
        response.headers?.get("sb-error-code") === "NOT_FOUND")) {
        throw new Error("O serviço do chat ainda não está publicado no projeto Supabase deste app.")
      }
      const message = detail?.error ?? detail?.message
      if (typeof message === "string" && message.trim()) throw new Error(message)
      if (response?.status === 401) throw new Error("Sua sessão precisa ser renovada. Entre novamente para usar o chat.")
      if (typeof response?.status === "number") throw new Error("O serviço do chat devolveu HTTP " + response.status + ".")
      throw error
    }
    if (!data?.message) throw new Error("O agente devolveu uma resposta vazia.")
    const { error: saveError } = await database.from("messages").upsert({
      agent,
      role: "assistant",
      content: data.message,
      model: data.model,
      in_reply_to: id,
    }, { onConflict: "in_reply_to", ignoreDuplicates: true })
    fail(saveError)
    await load()
  }

  const last = messages?.at(-1)
  function openAgenda(task: TaskDraft) {
    router.navigate({ pathname: "/agenda", params: { draft: JSON.stringify(task) } })
  }
  function send() {
    const content = draft.trim()
    if (!content) return
    void action.run(async () => {
      if (pending.current?.content !== content) pending.current = { id: randomUUID(), content }
      const { id } = pending.current
      const { error } = await client().from("messages").upsert({ id, agent, role: "user", content },
        { onConflict: "id", ignoreDuplicates: true })
      fail(error)
      pending.current = null
      setDraft("")
      await load()
      await reply(id)
    })
  }

  function saveNote(message: Message, text: string) {
    if (!notebook.notes) {
      Alert.alert("Caderno indisponível", notebook.error ?? "Aguarde o carregamento das notas.")
      return
    }
    if (notebook.notes.some(note => note.source_message_id === message.id)) {
      Alert.alert("Mensagem já salva", "A nota está no caderno deste agente.", [
        { text: "Fechar", style: "cancel" },
        { text: "Abrir notas", onPress: () => changeTab("Notas") },
      ])
      return
    }
    Alert.alert("Salvar mensagem como nota?", "Uma cópia do texto ficará no caderno deste agente.", [
      { text: "Cancelar", style: "cancel" },
      { text: "Salvar", onPress: () => void (async () => {
        try {
          const body = text.trim().slice(0, 8000)
          const first = body.split("\n").find(line => line.trim())
          await notebook.save({ agent, title: first?.trim().slice(0, 120) || "Mensagem do chat", body,
            category: "Conversa", source_message_id: message.id })
          Alert.alert("Nota salva", "A mensagem está disponível no caderno e em Registros.", [
            { text: "Continuar no chat", style: "cancel" },
            { text: "Abrir notas", onPress: () => changeTab("Notas") },
          ])
        } catch (error) {
          Alert.alert("Não foi possível salvar", error instanceof Error ? error.message : "Tente novamente.")
        }
      })() },
    ])
  }

  return (
    <AgentChatView
      agent={agent}
      messages={messages}
      draft={draft}
      changeDraft={setDraft}
      busy={action.busy}
      error={action.error}
      send={send}
      retry={() => { if (last?.role === "user") void action.run(() => reply(last.id)) }}
      refresh={() => void action.run(load)}
      openAgenda={openAgenda}
      saveNote={saveNote}
      actions={[
        { label: "Criar lembrete na Agenda", icon: "calendar", run: () => openAgenda(agendaDraft(agent)) },
        { label: "Abrir Scanner", icon: "scan", run: () => changeTab("Scanner") },
        { label: "Usar relatório", icon: "record", run: () => changeTab("Ferramentas") },
        { label: "Consultar notas", icon: "note", run: () => changeTab("Notas") },
      ]}
    />
  )
}

function Scanner({ agent, onUseReport }: { agent: Agent; onUseReport: () => void }) {
  const [photo, setPhoto] = useState<ImagePicker.ImagePickerAsset>()
  const [title, setTitle] = useState("")
  const [details, setDetails] = useState("")
  const [notice, setNotice] = useState<"review" | "saved">()
  const action = useAction()
  function pick(camera: boolean) {
    void action.run(async () => {
      if (
        camera &&
        !(await ImagePicker.requestCameraPermissionsAsync()).granted
      )
        throw new Error("Permita o uso da câmera nos ajustes do dispositivo.")
      const result = camera
        ? await ImagePicker.launchCameraAsync({ quality: 0.8 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"] })
      if (!result.canceled) {
        setPhoto(result.assets[0])
        setNotice(undefined)
      }
    })
  }
  return (
    <Card>
      <Copy heading label="Digitalize ou envie uma imagem" />
      <Copy label="Revise a foto e escreva as informações que deseja registrar." />
      <Row>
        <Button
          label="Câmera"
          disabled={action.busy}
          onPress={() => pick(true)}
        />
        <Button
          label="Galeria"
          disabled={action.busy}
          onPress={() => pick(false)}
        />
      </Row>
      {photo && (
        <>
          <Image
            accessibilityLabel="Imagem selecionada"
            source={{ uri: photo.uri }}
            resizeMode="contain"
            style={{ width: "100%", height: 200 }}
          />
          <Button
            label="Enviar foto para extrair texto"
            selected={false}
            disabled={action.busy}
            onPress={() =>
              Alert.alert(
                "Enviar foto ao provedor de visão?",
                "O Groq recebe a imagem para sugerir um texto. Você poderá revisar o resultado antes de salvar.",
                [
                  { text: "Cancelar", style: "cancel" },
                  {
                    text: "Enviar",
                    onPress: () =>
                      void action.run(async () => {
                        const file = new File(photo.uri)
                        const mime = photo.mimeType || file.type
                        if (
                          !["image/jpeg", "image/png", "image/webp"].includes(
                            mime,
                          )
                        )
                          throw new Error(
                            "Use JPEG, PNG ou WebP para extração automática.",
                          )
                        if (file.size > 3_000_000)
                          throw new Error(
                            "Selecione uma imagem de até 3 MB ou faça a revisão manual.",
                          )
                        const { data, error } = await client().functions.invoke(
                          "scan-image",
                          { body: { mime, image: await file.base64() } },
                        )
                        if (error) {
                          const detail = await error.context
                            ?.json?.()
                            .catch(() => undefined)
                          throw new Error(detail?.error ?? error.message)
                        }
                        if (!data?.details)
                          throw new Error("O scanner não retornou texto.")
                        setDetails(data.details)
                        setNotice("review")
                      }),
                  },
                ],
              )
            }
          />
          <Field
            label="Título"
            value={title}
            onChangeText={setTitle}
            maxLength={200}
          />
          <Field
            label="Informações revisadas"
            value={details}
            onChangeText={setDetails}
            multiline
            maxLength={4000}
          />
          <Button
            label="Salvar registro"
            disabled={action.busy}
            onPress={() =>
              void action.run(async () => {
                if (!title.trim() || !details.trim())
                  throw new Error("Preencha o título e revise as informações.")
                await put("events", {
                  type: "scan.saved",
                  payload: {
                    agent,
                    title: title.trim(),
                    details: details.trim(),
                  },
                })
                setPhoto(undefined)
                setTitle("")
                setDetails("")
                setNotice("saved")
              })
            }
          />
        </>
      )}
      <Status {...action} />
      {notice === "review" && <Copy label="Revise a extração antes de salvar." />}
      {notice === "saved" && (
        <>
          <Copy label="Registro salvo." />
          <Button label={agent === "nutrition" ? "Usar no acompanhamento" : "Usar em Ferramentas"} icon="note" selected={false} onPress={onUseReport} />
        </>
      )}
    </Card>
  )
}

function Settings({ agent }: { agent: Agent }) {
  const { values, save } = usePreferences()
  const action = useAction()
  const history = values[agent + "_history"] === true
  const tone =
    values[agent + "_tone"] === "Objetivo" ? "Objetivo" : "Acolhedor e direto"
  return (
    <Card>
      <Copy heading label="Preferências do agente" />
      <Button
        label={
          history
            ? "✓ Usar histórico nas respostas"
            : "Usar histórico nas respostas"
        }
        selected={history}
        disabled={action.busy}
        onPress={() =>
          void action.run(() => save(agent + "_history", !history))
        }
      />
      <Copy label="Tom da conversa" />
      <Row>
        {["Acolhedor e direto", "Objetivo"].map((item) => (
          <Button
            key={item}
            label={item}
            selected={tone === item}
            disabled={action.busy}
            onPress={() => void action.run(() => save(agent + "_tone", item))}
          />
        ))}
      </Row>
      <Status {...action} />
    </Card>
  )
}

export default function AgentsPage() {
  const router = useRouter()
  const notebook = useNotebook()
  const { agent: id } = useLocalSearchParams<{ agent?: Agent }>()
  const agent = typeof id === "string" && Object.hasOwn(agents, id) ? id : undefined
  const [selection, setSelection] = useState<{ agent?: Agent; tab: WorkspaceTab }>({ tab: "Conversa" })
  const [studySession, setStudySession] = useState<FocusSession>()
  const [drafts, setDrafts] = useState<Partial<Record<Agent, string>>>({})
  const [nutritionImport, setNutritionImport] = useState(false)
  const [workoutImport, setWorkoutImport] = useState(false)
  const tab = selection.agent === agent ? selection.tab : "Conversa"

  const setTab = useCallback((next: WorkspaceTab) => {
    setSelection({ agent, tab: next })
  }, [agent])

  function updateDraft(target: Agent, text: string) {
    setDrafts(current => ({ ...current, [target]: text }))
  }

  function openChat(target: Agent, message?: string) {
    const show = () => {
      if (message) updateDraft(target, message)
      setTab("Conversa")
    }
    if (message && drafts[target]?.trim()) {
      Alert.alert("Substituir o rascunho?", "Já existe uma mensagem não enviada para este agente.", [
        { text: "Cancelar", style: "cancel" },
        { text: "Substituir rascunho", onPress: show },
      ])
    } else {
      show()
    }
  }
  useEffect(() => {
    if (!agent || notebook.request?.agent !== agent) return
    const { message } = notebook.request
    notebook.setRequest(undefined)
    openChat(agent, message)
  }, [agent, notebook.request])
  if (agent) {
    return (
      <AgentWorkspace key={agent} agent={agent} tab={tab} changeTab={setTab} back={() => {
        setTab("Conversa")
        router.setParams({ agent: "" })
      }} screens={{
        Conversa: <Chat agent={agent} draft={drafts[agent] ?? ""} setDraft={text => updateDraft(agent, text)} changeTab={setTab} />,
        Ferramentas: agent === "nutrition"
          ? <NutritionTools openChat={message => openChat(agent, message)} scanner={() => setTab("Scanner")}
              startImport={nutritionImport} acceptImport={() => setNutritionImport(false)} />
          : agent === "physical"
            ? <WorkoutTools openChat={message => openChat(agent, message)} scanner={() => setTab("Scanner")}
                startImport={workoutImport} acceptImport={() => setWorkoutImport(false)} />
            : agent === "mental"
              ? <MentalTools openChat={message => openChat(agent, message)} />
              : <StudyTools session={studySession} setSession={setStudySession} openChat={message => openChat(agent, message)} />,
        Notas: <Notebook agent={agent} />,
        Scanner: <Scanner agent={agent} onUseReport={() => {
          if (agent === "nutrition") setNutritionImport(true)
          if (agent === "physical") setWorkoutImport(true)
          setTab("Ferramentas")
        }} />,
        Ajustes: <Settings agent={agent} />,
      }} />
    )
  }

  return (
    <MotionIn style={{ flex: 1 }} distance={8}>
    <AgentDirectory
      openAgent={item => {
        setTab("Conversa")
        router.setParams({ agent: item })
      }}
      openProfile={() => router.navigate("/profile")}
    />
    </MotionIn>
  )
}

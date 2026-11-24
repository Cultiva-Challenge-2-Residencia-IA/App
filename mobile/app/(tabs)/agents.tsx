import { useCallback, useEffect, useState } from "react"
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router"
import { Alert, Image, View } from "react-native"
import * as ImagePicker from "expo-image-picker"
import { File } from "expo-file-system"
import { randomUUID } from "expo-crypto"
import {
  agents,
  client,
  fail,
  localDay,
  put,
  remove,
  rows,
  type Agent,
  type Event,
  type Message,
  type Note,
} from "../../src/backend"
import { usePreferences } from "../../src/preferences"
import {
  Button,
  Card,
  Copy,
  Field,
  Page,
  Row,
  Status,
  useAction,
} from "../../src/ui"

const tabs = ["Conversa", "Ferramentas", "Notas", "Scanner", "Ajustes"] as const
type Tab = typeof tabs[number]

function Chat({ agent }: { agent: Agent }) {
  const [messages, setMessages] = useState<Message[]>()
  const [draft, setDraft] = useState("")
  const action = useAction()
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
    const { data, error } = await database.functions.invoke("agent-chat", {
      body: { agent, messageId: id },
    })
    if (error) {
      const detail = await error.context?.json?.().catch(() => undefined)
      throw new Error(detail?.error ?? error.message)
    }
    if (!data?.message) throw new Error("O agente devolveu uma resposta vazia.")
    await put("messages", {
      agent,
      role: "assistant",
      content: data.message,
      model: data.model,
    })
    await load()
  }

  const last = messages?.at(-1)
  return (
    <>
      <Copy label="Envie uma mensagem para começar. Forneça apenas os dados que deseja compartilhar com o serviço do chat." />
      {messages?.map((message) => (
        <Card key={message.id} dark={message.role === "assistant"}>
          <Copy
            heading
            light={message.role === "assistant"}
            label={message.role === "user" ? "Você" : agents[agent].title}
          />
          <Copy light={message.role === "assistant"} label={message.content} />
        </Card>
      ))}
      <Status {...action} />
      {action.error && (
        <Button
          label="Atualizar conversa"
          selected={false}
          onPress={() => void action.run(load)}
        />
      )}
      {last?.role === "user" && (
        <Button
          label="Solicitar resposta novamente"
          selected={false}
          disabled={action.busy}
          onPress={() => void action.run(() => reply(last.id))}
        />
      )}
      <Field
        label="Mensagem"
        value={draft}
        onChangeText={setDraft}
        multiline
        maxLength={4000}
        editable={!action.busy}
      />
      <Button
        label="Enviar"
        disabled={action.busy || !draft.trim()}
        onPress={() =>
          void action.run(async () => {
            const id = randomUUID()
            await put("messages", {
              id,
              agent,
              role: "user",
              content: draft.trim(),
            })
            setDraft("")
            await load()
            await reply(id)
          })
        }
      />
    </>
  )
}

function Notes({ agent }: { agent: Agent }) {
  const [notes, setNotes] = useState<Note[]>()
  const [editing, setEditing] = useState<string>()
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [search, setSearch] = useState("")
  const action = useAction()
  async function load() {
    setNotes(await rows<Note>("notes", { column: "agent", value: agent }))
  }
  useFocusEffect(
    useCallback(() => {
      void action.run(load)
    }, [agent]),
  )
  function edit(note?: Note) {
    setEditing(note?.id ?? "new")
    setTitle(note?.title ?? "")
    setBody(note?.body ?? "")
  }
  const filtered = notes?.filter((note) =>
    (note.title + " " + note.body)
      .toLowerCase()
      .includes(search.trim().toLowerCase()),
  )
  return (
    <>
      <Field label="Buscar anotações" value={search} onChangeText={setSearch} />
      <Button
        label="Nova anotação"
        selected={!editing}
        onPress={() => edit()}
      />
      {editing && (
        <Card>
          <Field
            label="Título"
            value={title}
            onChangeText={setTitle}
            maxLength={200}
          />
          <Field
            label="Anotação"
            value={body}
            onChangeText={setBody}
            multiline
            maxLength={8000}
          />
          <Row>
            <Button
              label="Cancelar"
              selected={false}
              disabled={action.busy}
              onPress={() => setEditing(undefined)}
            />
            <Button
              label="Salvar"
              disabled={action.busy}
              onPress={() =>
                void action.run(async () => {
                  if (!title.trim() || !body.trim())
                    throw new Error("Escreva um título e uma anotação.")
                  await put(
                    "notes",
                    { agent, title: title.trim(), body: body.trim() },
                    editing === "new" ? undefined : editing,
                  )
                  setEditing(undefined)
                  await load()
                })
              }
            />
          </Row>
        </Card>
      )}
      <Status {...action} />
      {action.error && (
        <Button label="Atualizar notas" onPress={() => void action.run(load)} />
      )}
      {filtered?.length === 0 && <Copy label="Nenhuma anotação encontrada." />}
      {filtered?.map((note) => (
        <Card key={note.id}>
          <Copy heading label={note.title} />
          <Copy label={note.body} />
          <Row>
            <Button
              label="Editar"
              selected={false}
              onPress={() => edit(note)}
            />
            <Button
              label="Excluir"
              selected={false}
              disabled={action.busy}
              onPress={() =>
                Alert.alert("Excluir anotação?", note.title, [
                  { text: "Cancelar", style: "cancel" },
                  {
                    text: "Excluir",
                    style: "destructive",
                    onPress: () =>
                      void action.run(async () => {
                        await remove("notes", "id", note.id)
                        await load()
                      }),
                  },
                ])
              }
            />
          </Row>
        </Card>
      ))}
    </>
  )
}

function Scanner({ agent }: { agent: Agent }) {
  const [photo, setPhoto] = useState<ImagePicker.ImagePickerAsset>()
  const [title, setTitle] = useState("")
  const [details, setDetails] = useState("")
  const [notice, setNotice] = useState("")
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
        setNotice("")
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
                        setNotice("Revise a extração antes de salvar.")
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
                setNotice("Registro salvo.")
              })
            }
          />
        </>
      )}
      <Status {...action} />
      {!!notice && <Copy label={notice} />}
    </Card>
  )
}

function Toolkit({ agent, openChat }: { agent: Agent ; openChat: () => void }) {
  const action = useAction()
  const prefs = usePreferences()
  const [events, setEvents] = useState<Event[]>([])
  const [seconds, setSeconds] = useState(0)
  const [note, setNote] = useState(
    typeof prefs.values.private_note === "string"
      ? prefs.values.private_note
      : "",
  )
  const [topic, setTopic] = useState("")
  const [question, setQuestion] = useState("")
  const [answer, setAnswer] = useState("")
  const [reveal, setReveal] = useState(false)
  const [index, setIndex] = useState(0)
  const cards = events.filter((item) => item.type === "flashcard.created")
  const card = cards[index % Math.max(1, cards.length)]
  const reviews = events.filter(
    (item) =>
      item.type === "flashcard.reviewed" &&
      localDay(new Date(item.created_at)) === localDay(),
  )
  const exercise = events.find(
    (item) =>
      item.type === "exercise.completed" ||
      item.type === "exercise.uncompleted",
  )
  const water = events
    .filter(
      (item) =>
        item.type === "water.logged" &&
        localDay(new Date(item.created_at)) === localDay(),
    )
    .reduce((sum, item) => sum + Number(item.payload.amount ?? 0), 0)

  async function load() {
    setEvents(await rows<Event>("events"))
  }
  useEffect(() => {
    void action.run(load)
  }, [])
  useEffect(() => {
    if (!seconds) return
    const timeout = setTimeout(() => setSeconds(seconds - 1), 1000)
    return () => clearTimeout(timeout)
  }, [seconds])

  function log(type: string, payload: object) {
    void action.run(async () => {
      await put("events", { type, payload })
      await load()
    })
  }

  return (
    <Card>
      <Copy heading label={agents[agent].description} />
      <Button label="Pedir orientação" selected={false} onPress={openChat} />
      {agent === "nutrition" && (
        <>
          <Copy label={water + " copos adicionados hoje"} />
          <Button
            label="Adicionar um copo"
            disabled={action.busy}
            onPress={() =>
              log("water.logged", { amount: 1, source: "agent-toolkit" })
            }
          />
        </>
      )}
      {agent === "physical" && (
        <>
          <Copy label="Mobilidade para coluna" />
          <Button
            label={
              exercise?.type === "exercise.completed"
                ? "Desmarcar conclusão"
                : "Registrar exercício concluído"
            }
            disabled={action.busy}
            onPress={() =>
              log(
                exercise?.type === "exercise.completed"
                  ? "exercise.uncompleted"
                  : "exercise.completed",
                { exercise: "mobilidade-coluna" },
              )
            }
          />
        </>
      )}
      {agent === "mental" && (
        <>
          <Copy
            label={
              seconds
                ? "Respire no seu ritmo · " + seconds + " s"
                : "Pausa de respiração · 30 segundos"
            }
          />
          <Button
            label={seconds ? "Encerrar pausa" : "Iniciar pausa"}
            onPress={() => setSeconds(seconds ? 0 : 30)}
          />
          <Field
            label="Anotação privada pré-sessão"
            multiline
            value={note}
            onChangeText={setNote}
            maxLength={4000}
          />
          <Button
            label="Salvar anotação privada"
            disabled={action.busy}
            onPress={() =>
              void action.run(() => prefs.save("private_note", note.trim()))
            }
          />
        </>
      )}
      {agent === "study" && (
        <>
          <Copy
            label={
              reviews.length + " revisões hoje · " + cards.length + " cartões"
            }
          />
          <Field
            label="Matéria"
            value={topic}
            onChangeText={setTopic}
            maxLength={120}
          />
          <Field
            label="Pergunta"
            value={question}
            onChangeText={setQuestion}
            maxLength={500}
          />
          <Field
            label="Resposta"
            value={answer}
            onChangeText={setAnswer}
            maxLength={1200}
          />
          <Button
            label="Criar cartão"
            disabled={
              action.busy || !topic.trim() || !question.trim() || !answer.trim()
            }
            onPress={() =>
              void action.run(async () => {
                await put("events", {
                  type: "flashcard.created",
                  payload: {
                    topic: topic.trim(),
                    question: question.trim(),
                    answer: answer.trim(),
                  },
                })
                setTopic("")
                setQuestion("")
                setAnswer("")
                setReveal(false)
                setIndex(0)
                await load()
              })
            }
          />
          {card && (
            <Card>
              <Copy label={String(card.payload.topic)} />
              <Copy heading label={String(card.payload.question)} />
              {!reveal ? (
                <Button label="Ver resposta" onPress={() => setReveal(true)} />
              ) : (
                <>
                  <Copy label={String(card.payload.answer)} />
                  <Row>
                    {[false, true].map((known) => (
                      <Button
                        key={String(known)}
                        label={known ? "Já sei" : "Revisar depois"}
                        disabled={action.busy}
                        onPress={() =>
                          void action.run(async () => {
                            await put("events", {
                              type: "flashcard.reviewed",
                              payload: {
                                cardId: card.id,
                                topic: card.payload.topic,
                                known,
                              },
                            })
                            setReveal(false)
                            setIndex(index + 1)
                            await load()
                          })
                        }
                      />
                    ))}
                  </Row>
                </>
              )}
            </Card>
          )}
        </>
      )}
      <Status {...action} />
      {action.error && (
        <Button
          label="Atualizar ferramentas"
          onPress={() => void action.run(load)}
        />
      )}
    </Card>
  )
}

function Settings({ agent }: { agent: Agent }) {
  const { values, save } = usePreferences()
  const action = useAction()
  const history = values[agent + "_history"] !== false
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
  const { agent: id } = useLocalSearchParams<{ agent?: Agent }>()
  const agent = id && Object.hasOwn(agents, id) ? id : undefined
  const [tab, setTab] = useState<Tab>("Conversa")
  return (
    <Page title={agent ? agents[agent].title : "Agentes"}>
      {agent ? (
        <>
          <Button
            label="Voltar aos agentes"
            selected={false}
            onPress={() => router.setParams({ agent: "" })}
          />
          <Row>
            {tabs.map((item) => (
              <Button
                key={item}
                label={item}
                selected={item === tab}
                onPress={() => setTab(item)}
              />
            ))}
          </Row>
          <View key={agent + tab} style={{ gap: 12 }}>
            {tab === "Conversa" && <Chat agent={agent} />}
            {tab === "Ferramentas" && (
              <Toolkit agent={agent} openChat={() => setTab("Conversa")} />
            )}
            {tab === "Notas" && <Notes agent={agent} />}
            {tab === "Scanner" && <Scanner agent={agent} />}
            {tab === "Ajustes" && <Settings agent={agent} />}
          </View>
        </>
      ) : (
        <>
          <Copy heading label="Com quem você quer conversar?" />
          {(Object.keys(agents) as Agent[]).map((item) => (
            <Card key={item}>
              <View
                style={{
                  width: 32,
                  height: 5,
                  backgroundColor: agents[item].color,
                }}
              />
              <Copy heading label={agents[item].title} />
              <Copy label={agents[item].description} />
              <Button
                label={"Abrir " + agents[item].title}
                onPress={() => {
                  setTab("Conversa")
                  router.setParams({ agent: item })
                }}
              />
            </Card>
          ))}
        </>
      )}
    </Page>
  )
}

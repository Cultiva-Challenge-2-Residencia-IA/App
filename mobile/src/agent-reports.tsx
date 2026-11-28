import { useState } from "react"
import { useRouter } from "expo-router"
import { randomUUID } from "expo-crypto"
import { agendaDraft } from "./agenda-suggestions"
import { put, type Agent, type Event } from "./backend"
import { Button, Card, Copy, Field, Row, Status, useAction } from "./ui"

const reportTools = {
  nutrition: {
    label: "Organizar refeições e compras",
    instruction: "Use o trecho para separar preferências, dificuldades e ideias práticas de refeições e compras. Respeite as restrições informadas. Não faça prescrição.",
  },
  physical: {
    label: "Preparar a próxima sessão",
    instruction: "Separe as observações do relatório, os pontos para acompanhar e as perguntas que eu posso levar à próxima sessão. Preserve qualquer orientação profissional registrada e evite diagnósticos ou novos exercícios prescritos.",
  },
  mental: {
    label: "Organizar pontos para conversar",
    instruction: "Organize os temas que aparecem no relato e proponha perguntas de reflexão que eu possa levar a uma conversa. Separe o que está escrito de possíveis interpretações. Evite avaliações clínicas.",
  },
  study: {
    label: "Montar uma revisão",
    instruction: "Identifique os conceitos principais, monte uma sequência de revisão e sugira perguntas de recuperação ativa. Use o trecho como fonte e sinalize informações que estejam faltando.",
  },
} satisfies Record<Agent, { label: string; instruction: string }>

type Report = { id: string; title: string; text: string; date: string }

function getReports(events: Event[], agent: Agent): Report[] {
  return events.flatMap(({ id, type, payload, created_at }) => {
    if (
      (type !== "scan.saved" && type !== "report.saved") ||
      payload.agent !== agent ||
      typeof payload.title !== "string" ||
      typeof payload.details !== "string" ||
      !payload.details.trim()
    ) return []
    return [{ id, title: payload.title, text: payload.details, date: created_at }]
  })
}

export function AgentReports({ agent, events, refresh, openChat, makeCard }: {
  agent: Agent
  events: Event[]
  refresh: () => Promise<void>
  openChat: (message: string) => void
  makeCard?: (topic: string, answer: string) => void
}) {
  const router = useRouter()
  const action = useAction()
  const [selected, setSelected] = useState<string>()
  const [showList, setShowList] = useState(false)
  const [showText, setShowText] = useState(false)
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [notice, setNotice] = useState("")
  const reports = getReports(events, agent)
  const report = reports.find(item => item.id === selected) ?? reports[0]
  const tool = reportTools[agent]

  return (
    <Card>
      <Copy heading label="Relatórios" />
      {!report && !adding && <Copy muted label="Cole um relatório ou salve um documento revisado no Scanner para usar aqui." />}
      <Row>
        <Button label="Colar relatório" icon="note" selected={adding} onPress={() => setAdding(!adding)} />
        {reports.length > 1 && <Button label="Escolher relatório" selected={showList} onPress={() => setShowList(!showList)} />}
      </Row>
      {adding && (
        <>
          <Field label="Título" value={title} onChangeText={setTitle} maxLength={200} />
          <Field label="Texto do relatório" value={body} onChangeText={setBody} multiline maxLength={4000} />
          <Button label="Salvar relatório" disabled={action.busy || !title.trim() || !body.trim()} onPress={() => void action.run(async () => {
            const id = randomUUID()
            await put("events", {
              id, type: "report.saved",
              payload: { agent, title: title.trim(), details: body.trim() },
            })
            setSelected(id)
            setTitle("")
            setBody("")
            setAdding(false)
            setShowText(false)
            setNotice("Relatório salvo.")
            await refresh()
          })} />
        </>
      )}
      {showList && reports.map(item => (
        <Button key={item.id} label={item.title} selected={report?.id === item.id} onPress={() => {
          setSelected(item.id)
          setShowList(false)
          setShowText(false)
          setNotice("")
        }} />
      ))}
      {report && (
        <>
          <Copy heading label={report.title} />
          <Copy muted label={new Date(report.date).toLocaleDateString("pt-BR")} />
          <Copy label={showText || report.text.length <= 240 ? report.text : report.text.slice(0, 240) + "…"} />
          {report.text.length > 240 && <Button label={showText ? "Recolher texto" : "Ver relatório"} selected={false} onPress={() => setShowText(!showText)} />}
          <Button label={tool.label} icon="message" onPress={() => openChat(
            tool.instruction + "\n\nRelatório: " + report.title +
            "\nUse o trecho abaixo como referência.\n\n" + report.text.slice(0, 2800),
          )} />
          <Copy muted label="Você pode revisar o trecho na conversa antes de enviar ao agente." />
          <Row>
            <Button label="Salvar cópia em Notas" icon="note" selected={false} disabled={action.busy} onPress={() => void action.run(async () => {
              await put("notes", { agent, title: report.title, body: report.text })
              setNotice("Cópia salva em Notas.")
            })} />
            <Button label="Planejar acompanhamento" icon="calendar" selected={false} onPress={() => {
              const draft = { ...agendaDraft(agent), label: ("Revisar " + report.title).slice(0, 200) }
              router.navigate({ pathname: "/agenda", params: { draft: JSON.stringify(draft) } })
            }} />
            {makeCard && <Button label="Usar texto em flashcard" icon="book" selected={false} onPress={() => {
              makeCard(report.title.slice(0, 120), report.text.slice(0, 1200))
              setNotice("Trecho inserido na resposta do flashcard. Escreva a pergunta nos campos abaixo.")
            }} />}
          </Row>
        </>
      )}
      <Status {...action} />
      {notice && <Copy muted label={notice} />}
    </Card>
  )
}

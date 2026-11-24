import { useCallback, useState } from "react"
import { useFocusEffect } from "expo-router"
import { File, Paths } from "expo-file-system"
import * as Sharing from "expo-sharing"
import {
  localDay,
  rows,
  stepDay,
  type CheckIn,
  type Event,
} from "../../src/backend"
import { Button, Card, Copy, Page, Row, Status, useAction } from "../../src/ui"

const labels: Record<string, [string, string]> = {
  "checkin.saved": ["Check-in registrado", "Check-ins"],
  "water.logged": ["Água registrada", "Nutrição"],
  "exercise.completed": ["Exercício concluído", "Atividades"],
  "exercise.uncompleted": ["Exercício desmarcado", "Atividades"],
  "task.created": ["Tarefa criada", "Atividades"],
  "task.completed": ["Tarefa concluída", "Atividades"],
  "task.reopened": ["Tarefa reaberta", "Atividades"],
  "scan.saved": ["Imagem revisada", "Scanner"],
  "flashcard.created": ["Cartão criado", "Estudos"],
  "flashcard.reviewed": ["Cartão revisado", "Estudos"],
}

function csvCell(value: string) {
  const safe = /^\s*[=+\-@\t\r\n]/.test(value) ? "'" + value : value
  return '"' + safe.replaceAll('"', '""') + '"'
}

export default function Records() {
  const [records, setRecords] = useState<Event[]>()
  const [days, setDays] = useState(7)
  const [category, setCategory] = useState("Todos")
  const action = useAction()
  async function load() {
    const [events, checkIns] = await Promise.all([
      rows<Event>("events"),
      rows<CheckIn>("checkins"),
    ])
    const entries = checkIns.map(({ id, created_at, ...payload }) => ({
      id,
      created_at,
      type: "checkin.saved",
      payload,
    }))
    setRecords(
      [...events, ...entries].sort((a, b) =>
        b.created_at.localeCompare(a.created_at),
      ),
    )
  }
  useFocusEffect(
    useCallback(() => {
      void action.run(load)
    }, []),
  )
  const from = stepDay(localDay(), 1 - days)
  const filtered = records?.filter(
    (item) =>
      (category === "Todos" || labels[item.type]?.[1] === category) &&
      localDay(new Date(item.created_at)) >= from,
  )
  const checkIns =
    filtered?.filter((item) => item.type === "checkin.saved") ?? []
  const completed =
    filtered?.filter((item) => item.type === "task.completed").length ?? 0
  const averageMood = checkIns.length
    ? (
        checkIns.reduce((sum, item) => sum + Number(item.payload.mood), 0) /
        checkIns.length
      ).toLocaleString("pt-BR", { maximumFractionDigits: 1 })
    : undefined
  return (
    <Page title="Registros">
      <Row>
        {[7, 30].map((value) => (
          <Button
            key={value}
            label={value + " dias"}
            selected={days === value}
            onPress={() => setDays(value)}
          />
        ))}
      </Row>
      <Row>
        {[
          "Todos",
          "Check-ins",
          "Nutrição",
          "Atividades",
          "Estudos",
          "Scanner",
        ].map((value) => (
          <Button
            key={value}
            label={value}
            selected={value === category}
            onPress={() => setCategory(value)}
          />
        ))}
      </Row>
      {filtered && (
        <Copy heading label={filtered.length + " registros no período"} />
      )}
      {!!filtered?.length && (
        <Card>
          <Row>
            {(category === "Todos" || category === "Check-ins") && (
              <Copy
                label={
                  checkIns.length +
                  " check-ins" +
                  (averageMood ? " · Humor médio " + averageMood + "/5" : "")
                }
              />
            )}
            {(category === "Todos" || category === "Atividades") && (
              <Copy label={completed + " conclusões de tarefas"} />
            )}
            {category === "Nutrição" && (
              <Copy
                label={
                  filtered.reduce(
                    (sum, item) =>
                      sum +
                      (item.type === "water.logged"
                        ? Number(item.payload.amount)
                        : 0),
                    0,
                  ) + " copos adicionados"
                }
              />
            )}
            {category === "Estudos" && (
              <Copy
                label={
                  filtered.filter((item) => item.type === "flashcard.reviewed")
                    .length + " cartões revisados"
                }
              />
            )}
            {category === "Scanner" && (
              <Copy label={filtered.length + " imagens revisadas"} />
            )}
          </Row>
        </Card>
      )}
      <Button
        label="Exportar histórico em CSV"
        disabled={action.busy || !filtered?.length}
        onPress={() =>
          void action.run(async () => {
            if (!(await Sharing.isAvailableAsync()))
              throw new Error(
                "O compartilhamento de arquivos está indisponível.",
              )
            const file = new File(Paths.cache, "cultiva-registros.csv")
            file.create({ overwrite: true })
            try {
              file.write(
                "\uFEFF" +
                  [
                    ["Data", "Tipo", "Categoria", "Dados"],
                    ...(filtered ?? []).map((item) => [
                      item.created_at,
                      labels[item.type]?.[0] ?? item.type,
                      labels[item.type]?.[1] ?? "",
                      JSON.stringify(item.payload),
                    ]),
                  ]
                    .map((row) => row.map(csvCell).join(","))
                    .join("\r\n"),
              )
              await Sharing.shareAsync(file.uri, {
                mimeType: "text/csv",
                UTI: "public.comma-separated-values-text",
              })
            } finally {
              if (file.exists) file.delete()
            }
          })
        }
      />
      <Status {...action} />
      {action.error && (
        <Button
          label="Atualizar registros"
          onPress={() => void action.run(load)}
        />
      )}
      {filtered?.length === 0 && (
        <Copy label="Nenhum registro neste período." />
      )}
      {filtered?.map((item) => (
        <Card key={item.type + item.id}>
          <Copy heading label={labels[item.type]?.[0] ?? item.type} />
          <Copy label={new Date(item.created_at).toLocaleString("pt-BR")} />
          <Copy
            label={String(
              item.payload.label ??
                item.payload.title ??
                item.payload.topic ??
                item.payload.priority ??
                (item.type === "water.logged"
                  ? item.payload.amount + " copo(s)"
                  : (labels[item.type]?.[1] ?? "")),
            )}
          />
          {item.type === "checkin.saved" && (
            <Copy
              label={
                "Humor " +
                item.payload.mood +
                " · Energia " +
                item.payload.energy +
                " · Estresse " +
                item.payload.stress
              }
            />
          )}
          {typeof item.payload.details === "string" && (
            <Copy label={item.payload.details} />
          )}
        </Card>
      ))}
    </Page>
  )
}

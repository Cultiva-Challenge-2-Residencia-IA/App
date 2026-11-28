import { useCallback, useMemo, useState } from "react"
import { useFocusEffect } from "expo-router"
import { File, Paths } from "expo-file-system"
import * as Sharing from "expo-sharing"
import { AgentMenu as ActionMenu } from "../../src/agent-workspace"
import { Notebook } from "../../src/notebook"
import { MotionIn } from "../../src/motion"
import { rows, type CheckIn, type Event } from "../../src/backend"
import { useLocalToday } from "../../src/use-local-today"
import { categories, filterRecords, groupRecords, hydrationInPeriod, periods, recordsCsv, summarizeRecords } from "../../src/records-data"
import { RecordsFilters, RecordsHeader, RecordsSummary, RecordsTimeline } from "../../src/records-view"
import { Button, Copy, Page, Row, Status, useAction } from "../../src/ui"

export default function Records() {
  const [data, setData] = useState<{ events: Event[]; checkIns: CheckIn[] }>()
  const [days, setDays] = useState(7)
  const [category, setCategory] = useState("Todos")
  const [menu, setMenu] = useState(false)
  const [section, setSection] = useState<"Visão geral" | "Notas" | "Check-ins" | "Atividades">("Visão geral")
  const action = useAction()
  const today = useLocalToday()

  async function load() {
    const [events, checkIns] = await Promise.all([
      rows<Event>("events"),
      rows<CheckIn>("checkins"),
    ])
    setData({ events, checkIns })
  }
  useFocusEffect(useCallback(() => { void action.run(load) }, []))

  const filtered = useMemo(
    () => data ? filterRecords([...data.events, ...data.checkIns.map(({ id, created_at, ...payload }) => ({
      id, created_at, type: "checkin.saved", payload,
    }))], days, category, today) : undefined,
    [data, days, category, today],
  )
  const hydration = useMemo(
    () => data && (category === "Todos" || category === "Nutrição") ? hydrationInPeriod(data.checkIns, data.events, days, today) : 0,
    [data, category, days, today],
  )
  const groups = useMemo(() => groupRecords(filtered ?? [], today), [filtered, today])

  function exportCsv() {
    if (!filtered?.length) return
    void action.run(async () => {
      if (!(await Sharing.isAvailableAsync()))
        throw new Error("O compartilhamento de arquivos está indisponível.")
      const file = new File(Paths.cache, "cultiva-registros.csv")
      file.create({ overwrite: true })
      try {
        file.write(recordsCsv(filtered))
        await Sharing.shareAsync(file.uri, {
          mimeType: "text/csv",
          UTI: "public.comma-separated-values-text",
        })
      } finally {
        if (file.exists) file.delete()
      }
    })
  }

  return (
    <Page title="Registros" header={<RecordsHeader openMenu={() => setMenu(true)} />}>
      <Row>{(["Visão geral", "Notas", "Check-ins", "Atividades"] as const).map(item =>
        <Button key={item} label={item} selected={section === item} onPress={() => {
          setSection(item)
          if (item !== "Notas") setCategory(item === "Visão geral" ? "Todos" : item)
        }} />)}</Row>
      <MotionIn key={section} style={{ gap: 20 }} distance={6}>
      {section === "Notas" ? <Notebook /> : <>
      <RecordsFilters period={days} category={category} periods={periods} categories={section === "Visão geral" ? categories : [category]}
        onPeriod={setDays} onCategory={setCategory} />
      {filtered && <RecordsSummary total={filtered.length} stats={summarizeRecords(filtered, category, hydration)} />}
      <Copy heading label="Histórico de atividades" />
      <Status {...action} />
      {!!action.error && <Button label="Atualizar registros" icon="record" onPress={() => void action.run(load)} />}
      {filtered?.length === 0 && <Copy muted label="Nenhum registro para os filtros selecionados." />}
      <RecordsTimeline key={days + category} groups={groups} />
      </>}
      </MotionIn>
      <ActionMenu title="Ações de Registros" visible={menu} close={() => setMenu(false)}
        actions={[{ label: "Exportar histórico em CSV", icon: "record", run: exportCsv, disabled: section === "Notas" || action.busy || !filtered?.length }]} />
    </Page>
  )
}

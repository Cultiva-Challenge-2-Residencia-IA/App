import { useState } from "react"
import { Alert } from "react-native"
import * as DocumentPicker from "expo-document-picker"
import { File, Paths } from "expo-file-system"
import { randomUUID } from "expo-crypto"
import { client, type Event } from "./backend"
import { blankMeal, confirmPlan, planDraft, verifyPlanSource, type Meal, type NutritionPlan } from "./nutrition-data"
import { Button, Card, Copy, Field, Row, Status, useAction } from "./ui"
import { FormScreen } from "./form-screen"

export function NutritionImport({ events, current, activate, close, scanner, entry }: {
  events: Event[]
  current?: NutritionPlan
  activate: (plan: NutritionPlan) => Promise<void>
  close: () => void
  scanner: () => void
  entry?: "document" | "text" | "describe"
}) {
  const action = useAction()
  const [text, setText] = useState("")
  const [pdf, setPdf] = useState<{ name: string; body: string }>()
  const [draft, setDraft] = useState(current)
  const [sources, setSources] = useState(false)
  const [showSource, setShowSource] = useState(false)
  const [selected, setSelected] = useState<string>()
  const meal = draft?.meals.find(item => item.id === selected) ?? draft?.meals[0]
  const scanned = events.filter(event => event.type === "scan.saved" && event.payload.agent === "nutrition" && typeof event.payload.details === "string")

  function changeText(value: string) {
    setText(value)
    setPdf(undefined)
  }

  function chooseDocument() {
    void action.run(async () => {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "text/plain", "text/csv", "text/markdown"],
        copyToCacheDirectory: true,
      })
      if (result.canceled) return
      const asset = result.assets[0]
      const file = new File(asset.uri)
      try {
        if (file.size > 2_000_000) throw new Error("Escolha um arquivo de até 2 MB.")
        if (asset.mimeType === "application/pdf" || /\.pdf$/i.test(asset.name)) {
          const body = await file.base64()
          if (!body.startsWith("JVBERi0")) throw new Error("Selecione um PDF válido.")
          setText("")
          setPdf({ name: asset.name, body })
        } else {
          const source = (await file.text()).trim()
          if (!source || source.length > 12000) throw new Error("Use um documento de texto de até 12.000 caracteres.")
          changeText(source)
        }
      } finally {
        const cache = Paths.cache.uri.replace(/\/$/, "") + "/"
        if (file.uri.startsWith(cache) && file.exists) file.delete()
      }
    })
  }

  function interpret() {
    void action.run(async () => {
      const { data, error } = await client().functions.invoke("nutrition-plan", {
        body: pdf ? { pdf: pdf.body } : { text: text.trim() },
      })
      if (error) {
        const detail = await error.context?.json?.().catch(() => undefined)
        throw new Error(detail?.error ?? error.message)
      }
      const next = planDraft(data?.plan, randomUUID)
      const source = typeof data?.source === "string" ? data.source : text
      if (source) setText(source)
      setPdf(undefined)
      verifyPlanSource(next, source)
      setDraft(next)
      setSelected(next.meals[0]?.id)
    })
  }

  function changeMeal(update: Partial<Meal>) {
    if (!meal) return
    setDraft(value => value && {
      ...value,
      meals: value.meals.map(item => item.id === meal.id ? { ...item, ...update } : item),
    })
  }

  function cancel(next: () => void = close) {
    if (action.busy) return
    if (!text.trim() && !pdf && draft === current) return next()
    Alert.alert("Descartar rascunho?", "O plano ativo e o histórico serão preservados.", [
      { text: "Continuar editando", style: "cancel" },
      { text: "Descartar", style: "destructive", onPress: next },
    ])
  }

  if (!draft) return (
    <FormScreen title={entry === "describe" ? "Descrever plano alimentar" : entry === "text" ? "Colar texto do plano" : "Importar plano alimentar"}
      close={cancel} busy={action.busy}>
      {entry === "describe" && <Copy label="Escreva as refeições do seu plano e inclua horários, porções e alternativas se estiverem definidos. A IA organiza sua descrição para revisão." />}
      {(entry === "document" || !entry) && <>
      <Row>
        <Button label="Escolher documento" icon="record" selected={false} disabled={action.busy} onPress={chooseDocument} />
        <Button label="Abrir Scanner" icon="scan" selected={false} onPress={() => cancel(() => { close(); scanner() })} />
        {!!scanned.length && <Button label="Usar texto do Scanner" selected={sources} onPress={() => setSources(!sources)} />}
      </Row>
      {sources && scanned.map(event => <Button key={event.id} label={String(event.payload.title ?? "Documento revisado")} selected={false}
        onPress={() => { changeText(String(event.payload.details)); setSources(false) }} />)}
      </>}
      {pdf ? <Copy muted label={"Documento: " + pdf.name} /> :
        <Field label="Texto do plano" value={text} onChangeText={changeText} multiline maxLength={12000} />}
      {pdf && <Button label="Trocar por texto" selected={false} onPress={() => changeText("")} />}
      <Copy muted label="Ao interpretar, o serviço de IA recebe o texto do plano. Você revisa as refeições antes de salvar." />
      <Status {...action} />
      <Row>
        <Button label="Interpretar com IA" icon="spark" disabled={action.busy || (!pdf && !text.trim())} onPress={interpret} />
        <Button label="Preencher manualmente" selected={false} disabled={action.busy}
          onPress={() => setDraft({ id: randomUUID(), name: "Plano alimentar", notes: "", meals: [blankMeal(randomUUID())] })} />
        <Button label="Cancelar" selected={false} disabled={action.busy} onPress={cancel} />
      </Row>
    </FormScreen>
  )

  return (
    <FormScreen title="Revisar plano alimentar" close={cancel} busy={action.busy}>
      <Copy muted label="Confira os alimentos, as porções e as alternativas com a fonte antes de ativar." />
      {!!text && <>
        <Button label={showSource ? "Recolher fonte" : "Conferir texto da fonte"} selected={false} onPress={() => setShowSource(!showSource)} />
        {showSource && <Copy label={text} />}
      </>}
      <Field label="Nome do plano" value={draft.name} maxLength={200}
        onChangeText={name => setDraft(value => value && ({ ...value, name }))} />
      <Field label="Orientações do plano" value={draft.notes} multiline maxLength={2500}
        onChangeText={notes => setDraft(value => value && ({ ...value, notes }))} />
      <Row>
        {draft.meals.map((item, index) => <Button key={item.id} label={item.name || "Refeição " + (index + 1)}
          selected={meal?.id === item.id} onPress={() => setSelected(item.id)} />)}
        <Button label="Adicionar refeição" icon="plus" selected={false} disabled={draft.meals.length >= 16} onPress={() => {
          const next = blankMeal(randomUUID())
          setDraft(value => value && ({ ...value, meals: [...value.meals, next] }))
          setSelected(next.id)
        }} />
      </Row>
      {meal && <>
        <Field label="Nome da refeição" value={meal.name} onChangeText={name => changeMeal({ name })} maxLength={150} />
        <Field label="Horário (HH:MM, opcional)" value={meal.time} onChangeText={time => changeMeal({ time })} maxLength={5} />
        {meal.foods.map((food, index) => {
          const update = (fields: Partial<typeof food>) => changeMeal({
            foods: meal.foods.map((value, itemIndex) => itemIndex === index ? { ...value, ...fields } : value),
          })
          return <Card key={meal.id + ":" + index}>
            <Field label={"Alimento " + (index + 1)} value={food.name} onChangeText={name => update({ name })} maxLength={180} />
            <Field label="Porção da fonte" value={food.portion} onChangeText={portion => update({ portion })} maxLength={140} />
            <Field label="Alternativas da fonte" value={food.alternatives} onChangeText={alternatives => update({ alternatives })} multiline maxLength={700} />
            {meal.foods.length > 1 && <Button label="Remover item do rascunho" icon="trash" selected={false}
              onPress={() => changeMeal({ foods: meal.foods.filter((_, itemIndex) => itemIndex !== index) })} />}
          </Card>
        })}
        <Button label="Adicionar alimento" icon="plus" selected={false} disabled={meal.foods.length >= 24}
          onPress={() => changeMeal({ foods: [...meal.foods, { name: "", portion: "", alternatives: "" }] })} />
        <Field label="Observações da refeição" value={meal.notes} onChangeText={notes => changeMeal({ notes })} multiline maxLength={2000} />
        {draft.meals.length > 1 && <Button label="Remover refeição do rascunho" icon="trash" selected={false}
          onPress={() => { setDraft(value => value && ({ ...value, meals: value.meals.filter(entry => entry.id !== meal.id) })); setSelected(undefined) }} />}
      </>}
      <Status {...action} />
      <Row>
        <Button label="Confirmar e ativar plano" icon="check" disabled={action.busy}
          onPress={() => void action.run(() => activate(confirmPlan(draft)))} />
        <Button label="Cancelar revisão" selected={false} disabled={action.busy} onPress={cancel} />
      </Row>
    </FormScreen>
  )
}

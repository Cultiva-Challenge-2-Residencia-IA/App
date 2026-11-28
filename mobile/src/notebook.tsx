import { useState } from "react"
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { useRouter } from "expo-router"
import { randomUUID } from "expo-crypto"
import { agendaDraft } from "./agenda-suggestions"
import { agents, localDay, stepDay, type Agent } from "./backend"
import { Icon, type IconName } from "./icons"
import { notebookAction, notebookModels, useNotebook, type NoteInput, type NotebookNote } from "./notebook-data"
import { NotebookFiles } from "./notebook-files"
import { MotionIn, useMotionReduced } from "./motion"
import { Button, Card, Copy, Field, Row, Status, tones, useAction, usePalette } from "./ui"

const symbols: Record<Agent, IconName> = { mental: "spark", physical: "activity", nutrition: "leaf", study: "book" }
const names: Record<Agent, string> = { mental: "Mental", physical: "Física", nutrition: "Nutrição", study: "Estudos" }
const dateLabel = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
const searchable = (value: string) => value.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/\p{M}/gu, "")

function NoteEditor({ draft, close }: { draft: { agent: Agent; note?: NotebookNote; model?: readonly [string, string] }; close: () => void }) {
  const reduced = useMotionReduced()
  const palette = usePalette()
  const notebook = useNotebook()
  const action = useAction()
  const [id, setId] = useState(draft.note?.id)
  const [title, setTitle] = useState(draft.note?.title ?? "")
  const [body, setBody] = useState(draft.note?.body ?? draft.model?.[1] ?? "")
  const [category, setCategory] = useState(draft.note?.category ?? draft.model?.[0] ?? "Geral")
  const [tags, setTags] = useState(draft.note?.tags.join(", ") ?? "")
  const [checklist, setChecklist] = useState(draft.note?.checklist ?? [])
  const [dirty, setDirty] = useState(false)
  const busy = action.busy

  function dismiss() {
    if (busy) return
    if (!dirty) return close()
    Alert.alert("Descartar alterações?", "O texto e os campos ainda não foram salvos.", [
      { text: "Continuar editando", style: "cancel" },
      { text: "Descartar", style: "destructive", onPress: close },
    ])
  }

  function save() {
    void action.run(async () => {
      const input: Partial<NoteInput> = {
        title: title.trim(), body: body.trim(), category: category.trim() || "Geral",
        tags: [...new Set(tags.split(",").map(tag => tag.trim()).filter(Boolean))].slice(0, 12),
        checklist: checklist.map(item => ({ ...item, text: item.text.trim() })).filter(item => item.text),
      }
      const note = await notebook.save(id ? input : { ...input, agent: draft.agent }, id)
      setId(note.id)
      setDirty(false)
      close()
    })
  }

  return <Modal visible transparent animationType={reduced ? "none" : "slide"} onRequestClose={dismiss}>
    <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View accessibilityViewIsModal style={[styles.sheet, { backgroundColor: palette.paper, borderColor: palette.line }]}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.sheetContent}>
          <View style={styles.heading}>
            <Copy heading label={id ? "Editar nota" : "Nova nota"} />
            <Button label="Fechar" selected={false} disabled={busy} onPress={dismiss} />
          </View>
          <Copy muted label={agents[draft.agent].title} />
          <Field label="Título" value={title} maxLength={200} onChangeText={value => { setTitle(value); setDirty(true) }} />
          <Field label="Anotação" value={body} multiline maxLength={8000} onChangeText={value => { setBody(value); setDirty(true) }} />
          <Field label="Categoria" value={category} maxLength={80} onChangeText={value => { setCategory(value); setDirty(true) }} />
          <Field label="Tags separadas por vírgulas" value={tags} maxLength={400} onChangeText={value => { setTags(value); setDirty(true) }} />
          <Copy heading label="Checklist" />
          {checklist.map((item, index) => <View key={item.id} style={[styles.checkRow, { borderColor: palette.line }]}>
            <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: item.done }} accessibilityLabel={item.text || "Item " + (index + 1)}
              style={styles.checkTarget} onPress={() => {
                setChecklist(current => current.map(entry => entry.id === item.id ? { ...entry, done: !entry.done } : entry))
                setDirty(true)
              }}>
              <Text style={{ color: palette.ink, fontSize: 22 }}>{item.done ? "☑" : "☐"}</Text>
            </Pressable>
            <View style={styles.flex}><Field label={"Item " + (index + 1)} value={item.text} maxLength={200} onChangeText={text => {
              setChecklist(current => current.map(entry => entry.id === item.id ? { ...entry, text } : entry))
              setDirty(true)
            }} /></View>
            <Pressable accessibilityRole="button" accessibilityLabel={"Remover item " + (index + 1)} style={styles.checkTarget}
              onPress={() => { setChecklist(current => current.filter(entry => entry.id !== item.id)); setDirty(true) }}>
              <Icon name="trash" size={18} color={palette.ink} />
            </Pressable>
          </View>)}
          <Button label="Adicionar item" icon="plus" selected={false} disabled={checklist.length >= 30}
            onPress={() => { setChecklist(current => [...current, { id: randomUUID(), text: "", done: false }]); setDirty(true) }} />
          <Status {...action} />
          <Button label="Salvar nota" icon="check" disabled={busy || !title.trim() || (!body.trim() && !checklist.some(item => item.text.trim()))}
            onPress={save} />
          {id ? <NotebookFiles noteId={id} /> : <Copy muted label="Salve a nota para adicionar anexos." />}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  </Modal>
}

export function Notebook({ agent }: { agent?: Agent }) {
  const reduced = useMotionReduced()
  const palette = usePalette()
  const router = useRouter()
  const notebook = useNotebook()
  const action = useAction()
  const [query, setQuery] = useState("")
  const [scope, setScope] = useState<Agent>()
  const [category, setCategory] = useState("")
  const [days, setDays] = useState(0)
  const [favorites, setFavorites] = useState(false)
  const [filters, setFilters] = useState(false)
  const [models, setModels] = useState(true)
  const [editing, setEditing] = useState<{ agent: Agent; note?: NotebookNote; model?: readonly [string, string] }>()
  const [selected, setSelected] = useState<string>()
  const [consultation, setConsultation] = useState<{ agent: Agent; excerpt: string }>()
  const active = agent ?? scope
  const all = notebook.notes?.filter(note => !active || note.agent === active) ?? []
  const categories = [...new Set(all.map(note => note.category ?? "Geral"))].sort((a, b) => a.localeCompare(b, "pt-BR"))
  const term = searchable(query.trim())
  const earliest = days ? stepDay(localDay(), 1 - days) : ""
  const matches = all.filter(note => (!favorites || note.favorite) && (!category || note.category === category) &&
    (!earliest || localDay(new Date(note.created_at)) >= earliest) &&
    (!term || searchable([note.title, note.body, note.category, ...note.tags, ...note.checklist.map(item => item.text)]
      .join(" ")).includes(term))).sort((a, b) => b.created_at.localeCompare(a.created_at))
  const surface = { backgroundColor: palette.surface, borderColor: palette.line }

  function consult(note: NotebookNote) {
    const excerpt = [note.title, note.body, ...note.checklist.map(item => (item.done ? "✓ " : "☐ ") + item.text)].join("\n")
    setConsultation({ agent: note.agent, excerpt: excerpt.slice(0, 3000) })
  }

  function schedule(note: NotebookNote) {
    router.navigate({ pathname: "/agenda", params: { draft: JSON.stringify({ ...agendaDraft(note.agent), label: note.title }) } })
  }

  return <>
    {!agent && <Row>
      <Button label="Todas" selected={!scope} onPress={() => { setScope(undefined); setCategory("") }} />
      {(Object.keys(names) as Agent[]).map(item => <Button key={item} label={names[item]} icon={symbols[item]} selected={scope === item}
        onPress={() => { setScope(item); setCategory("") }} />)}
    </Row>}
    <View style={[styles.hero, surface]}>
      <View style={styles.flex}>
        <Text accessibilityRole="header" style={[styles.heroTitle, { color: palette.ink }]}>
          {agent ? "Notas de " + agents[agent].title : notebook.notes ? matches.length + (matches.length === 1 ? " anotação" : " anotações") : "Central de anotações"}
        </Text>
        <Copy muted label={agent ? agents[agent].description : scope ? agents[scope].title : "Em todos os agentes"} />
      </View>
      <Icon name={agent ? symbols[agent] : "book"} color={palette.accent} size={38} />
    </View>
    {agent && <>
      <Row>
        <Button label="Nova nota" icon="plus" variant="highlight" disabled={!notebook.notes} onPress={() => setEditing({ agent })} />
        <Button label="Modelos" icon="note" selected={models} onPress={() => setModels(!models)} />
      </Row>
      {models && <View style={styles.modelGrid}>
        {notebookModels[agent].map(model => <Pressable accessibilityRole="button" key={model[0]} disabled={!notebook.notes}
          onPress={() => setEditing({ agent, model })} style={({ pressed }) => [styles.model, surface, { opacity: pressed ? 0.7 : 1 }]}>
          <Icon name={symbols[agent]} color={palette.accent} size={19} />
          <Text style={[styles.name, { color: palette.ink }]}>{model[0]}</Text>
        </Pressable>)}
      </View>}
    </>}
    <View style={styles.heading}>
      <Copy heading label={agent ? "Suas notas neste agente" : "Recentes"} />
      <Button label="Filtros" selected={filters} onPress={() => setFilters(!filters)} />
    </View>
    <Field label={agent ? "Buscar no caderno" : "Buscar em todas as notas"} value={query} onChangeText={setQuery} />
    {filters && <Card>
      <Copy heading label="Período" />
      <Row>{[0, 1, 7, 30].map(period => <Button key={period} label={period === 0 ? "Qualquer data" : period === 1 ? "Hoje" : period + " dias"}
        selected={period === days} onPress={() => setDays(period)} />)}</Row>
      <Copy heading label="Categoria" />
      <Row>
        <Button label="Todas" selected={!category} onPress={() => setCategory("")} />
        {categories.map(item => <Button key={item} label={item} selected={category === item} onPress={() => setCategory(item)} />)}
      </Row>
      <Button label="Somente favoritos" selected={favorites} onPress={() => setFavorites(!favorites)} />
    </Card>}
    {!!notebook.error && <>
      <Copy label={notebook.error} />
      <Button label="Atualizar notas" selected={false} onPress={() => void notebook.refresh()} />
    </>}
    {!notebook.notes && !notebook.error && <Copy muted label="Carregando notas…" />}
    {!!notebook.notes && !matches.length && <Copy muted label={all.length ? "Nenhuma nota corresponde aos filtros." : "Nenhuma nota neste caderno."} />}
    {matches.map(note => {
      const open = selected === note.id
      return <View key={note.id} style={[styles.note, surface]}>
        <View style={styles.noteRow}>
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }}
            onPress={() => setSelected(open ? undefined : note.id)} style={[styles.noteRow, styles.flex]}>
            <View style={[styles.tile, { backgroundColor: palette.lime }]}>
              <Icon name={symbols[note.agent]} color={tones.onAction} size={20} />
            </View>
            <View style={styles.flex}>
              <Text style={[styles.name, { color: palette.ink }]}>{note.title}</Text>
              <Text style={[styles.meta, { color: palette.muted }]}>
                {agent ? "" : agents[note.agent].title + " · "}{dateLabel.format(new Date(note.created_at))} · {note.category ?? "Geral"}
              </Text>
              <Text numberOfLines={1} style={[styles.meta, { color: palette.ink }]}>{note.body || note.checklist?.[0]?.text}</Text>
            </View>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={note.favorite ? "Remover dos favoritos" : "Favoritar " + note.title}
            accessibilityState={{ selected: note.favorite }} disabled={action.busy}
            onPress={() => void action.run(async () => { await notebook.save({ favorite: !note.favorite }, note.id) })} style={styles.checkTarget}>
            <Text style={{ color: note.favorite ? palette.accent : palette.muted, fontSize: 22 }}>{note.favorite ? "★" : "☆"}</Text>
          </Pressable>
        </View>
        {open && <MotionIn distance={5} duration={170} style={[styles.details, { borderColor: palette.line }]}>
          {!!note.body && <Copy label={note.body} />}
          {!!note.tags?.length && <Copy muted label={note.tags.map(tag => "#" + tag).join("  ")} />}
          {note.checklist?.map(item => <Pressable key={item.id} accessibilityRole="checkbox" accessibilityState={{ checked: item.done }}
            disabled={action.busy} style={styles.checkRow} onPress={() => void action.run(async () => {
              await notebook.save({ checklist: note.checklist.map(entry => entry.id === item.id ? { ...entry, done: !entry.done } : entry) }, note.id)
            })}><Text style={{ color: palette.ink }}>{item.done ? "☑ " : "☐ "}{item.text}</Text></Pressable>)}
          <Row>
            <Button label="Editar e ver anexos" icon="note" selected={false} onPress={() => setEditing({ agent: note.agent, note })} />
            <Button label="Criar tarefa" icon="calendar" selected={false} onPress={() => schedule(note)} />
            <Button label={notebookAction[note.agent]} icon="spark" selected={false} onPress={() => consult(note)} />
            <Button label="Excluir nota" icon="trash" selected={false} disabled={action.busy}
              onPress={() => Alert.alert("Excluir nota?", note.title, [
                { text: "Cancelar", style: "cancel" },
                { text: "Excluir", style: "destructive", onPress: () => void action.run(() => notebook.erase(note.id)) },
              ])} />
          </Row>
        </MotionIn>}
      </View>
    })}
    <Status {...action} />
    {!!editing && <NoteEditor draft={editing} close={() => setEditing(undefined)} />}
    {!!consultation && <Modal visible transparent animationType={reduced ? "none" : "slide"} onRequestClose={() => setConsultation(undefined)}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View accessibilityViewIsModal style={[styles.sheet, { backgroundColor: palette.paper, borderColor: palette.line }]}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.sheetContent}>
            <Copy heading label={"Consultar " + agents[consultation.agent].title} />
            <Copy label="Escolha o trecho que deseja incluir no chat. O texto só será enviado quando você tocar em Enviar." />
            <Field label="Trecho para a consulta" value={consultation.excerpt} maxLength={3000} multiline
              onChangeText={excerpt => setConsultation({ ...consultation, excerpt })} />
            <Row>
              <Button label="Cancelar" selected={false} onPress={() => setConsultation(undefined)} />
              <Button label="Preparar rascunho" disabled={!consultation.excerpt.trim()} onPress={() => {
                const { agent, excerpt } = consultation
                notebook.setRequest({ agent, message: notebookAction[agent] + " com base nesta anotação:\n\n" + excerpt.trim() })
                setConsultation(undefined)
                router.navigate({ pathname: "/agents", params: { agent } })
              }} />
            </Row>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>}
  </>
}

const styles = StyleSheet.create({
  hero: { borderWidth: 1, borderRadius: 17, flexDirection: "row", alignItems: "center", gap: 10, padding: 13 },
  heroTitle: { fontSize: 23, letterSpacing: -0.6, fontWeight: "900", marginBottom: 3 },
  heading: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 5 },
  modelGrid: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  model: { minWidth: "44%", flex: 1, borderRadius: 12, padding: 9, gap: 5, borderWidth: 1 },
  flex: { flex: 1, minWidth: 0 },
  note: { borderWidth: 1, borderRadius: 14, padding: 8, gap: 5 },
  noteRow: { flexDirection: "row", gap: 7, alignItems: "center", minHeight: 49 },
  tile: { width: 35, height: 37, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  name: { fontSize: 15, fontWeight: "800" },
  meta: { fontSize: 12, marginTop: 3 },
  details: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 7, gap: 6 },
  checkRow: { flexDirection: "row", gap: 4, alignItems: "center", minHeight: 42 },
  checkTarget: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "#0008" },
  sheet: { maxHeight: "92%", borderTopLeftRadius: 22, borderTopRightRadius: 22, borderWidth: 1 },
  sheetContent: { padding: 16, paddingBottom: 38, gap: 8 },
})

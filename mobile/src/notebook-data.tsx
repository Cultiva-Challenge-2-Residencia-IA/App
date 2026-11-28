import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react"
import { client, fail, remove, rows, type Agent, type Note } from "./backend"

export type ChecklistItem = { id: string; text: string; done: boolean }
export type NotebookNote = Note & {
  category: string
  tags: string[]
  checklist: ChecklistItem[]
  favorite: boolean
  source_message_id: string | null
}
export type NoteInput = Pick<NotebookNote, "agent" | "title" | "body" | "category" | "tags" | "checklist" | "favorite" | "source_message_id">
type ChatRequest = { agent: Agent; message: string }

function withDefaults(note: NotebookNote): NotebookNote {
  return { ...note, category: note.category ?? "Geral", tags: note.tags ?? [], checklist: note.checklist ?? [],
    favorite: note.favorite ?? false, source_message_id: note.source_message_id ?? null }
}

const notebooks = createContext<{
  notes: NotebookNote[] | undefined
  error: string | undefined
  refresh: () => Promise<void>
  save: (input: Partial<NoteInput>, id?: string) => Promise<NotebookNote>
  erase: (id: string) => Promise<void>
  request: ChatRequest | undefined
  setRequest: (request?: ChatRequest) => void
} | null>(null)

export function NotebookProvider({ children }: { children: ReactNode }) {
  const [notes, setNotes] = useState<NotebookNote[]>()
  const [error, setError] = useState<string>()
  const [request, setRequest] = useState<ChatRequest>()
  const revision = useRef(0)
  const refresh = useCallback(async () => {
    const version = ++revision.current
    setError(undefined)
    try {
      const records = await rows<NotebookNote>("notes")
      if (version === revision.current) setNotes(records.map(withDefaults))
    } catch (cause) {
      if (version === revision.current) setError(cause instanceof Error ? cause.message : "Falha ao carregar notas.")
    }
  }, [])
  useEffect(() => { void refresh() }, [refresh])

  async function save(input: Partial<NoteInput>, id?: string) {
    const table = client().from("notes")
    const { data, error } = await (id ? table.update(input).eq("id", id) : table.insert(input)).select().single()
    fail(error)
    const note = withDefaults(data as NotebookNote)
    revision.current++
    setNotes(current => current && [...current.filter(item => item.id !== note.id), note])
    return note
  }

  async function erase(id: string) {
    await remove("notes", "id", id)
    revision.current++
    setNotes(current => current?.filter(item => item.id !== id))
  }

  return <notebooks.Provider value={{ notes, error, refresh, save, erase, request, setRequest }}>{children}</notebooks.Provider>
}

export function useNotebook() {
  const value = useContext(notebooks)
  if (!value) throw new Error("Caderno indisponível.")
  return value
}

export const notebookModels = {
  mental: [
    ["Diário emocional", "O que aconteceu?\nComo me senti?\nO que me ajudou?"],
    ["Terapia", "O que quero conversar na próxima sessão?"],
    ["Reflexão", "O que aprendi hoje?\nO que quero fazer diferente?"],
    ["Registro de crise", "O que percebi?\nQue apoio procurei?"],
  ],
  physical: [
    ["Treino", "Exercícios e observações do treino"],
    ["Mobilidade", "Movimentos praticados e observações"],
    ["Recuperação", "Descanso e como me senti"],
    ["Metas", "O que quero acompanhar?"],
  ],
  nutrition: [
    ["Refeição", "Alimentos, porções e observações"],
    ["Plano alimentar", "Orientações do meu plano"],
    ["Hidratação", "Registro e observações"],
    ["Compras", "Itens que quero lembrar"],
  ],
  study: [
    ["Resumo", "Conceitos principais\nExemplos"],
    ["Revisão", "O que já sei?\nO que preciso revisar?"],
    ["Dúvidas", "Perguntas para investigar"],
    ["Planejamento", "Objetivos e próximas etapas"],
  ],
} as const

export const notebookAction: Record<Agent, string> = {
  mental: "Organizar pontos para reflexão",
  physical: "Resumir observações do treino",
  nutrition: "Organizar dúvidas sobre alimentação",
  study: "Montar perguntas de revisão",
}

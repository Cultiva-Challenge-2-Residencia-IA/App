import { agents, localDay, validDay, validTime, type Agent } from "./backend"

export type TaskDraft = { label: string; day: string; time: string; category: string }

export function readAgendaDraft(value: unknown): TaskDraft | undefined {
  if (typeof value !== "string" || value.length > 1000) return
  try {
    const draft = JSON.parse(value)
    if (!draft || typeof draft.label !== "string" || draft.label.length > 200 ||
      typeof draft.day !== "string" || !validDay(draft.day) ||
      typeof draft.time !== "string" || !validTime(draft.time) ||
      typeof draft.category !== "string" || draft.category.length > 80) return
    return draft
  } catch {
    return
  }
}

export function agendaDraft(agent: Agent): TaskDraft {
  return { label: "", day: localDay(), time: "", category: agents[agent].title }
}

export function agendaAgent(category: string): Agent | undefined {
  if (category === "Atividades") return "physical"
  return (Object.keys(agents) as Agent[]).find(agent => agents[agent].title === category)
}

export function agendaSuggestion(agent: Agent, content: string) {
  const match = /(?:^|\r?\n)\[\[AGENDA\]\][ \t]*(\{[^\r\n]*\})[ \t]*$/u.exec(content.trimEnd())
  if (!match) return { text: content }
  const text = content.slice(0, match.index).trim()
  try {
    const fields = JSON.parse(match[1])
    const draft = readAgendaDraft(JSON.stringify({
      label: typeof fields?.label === "string" ? fields.label.trim() : undefined,
      day: fields?.day,
      time: fields?.time ?? "",
      category: agents[agent].title,
    }))
    return { text, draft: draft?.label ? draft : undefined }
  } catch {
    return { text }
  }
}

import type { EventRecord } from "./localDb"

export function sumWater(events: EventRecord[]) {
  return events

    .filter((event) => event.type === "water.logged")

    .reduce((total, event) => total + Number(event.payload.amount || 0), 0)
}

export function projectEvent(event: EventRecord) {
  const views: Record<string, {
    icon: string
    title: string
    cat: string
    color: string
  }> = {
    "water.logged": {
      icon: "water",

      title: "Água registrada",

      cat: "Nutrição",

      color: "#3a83a6",
    },

    "exercise.completed": {
      icon: "activity",

      title: "Exercício concluído",

      cat: "Atividades",

      color: "#3a83a6",
    },

    "flashcard.reviewed": {
      icon: "book",

      title: "Flashcard revisado",

      cat: "Estudos",

      color: "#c47a57",
    },

    "scan.saved": {
      icon: "scan",

      title: "Arquivo revisado",

      cat: "Nutrição",

      color: "#4f9c76",
    },

    "private-note.updated": {
      icon: "note",

      title: "Anotação privada atualizada",

      cat: "Check-ins",

      color: "#8175b7",
    },

    "task.created": {
      icon: "plus",

      title: "Tarefa criada",

      cat: "Atividades",

      color: "#3a83a6",
    },

    "task.completed": {
      icon: "check",

      title: "Tarefa concluída",

      cat: "Atividades",

      color: "#4f9c76",
    },
  }

  const view = views[event.type] ?? {
    icon: "record",

    title: event.type,

    cat: "Check-ins",

    color: "#6d8179",
  }

  return {
    ...view,
    createdAt: event.createdAt,
    meta: `${new Date(event.createdAt).toLocaleString("pt-BR")} · ${JSON.stringify(event.payload)}`,
  }
}

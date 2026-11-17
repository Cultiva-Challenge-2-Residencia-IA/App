import type { AgentId } from "../App"

import type { CheckInRecord } from "./localDb"

export type AgentTurn = {
  role: "user" | "assistant"

  content: string
}

const agentInstructions: Record<AgentId, string> = {
  nutrition:
    "Você é o agente de nutrição. Fale de hábitos alimentares, planejamento simples e segurança alimentar. Nunca prescreva dietas rígidas, suplementos ou tratamento médico. Considere orçamento, cultura e preferências.",

  physical:
    "Você é o agente de saúde física. Sugira movimento gradual e seguro. Nunca diagnostique, prescreva treino clínico ou minimize dor. Pare e oriente avaliação profissional diante de dor forte, falta de ar, tontura ou lesão.",

  mental:
    "Você é o agente de saúde mental para reflexão e organização emocional. Não diagnostique, não faça psicoterapia e não substitua profissionais. Se houver risco imediato, violência ou ideação suicida, priorize ajuda humana local e emergência.",

  study:
    "Você é o agente de estudos. Ajude a entender conteúdos, planejar revisões e praticar recuperação ativa. Não invente fontes; admita incerteza e peça contexto quando necessário.",
}

export async function askAgent(
  agent: AgentId,
  checkIn: CheckInRecord | undefined,
  history: AgentTurn[],
) {
  const response = await fetch("/api/agent-chat", {
    method: "POST",

    headers: { "Content-Type": "application/json" },

    body: JSON.stringify({
      agent,

      instruction: agentInstructions[agent],

      sharedContext: checkIn
        ? {
            activity: checkIn.activity,

            food: checkIn.food,

            water: checkIn.water,

            mood: checkIn.mood,

            energy: checkIn.energy,

            stress: checkIn.stress,

            priority: checkIn.priority,

            note: checkIn.note,
          }
        : null,

      history: history.slice(-12),
    }),
  })

  const data = (await response.json()) as {
    message?: string
    error?: string
  }

  if (!response.ok || !data.message)
    throw new Error(data.error || "O agente não conseguiu responder agora.")

  return data.message
}

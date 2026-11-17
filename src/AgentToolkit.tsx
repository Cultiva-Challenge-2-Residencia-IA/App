import { CSSProperties, useEffect, useState } from "react"
import type { AgentId } from "./App"
import { listEvents, saveEvent } from "./lib/localDb"
import { sumWater } from "./lib/eventProjection"

type Props = {
  agent: AgentId
  color: string
  soft: string
  onPrompt: (prompt: string) => void
  userId: string
  onEvent: () => void
}

const toolContent = {
  nutrition: {
    eyebrow: "VISÃO DE HOJE",
    title: "Alimentação com equilíbrio",
    description: "2 de 4 refeições registradas",
  },
  physical: {
    eyebrow: "PLANO DE MOVIMENTO",
    title: "Mobilidade e disposição",
    description: "12 minutos planejados para hoje",
  },
  mental: {
    eyebrow: "PAUSA DE CUIDADO",
    title: "Um espaço sem julgamentos",
    description: "Exercícios breves para o momento presente",
  },
  study: {
    eyebrow: "TRILHA DE APRENDIZADO",
    title: "Biologia · Fotossíntese",
    description: "Revisão agendada para hoje",
  },
}

export function AgentToolkit({
  agent,
  color,
  soft,
  onPrompt,
  userId,
  onEvent,
}: Props) {
  const [water, setWater] = useState(() => 0)
  const [exerciseDone, setExerciseDone] = useState(false)
  const [breathing, setBreathing] = useState(false)
  const [seconds, setSeconds] = useState(30)
  const [privateNote, setPrivateNote] = useState("")
  const [card, setCard] = useState(0)
  const [known, setKnown] = useState(0)
  const content = toolContent[agent]

  useEffect(() => {
    if (!userId) return
    void listEvents(userId).then((events) => {
      setWater(sumWater(events))
      setExerciseDone(
        events.some(
          (event) =>
            event.type === "exercise.completed" &&
            event.payload.exercise === "mobilidade-coluna",
        ),
      )
    })
  }, [userId])

  useEffect(() => {
    if (!breathing) return
    if (seconds <= 0) {
      setBreathing(false)
      return
    }
    const timer = window.setTimeout(
      () => setSeconds((value) => value - 1),
      1000,
    )
    return () => window.clearTimeout(timer)
  }, [breathing, seconds])

  return (
    <section
      className={`agent-toolkit toolkit-${agent}`}
      style={{ "--agent": color, "--agent-soft": soft } as CSSProperties}
    >
      <div className="toolkit-heading">
        <div>
          <span>{content.eyebrow}</span>
          <h3>{content.title}</h3>
          <p>{content.description}</p>
        </div>
        <button
          onClick={() =>
            onPrompt(
              agent === "study"
                ? "Crie um plano de revisão para esta matéria"
                : "Quero uma orientação personalizada para hoje",
            )
          }
        >
          Pedir orientação
        </button>
      </div>

      {agent === "nutrition" && (
        <div className="nutrition-tool">
          <div
            className="visual-plate"
            aria-label="Composição visual sugerida para o prato"
          >
            <i className="plate-veg">
              <span>½</span> vegetais
            </i>
            <i className="plate-carb">
              <span>¼</span> carboidratos
            </i>
            <i className="plate-protein">
              <span>¼</span> proteínas
            </i>
          </div>
          <div className="tool-list">
            <button onClick={() => onPrompt("Quero registrar meu almoço")}>
              <span>12:30</span>
              <strong>Registrar almoço</strong>
              <small>Use a foto ou descreva a refeição</small>
            </button>
            <div className="water-action">
              <span>Água</span>
              <strong>{water} de 8 copos</strong>
              <button
                aria-label="Adicionar um copo de água"
                onClick={() => {
                  const next = Math.min(8, water + 1)
                  setWater(next)
                  void saveEvent({
                    userId,
                    type: "water.logged",
                    payload: { amount: 1, source: "agent-toolkit" },
                  }).then(onEvent)
                }}
              >
                +
              </button>
            </div>
          </div>
        </div>
      )}

      {agent === "physical" && (
        <div className="physical-tool">
          <button
            className={`exercise-card ${exerciseDone ? "complete" : ""}`}
            onClick={() => {
              const next = !exerciseDone
              setExerciseDone(next)
              void saveEvent({
                userId,
                type: next ? "exercise.completed" : "exercise.uncompleted",
                payload: { exercise: "mobilidade-coluna" },
              }).then(onEvent)
            }}
          >
            <span className="exercise-visual">03:00</span>
            <span>
              <strong>Mobilidade para coluna</strong>
              <small>3 exercícios · nível leve</small>
            </span>
            <b>{exerciseDone ? "Concluído" : "Começar"}</b>
          </button>
          <button
            className="session-task"
            onClick={() =>
              onPrompt(
                "Ajude-me com a tarefa entre sessões: caminhada de 20 minutos",
              )
            }
          >
            <span>Tarefa entre sessões</span>
            <strong>Caminhada de 20 minutos</strong>
            <small>Prazo: hoje · orientação do fisioterapeuta</small>
          </button>
        </div>
      )}

      {agent === "mental" && (
        <div className="mental-tool">
          <div className="breathing-card">
            <div
              className={breathing ? "breathing-orb active" : "breathing-orb"}
            >
              <span>{breathing ? seconds : "2 min"}</span>
            </div>
            <div>
              <strong>Pausa de respiração</strong>
              <small>
                {breathing
                  ? "Inspire pelo nariz e solte o ar devagar"
                  : "Um exercício simples para desacelerar"}
              </small>
            </div>
            <button
              onClick={() => {
                setSeconds(30)
                setBreathing(!breathing)
              }}
            >
              {breathing ? "Pausar" : "Iniciar"}
            </button>
          </div>
          <label className="pre-session-note">
            <span>
              Anotação pré-sessão <small>privada</small>
            </span>
            <textarea
              value={privateNote}
              onChange={(event) => {
                setPrivateNote(event.target.value)
                void saveEvent({
                  userId,
                  type: "private-note.updated",
                  payload: { note: event.target.value },
                }).then(onEvent)
              }}
              placeholder="O que você gostaria de levar para sua próxima sessão?"
              rows={2}
            />
          </label>
          <p className="mental-boundary">
            Este espaço apoia sua reflexão, sem diagnósticos e sem substituir
            cuidado profissional.
          </p>
        </div>
      )}

      {agent === "study" && (
        <div className="study-tool">
          <div className="review-info">
            <span>Revisão de hoje</span>
            <strong>3 de 8 cartões</strong>
            <div>
              <i
                style={{
                  width: `${Math.max(12, ((card + known) / 8) * 100)}%`,
                }}
              />
            </div>
          </div>
          <div className="flashcard">
            <span>FLASHCARD {Math.min(card + known + 1, 8)} DE 8</span>
            <h4>
              {card % 2 === 0
                ? "Qual é a função da clorofila?"
                : "Onde acontece a fase luminosa?"}
            </h4>
            <p>
              {card % 2 === 0
                ? "Pigmento que absorve energia luminosa para a fotossíntese."
                : "Nas membranas dos tilacoides, dentro dos cloroplastos."}
            </p>
            <div>
              <button
                onClick={() => {
                  setCard((value) => value + 1)
                  void saveEvent({
                    userId,
                    type: "flashcard.reviewed",
                    payload: { known: false, topic: "fotossíntese" },
                  }).then(onEvent)
                }}
              >
                Não sei
              </button>
              <button
                onClick={() => {
                  setKnown((value) => value + 1)
                  setCard((value) => value + 1)
                  void saveEvent({
                    userId,
                    type: "flashcard.reviewed",
                    payload: { known: true, topic: "fotossíntese" },
                  }).then(onEvent)
                }}
              >
                Já sei
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

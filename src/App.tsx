import {
  FormEvent,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { AgentToolkit } from "./AgentToolkit"
import { askAgent } from "./lib/agentApi"
import { validateCheckIn } from "./lib/validation"
import {
  getLatestCheckIn,
  getPreferences,
  deleteAgentNote,
  deleteAccount,
  deleteAgentMessages,
  deleteAllUserData,
  listAgentMessages,
  listAgentNotes,
  loginAccount,
  registerAccount,
  saveCheckIn,
  saveAgentMessage,
  saveAgentNote,
  savePreference,
  saveEvent,
  saveTask,
  listTasks,
  type LocalTask,
  type CheckInRecord,
} from "./lib/localDb"

type Page = "today" | "agents" | "records" | "profile"
export type AgentId = "nutrition" | "physical" | "mental" | "study"
type AgentTab = "chat" | "notes" | "scanner" | "settings"

function usePersistentState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(key)
      return saved ? JSON.parse(saved) as T : initial
    } catch {
      return initial
    }
  })
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value))
  }, [key, value])
  return [value, setValue] as const
}

const icons: Record<string, ReactNode> = {
  home: (
    <>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10v10h13V10M9.5 20v-6h5v6" />
    </>
  ),
  spark: (
    <>
      <path d="m12 3 1.3 4.1L17 9l-3.7 1.9L12 15l-1.3-4.1L7 9l3.7-1.9L12 3Z" />
      <path d="m19 15 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7L19 15Z" />
    </>
  ),
  record: (
    <>
      <path d="M6 3h12v18H6z" />
      <path d="M9 8h6M9 12h6M9 16h4" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  arrow: <path d="m9 18 6-6-6-6" />,
  leaf: (
    <>
      <path d="M5 20c6 0 13-5 14-15C9 6 4 11 5 20Z" />
      <path d="M5 20c2-5 6-8 11-11" />
    </>
  ),
  activity: (
    <>
      <path d="M3 12h4l2-6 4 12 2-6h6" />
      <circle cx="12" cy="12" r="9" />
    </>
  ),
  heart: (
    <path d="M20.8 5.6a5.5 5.5 0 0 0-7.8 0L12 6.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 22l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />
  ),
  book: (
    <>
      <path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H11v17H7.5A3.5 3.5 0 0 0 4 22V5.5ZM20 5.5A3.5 3.5 0 0 0 16.5 2H13v17h3.5A3.5 3.5 0 0 1 20 22V5.5Z" />
    </>
  ),
  water: <path d="M12 2S5 10.1 5 15a7 7 0 0 0 14 0c0-4.9-7-13-7-13Z" />,
  utensils: (
    <>
      <path d="M7 3v7M4 3v5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V3M7 10v11M17 3v18M17 3c-3 3-3 8 0 9" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  message: <path d="M21 12a8 8 0 0 1-8 8H5l-3 2 1-5a9 9 0 1 1 18-5Z" />,
  note: (
    <>
      <path d="M5 3h14v18H5z" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </>
  ),
  scan: (
    <>
      <path d="M8 3H4a1 1 0 0 0-1 1v4M16 3h4a1 1 0 0 1 1 1v4M8 21H4a1 1 0 0 1-1-1v-4M16 21h4a1 1 0 0 0 1-1v-4" />
      <path d="M7 12h10" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
    </>
  ),
  send: (
    <>
      <path d="m22 2-7 20-4-9-9-4 20-7Z" />
      <path d="M22 2 11 13" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6" />
    </>
  ),
  edit: (
    <>
      <path d="m4 20 4.5-1 10-10-3.5-3.5-10 10L4 20Z" />
      <path d="m13.5 6.5 3.5 3.5" />
    </>
  ),
  camera: (
    <>
      <path d="M4 7h3l1.5-2h7L17 7h3v12H4z" />
      <circle cx="12" cy="13" r="4" />
    </>
  ),
  calendar: (
    <>
      <path d="M4 5h16v16H4zM8 3v4M16 3v4M4 10h16" />
    </>
  ),
  shield: (
    <>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
    </>
  ),
  filter: <path d="M4 5h16M7 12h10M10 19h4" />,
  play: <path d="m8 5 11 7-11 7V5Z" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
}

function Icon({
  name,
  size = 20,
}: {
  name: string
  size?: number
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {icons[name]}
    </svg>
  )
}

const agents = {
  nutrition: {
    name: "Nutrição",
    icon: "leaf",
    color: "#4f9c76",
    soft: "#e9f5ee",
    intro: "Hábitos alimentares sem culpa e com mais consciência.",
    prompt: "Como posso montar um almoço mais equilibrado hoje?",
  },
  physical: {
    name: "Saúde física",
    icon: "activity",
    color: "#3a83a6",
    soft: "#e7f3f8",
    intro: "Movimento, exercícios e cuidado com o seu corpo.",
    prompt: "Quero uma sequência rápida para alongar as costas.",
  },
  mental: {
    name: "Saúde mental",
    icon: "heart",
    color: "#8175b7",
    soft: "#f0edfa",
    intro: "Espaço de reflexão, pausas e autoconhecimento.",
    prompt: "Estou com a mente acelerada. Pode me guiar em uma pausa?",
  },
  study: {
    name: "Estudos",
    icon: "book",
    color: "#c47a57",
    soft: "#fbefe9",
    intro: "Aprendizado guiado, revisões e constância.",
    prompt: "Quero revisar fotossíntese com flashcards.",
  },
} satisfies Record<AgentId, {
  name: string
  icon: string
  color: string
  soft: string
  intro: string
  prompt: string
}>

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="logo">
      <div className="logo-mark">
        <Icon name="leaf" size={21} />
      </div>
      {!compact && <span>CULTIVA</span>}
    </div>
  )
}

function Button({
  children,
  variant = "primary",
  onClick,
  type = "button",
  disabled = false,
  className = "",
}: {
  children: ReactNode
  variant?: "primary" | "secondary" | "ghost"
  onClick?: () => void
  type?: "button" | "submit"
  disabled?: boolean
  className?: string
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`btn btn-${variant} ${className}`}
    >
      {children}
    </button>
  )
}

function Onboarding({
  onFinish,
}: {
  onFinish: (name: string, email?: string, password?: string) => void
}) {
  const [step, setStep] = useState(0)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [consent, setConsent] = useState(false)
  const next = () => setStep((s) => Math.min(3, s + 1))
  return (
    <main className="onboarding">
      <section className="onboard-visual">
        <Logo />
        <div className="grow-illustration">
          <div className="orbit orbit-a">
            <span>
              <Icon name="book" />
            </span>
          </div>
          <div className="orbit orbit-b">
            <span>
              <Icon name="heart" />
            </span>
          </div>
          <div className="plant-pot"></div>
          <div className="stem"></div>
          <div className="plant-leaf l1"></div>
          <div className="plant-leaf l2"></div>
          <div className="plant-leaf l3"></div>
        </div>
        <div className="visual-copy">
          <p>Um espaço para cultivar</p>
          <h2>
            hábitos que combinam
            <br />
            com a sua vida.
          </h2>
        </div>
      </section>
      <section className="onboard-content">
        <div className="onboard-mobile-logo">
          <Logo />
        </div>
        <div className="steps">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={i <= step ? "active" : ""} />
          ))}
        </div>
        {step === 0 && (
          <div className="step-panel">
            <span className="eyebrow">BEM-VINDO AO CULTIVA</span>
            <h1>Seu cuidado, no seu ritmo.</h1>
            <p className="lead">
              Organize sua rotina, cuide de você e aprenda algo novo com quatro
              agentes que caminham ao seu lado.
            </p>
            <div className="mini-agents">
              {Object.entries(agents).map(([id, a]) => (
                <div key={id}>
                  <span style={{ background: a.soft, color: a.color }}>
                    <Icon name={a.icon} />
                  </span>
                  <small>{a.name}</small>
                </div>
              ))}
            </div>
            <Button onClick={next}>
              Começar agora <Icon name="arrow" size={17} />
            </Button>
            <p className="safe-note">
              Crie sua conta para começar. Seus dados ficam neste dispositivo.
            </p>
          </div>
        )}
        {step === 1 && (
          <form
            className="step-panel"
            onSubmit={(e) => {
              e.preventDefault()
              next()
            }}
          >
            <span className="eyebrow">CONTE SOBRE VOCÊ</span>
            <h1>Vamos nos conhecer?</h1>
            <p className="lead small">
              Você poderá alterar esses dados depois.
            </p>
            <div className="form-grid">
              <label>
                Nome completo
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Como você se chama?"
                />
              </label>
              <label>
                Apelido
                <input placeholder="Como prefere ser chamado?" />
              </label>
              <label>
                Gênero
                <select defaultValue="">
                  <option value="" disabled>
                    Selecione
                  </option>
                  <option>Feminino</option>
                  <option>Masculino</option>
                  <option>Não binário</option>
                  <option>Prefiro não informar</option>
                </select>
              </label>
              <label>
                E-mail
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@email.com"
                />
              </label>
              <label className="full">
                Senha
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo de 6 caracteres"
                />
              </label>
            </div>
            <Button type="submit">
              Continuar <Icon name="arrow" size={17} />
            </Button>
          </form>
        )}
        {step === 2 && (
          <div className="step-panel">
            <span className="eyebrow">ANTES DE SEGUIR</span>
            <h1>Cuidado com transparência.</h1>
            <div className="consent-card">
              <Icon name="shield" size={25} />
              <div>
                <strong>Seus dados são seus</strong>
                <p>
                  Usamos suas informações apenas para personalizar sua
                  experiência neste protótipo.
                </p>
              </div>
            </div>
            <div className="consent-card blue">
              <Icon name="spark" size={25} />
              <div>
                <strong>A IA tem limites</strong>
                <p>
                  Os agentes apoiam sua organização, mas não fazem diagnósticos
                  nem substituem profissionais.
                </p>
              </div>
            </div>
            <label className="check-row">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />
              <span>
                Li e concordo com os termos, a política de privacidade e os
                limites de uso da IA.
              </span>
            </label>
            <Button disabled={!consent} onClick={next}>
              Concordar e continuar
            </Button>
          </div>
        )}
        {step === 3 && (
          <div className="step-panel">
            <span className="eyebrow">TUDO PRONTO</span>
            <h1>Comece pelo check-in.</h1>
            <p className="lead">
              Em poucos minutos, o CULTIVA entende como está o seu dia e
              organiza as próximas ações.
            </p>
            <div className="tutorial-list">
              <div>
                <span>1</span>
                <p>
                  <strong>Conte como você está</strong>
                  <small>Corpo, mente, agenda e notas livres.</small>
                </p>
              </div>
              <div>
                <span>2</span>
                <p>
                  <strong>Veja sua rotina em um só lugar</strong>
                  <small>Tarefas e lembretes priorizados.</small>
                </p>
              </div>
              <div>
                <span>3</span>
                <p>
                  <strong>Converse com seus agentes</strong>
                  <small>Orientações personalizadas para você.</small>
                </p>
              </div>
            </div>
            <Button
              onClick={() =>
                onFinish(
                  name.trim(),
                  email || undefined,
                  password || undefined,
                )
              }
            >
              Ir para minha Home <Icon name="arrow" size={17} />
            </Button>
          </div>
        )}
      </section>
    </main>
  )
}

function Navigation({
  page,
  setPage,
  name,
}: {
  page: Page
  setPage: (p: Page) => void
  name: string
}) {
  const items: Array<{
    id: Page
    label: string
    icon: string
  }> = [
    { id: "today", label: "Hoje", icon: "home" },
    { id: "agents", label: "Agentes", icon: "spark" },
    { id: "records", label: "Registros", icon: "record" },
    { id: "profile", label: "Perfil", icon: "user" },
  ]
  return (
    <>
      <aside className="sidebar">
        <Logo />
        <nav>
          {items.map((i) => (
            <button
              key={i.id}
              className={page === i.id ? "active" : ""}
              aria-current={page === i.id ? "page" : undefined}
              onClick={() => setPage(i.id)}
            >
              <Icon name={i.icon} />
              <span>{i.label}</span>
            </button>
          ))}
        </nav>
        <button className="side-support" onClick={() => setPage("profile")}>
          <span>
            <Icon name="heart" size={18} />
          </span>
          <p>
            <strong>Alertas e apoio</strong>
            <small>Encontre ajuda e contatos</small>
          </p>
          <Icon name="arrow" size={16} />
        </button>
        <button className="side-profile" onClick={() => setPage("profile")}>
          <div>{name.slice(0, 2).toUpperCase()}</div>
          <p>
            <strong>{name}</strong>
            <small>Meu perfil</small>
          </p>
          <Icon name="settings" size={18} />
        </button>
      </aside>
      <nav className="bottom-nav">
        {items.map((i) => (
          <button
            key={i.id}
            className={page === i.id ? "active" : ""}
            aria-current={page === i.id ? "page" : undefined}
            onClick={() => setPage(i.id)}
          >
            <Icon name={i.icon} />
            <span>{i.label}</span>
          </button>
        ))}
      </nav>
    </>
  )
}

function Header({
  title,
  subtitle,
}: {
  title: string
  subtitle?: string
}) {
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  return (
    <header className="topbar">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <div className="top-actions">
        <button
          aria-label="Notificações"
          aria-expanded={notificationsOpen}
          onClick={() => setNotificationsOpen(!notificationsOpen)}
        >
          <Icon name="bell" />
        </button>
        {notificationsOpen && (
          <div className="notification-popover">
            <strong>Notificações</strong>
            <p>Sua revisão de Biologia está pronta.</p>
            <p>Hora de beber um pouco de água.</p>
          </div>
        )}
        <div className="avatar">MS</div>
      </div>
    </header>
  )
}

function Modal({
  children,
  onClose,
  title,
}: {
  children: ReactNode
  onClose: () => void
  title: string
}) {
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h2>{title}</h2>
          <button onClick={onClose}>
            <Icon name="close" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function CheckIn({
  onClose,
  onComplete,
  userId,
}: {
  onClose: () => void
  onComplete: (record: Omit<CheckInRecord, "id" | "createdAt">) => void
  userId: string
}) {
  const [step, setStep] = useState(0)
  const [mood, setMood] = useState(3)
  const [water, setWater] = useState(4)
  const [activity, setActivity] = useState("Caminhada")
  const [food, setFood] = useState("Razoável")
  const [energy, setEnergy] = useState(3)
  const [stress, setStress] = useState(2)
  const [priority, setPriority] = useState("Finalizar apresentação do projeto")
  const [priorityTime, setPriorityTime] = useState("16:00")
  const [extraTask, setExtraTask] = useState(false)
  const [extraTaskText, setExtraTaskText] = useState("")
  const [note, setNote] = useState("")
  const titles = ["Físico", "Mental", "Agenda", "Adicionais", "Resumo"]
  return (
    <Modal title="Check-in de hoje" onClose={onClose}>
      <div className="check-progress">
        <div style={{ width: `${(step + 1) * 20}%` }} />
      </div>
      <div className="check-step-label">
        <span>ETAPA {Math.min(step + 1, 4)} DE 4</span>
        <strong>{titles[step]}</strong>
      </div>
      {step === 0 && (
        <div className="check-body">
          <h3>Como você cuidou do corpo?</h3>
          <label className="field-title">Atividade física</label>
          <div className="choice-grid">
            {["Não fiz", "Caminhada", "Treino", "Alongamento"].map((x) => (
              <button
                aria-pressed={activity === x}
                className={activity === x ? "active" : ""}
                onClick={() => setActivity(x)}
                key={x}
              >
                {x}
              </button>
            ))}
          </div>
          <label className="field-title">Alimentação</label>
          <div className="choice-grid three">
            {["Irregular", "Razoável", "Equilibrada"].map((x) => (
              <button
                aria-pressed={food === x}
                className={food === x ? "active" : ""}
                onClick={() => setFood(x)}
                key={x}
              >
                {x}
              </button>
            ))}
          </div>
          <label className="field-title">
            Copos de água <b>{water}</b>
          </label>
          <input
            type="range"
            min="0"
            max="10"
            value={water}
            onChange={(e) => setWater(+e.target.value)}
          />
        </div>
      )}
      {step === 1 && (
        <div className="check-body">
          <h3>Como está sua mente agora?</h3>
          <label className="field-title">Humor</label>
          <div className="mood-row">
            {["Muito baixo", "Baixo", "Neutro", "Bem", "Muito bem"].map(
              (x, i) => (
                <button
                  className={mood === i ? "active" : ""}
                  onClick={() => setMood(i)}
                  key={x}
                >
                  <span>{["—", "⌢", "•", "⌣", "◡"][i]}</span>
                  <small>{x}</small>
                </button>
              ),
            )}
          </div>
          <label className="field-title">Energia</label>
          <input
            type="range"
            min="1"
            max="5"
            value={energy}
            onChange={(event) => setEnergy(Number(event.target.value))}
          />
          <label className="field-title">Estresse</label>
          <input
            type="range"
            min="1"
            max="5"
            value={stress}
            onChange={(event) => setStress(Number(event.target.value))}
          />
          <p className="safe-note">
            Este registro ajuda na sua reflexão pessoal. Não é uma avaliação
            clínica.
          </p>
        </div>
      )}
      {step === 2 && (
        <div className="check-body">
          <h3>O que vem pela frente?</h3>
          <label className="input-label">
            Principal tarefa do dia
            <input
              value={priority}
              onChange={(event) => setPriority(event.target.value)}
            />
          </label>
          <label className="input-label">
            Horário
            <input
              type="time"
              value={priorityTime}
              onChange={(event) => setPriorityTime(event.target.value)}
            />
          </label>
          {extraTask && (
            <label className="input-label">
              Outra tarefa
              <input
                autoFocus
                value={extraTaskText}
                onChange={(event) => setExtraTaskText(event.target.value)}
                placeholder="Ex.: Comprar frutas"
              />
            </label>
          )}
          <button className="add-line" onClick={() => setExtraTask(!extraTask)}>
            <Icon name="plus" /> Adicionar outra tarefa
          </button>
        </div>
      )}
      {step === 3 && (
        <div className="check-body">
          <h3>Quer registrar mais alguma coisa?</h3>
          <label className="input-label">
            Anotação livre
            <textarea
              rows={5}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Uma intenção para o dia, algo que quer lembrar..."
            />
          </label>
          <p className="safe-note">
            <Icon name="shield" size={16} /> Suas anotações ficam privadas neste
            dispositivo.
          </p>
        </div>
      )}
      {step === 4 && (
        <div className="check-body summary">
          <div className="summary-check">
            <Icon name="check" size={30} />
          </div>
          <h3>Check-in concluído!</h3>
          <p>
            Seu dia está organizado. Você pode atualizar estas informações
            quando quiser.
          </p>
          <div className="summary-cards">
            <div>
              <span>Humor</span>
              <strong>Bem</strong>
            </div>
            <div>
              <span>Água</span>
              <strong>{water} copos</strong>
            </div>
            <div>
              <span>Prioridade</span>
              <strong>Apresentação</strong>
            </div>
          </div>
        </div>
      )}
      <div className="modal-footer">
        {step > 0 && step < 4 && (
          <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>
            Voltar
          </Button>
        )}
        <Button
          onClick={() => {
            if (step < 4) {
              setStep((s) => s + 1)
              return
            }
            const record = {
              userId,
              activity,
              food,
              water,
              mood,
              energy,
              stress,
              priority: priority.trim(),
              priorityTime,
              extraTask: extraTaskText.trim(),
              note: note.trim(),
            }
            try {
              validateCheckIn(record)
              onComplete(record)
            } catch (error) {
              window.alert(
                error instanceof Error
                  ? error.message
                  : "Revise os dados do check-in.",
              )
            }
          }}
        >
          {step === 3
            ? "Concluir check-in"
            : step === 4
              ? "Voltar para Home"
              : "Continuar"}
        </Button>
      </div>
    </Modal>
  )
}

function Today({
  name,
  tasks,
  setTasks,
  checkDone,
  setCheckDone,
  openAgent,
  goRecords,
  onCheckIn,
  userId,
}: {
  name: string
  tasks: LocalTask[]
  setTasks: (t: LocalTask[]) => void
  checkDone: boolean
  setCheckDone: (v: boolean) => void
  openAgent: (id: AgentId) => void
  goRecords: () => void
  onCheckIn: (record: Omit<CheckInRecord, "id" | "createdAt">) => Promise<void>
  userId: string
}) {
  const [showCheck, setShowCheck] = useState(false)
  const [showTask, setShowTask] = useState(false)
  const [taskLabel, setTaskLabel] = useState("")
  const [water, setWater] = usePersistentState("cultiva-water", 4)
  const done = tasks.filter((t) => t.done).length
  return (
    <>
      <Header
        title={`Olá, ${name}`}
        subtitle={new Intl.DateTimeFormat("pt-BR", {
          weekday: "long",
          day: "numeric",
          month: "long",
        }).format(new Date())}
      />
      <div className="page-content home-grid">
        <section className="hero-card">
          <div>
            <span className="eyebrow light">SEU DIA</span>
            <h2>{checkDone ? "Você começou bem." : "Como você está hoje?"}</h2>
            <p>
              {checkDone
                ? "Seu check-in está completo. Continue com pequenos passos."
                : "Faça seu check-in e organize corpo, mente e agenda em poucos minutos."}
            </p>
            <Button onClick={() => setShowCheck(true)}>
              {checkDone ? "Rever check-in" : "Fazer check-in"}{" "}
              <Icon name="arrow" size={17} />
            </Button>
          </div>
          <div className="progress-ring">
            <svg viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" />
              <circle
                className="value"
                cx="50"
                cy="50"
                r="42"
                style={{
                  strokeDashoffset: 264 - (264 * (checkDone ? 100 : 35)) / 100,
                }}
              />
            </svg>
            <strong>{checkDone ? "100" : "35"}%</strong>
            <small>do dia</small>
          </div>
        </section>
        <section className="section-block tasks-block">
          <div className="section-title">
            <div>
              <h2>Próximos passos</h2>
              <p>
                {done} de {tasks.length} concluídos
              </p>
            </div>
            <button onClick={() => setShowTask(true)}>
              <Icon name="plus" /> Nova tarefa
            </button>
          </div>
          <div className="task-list">
            {tasks.map((t) => (
              <button
                key={t.id}
                className={`task ${t.done ? "done" : ""}`}
                onClick={() =>
                  setTasks(
                    tasks.map((x) =>
                      x.id === t.id ? { ...x, done: !x.done } : x,
                    ),
                  )
                }
              >
                <span className="task-check">
                  {t.done && <Icon name="check" size={15} />}
                </span>
                <span>
                  <strong>{t.label}</strong>
                  <small>{t.meta}</small>
                </span>
                <Icon name="arrow" size={16} />
              </button>
            ))}
          </div>
        </section>
        <aside className="reminders">
          <div className="section-title">
            <h2>Lembretes</h2>
            <button onClick={goRecords}>Ver todos</button>
          </div>
          <div className="reminder blue">
            <span>
              <Icon name="water" />
            </span>
            <div>
              <strong>Hidrate-se</strong>
              <small>{water} de 8 copos hoje</small>
              <div className="tiny-progress">
                <i style={{ width: `${(water / 8) * 100}%` }} />
              </div>
            </div>
            <button
              aria-label="Adicionar um copo de água"
              onClick={() => setWater(Math.min(8, water + 1))}
            >
              +
            </button>
          </div>
          <div className="reminder peach">
            <span>
              <Icon name="clock" />
            </span>
            <div>
              <strong>Pausa consciente</strong>
              <small>2 minutos · 14:30</small>
            </div>
            <Icon name="arrow" size={16} />
          </div>
        </aside>
        <section className="agents-home">
          <div className="section-title">
            <div>
              <h2>Seus agentes</h2>
              <p>Apoio para cada parte da sua rotina</p>
            </div>
            <button onClick={() => openAgent("nutrition")}>Ver todos</button>
          </div>
          <div className="agent-grid">
            {Object.entries(agents).map(([id, a]) => (
              <button
                className="agent-card"
                key={id}
                onClick={() => openAgent(id as AgentId)}
              >
                <span
                  className="agent-icon"
                  style={{ background: a.soft, color: a.color }}
                >
                  <Icon name={a.icon} size={23} />
                </span>
                <div>
                  <h3>{a.name}</h3>
                  <p>{a.intro}</p>
                  <small style={{ color: a.color }}>
                    Conversar agora <Icon name="arrow" size={14} />
                  </small>
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>
      {showCheck && (
        <CheckIn
          onClose={() => setShowCheck(false)}
          userId={userId}
          onComplete={(record) => {
            void onCheckIn(record)
              .then(() => {
                setCheckDone(true)
                setShowCheck(false)
              })
              .catch((error) => {
                window.alert(
                  error instanceof Error
                    ? error.message
                    : "Não foi possível salvar o check-in.",
                )
              })
          }}
        />
      )}
      {showTask && (
        <Modal title="Nova tarefa" onClose={() => setShowTask(false)}>
          <form
            className="quick-form"
            onSubmit={(event) => {
              event.preventDefault()
              if (!taskLabel.trim()) return
              setTasks([
                ...tasks,
                {
                  id: crypto.randomUUID(),
                  userId,
                  label: taskLabel,
                  meta: "Pessoal · Hoje",
                  done: false,
                  createdAt: new Date().toISOString(),
                },
              ])
              setTaskLabel("")
              setShowTask(false)
            }}
          >
            <label className="input-label">
              O que você quer fazer?
              <input
                autoFocus
                value={taskLabel}
                onChange={(event) => setTaskLabel(event.target.value)}
                placeholder="Ex.: Separar materiais de estudo"
              />
            </label>
            <label className="input-label">
              Quando?
              <select defaultValue="Hoje">
                <option>Hoje</option>
                <option>Amanhã</option>
                <option>Esta semana</option>
              </select>
            </label>
            <div className="modal-footer">
              <Button variant="ghost" onClick={() => setShowTask(false)}>
                Cancelar
              </Button>
              <Button type="submit">Adicionar tarefa</Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}

type AgentMessage = {
  from: "agent" | "user"
  text: string
}
type AgentNote = {
  id: string
  title: string
  body: string
  date: string
}

function AgentsPage({
  selected,
  setSelected,
  userName,
  checkIn,
  userId,
}: {
  selected: AgentId
  setSelected: (id: AgentId) => void
  userName: string
  checkIn?: CheckInRecord
  userId: string
}) {
  const [tab, setTab] = usePersistentState<AgentTab>(
    "cultiva-agent-tab",
    "chat",
  )
  const [message, setMessage] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [chatError, setChatError] = useState("")
  const [messagesByAgent, setMessagesByAgent] =
    useState<Record<AgentId, AgentMessage[]>>({
      nutrition: [],
      physical: [],
      mental: [],
      study: [],
    })
  const [notesByAgent, setNotesByAgent] =
    useState<Record<AgentId, AgentNote[]>>({
      nutrition: [],
      physical: [],
      mental: [],
      study: [],
    })
  const messages = messagesByAgent[selected]
  const notes = notesByAgent[selected]
  useEffect(() => {
    if (!userId) return
    void Promise.all([
      listAgentMessages(userId, selected),
      listAgentNotes(userId, selected),
    ])
      .then(([storedMessages, storedNotes]) => {
        setMessagesByAgent((current) => ({
          ...current,
          [selected]: storedMessages.map(({ from, text }) => ({ from, text })),
        }))
        setNotesByAgent((current) => ({
          ...current,
          [selected]: storedNotes.map((note) => ({
            id: note.id,
            title: note.title,
            body: note.body,
            date: new Date(note.createdAt).toLocaleString("pt-BR"),
          })),
        }))
      })
      .catch(() => undefined)
  }, [selected, userId])
  const [remindersEnabled, setRemindersEnabled] = useState(true)
  const [conversationTone, setConversationTone] = useState("Acolhedor e direto")
  const [useHistory, setUseHistory] = useState(true)
  useEffect(() => {
    if (!userId) return
    void getPreferences(userId).then((preferences) => {
      const values = new Map(preferences.map((item) => [item.key, item.value]))
      if (typeof values.get("reminders") === "boolean")
        setRemindersEnabled(values.get("reminders") as boolean)
      if (typeof values.get("tone") === "string")
        setConversationTone(values.get("tone") as string)
      if (typeof values.get("history") === "boolean")
        setUseHistory(values.get("history") as boolean)
    })
  }, [userId])
  const setMessages = (
    updater: AgentMessage[] | ((current: AgentMessage[]) => AgentMessage[]),
  ) =>
    setMessagesByAgent((current) => ({
      ...current,
      [selected]:
        typeof updater === "function"
          ? updater(current[selected] || [])
          : updater,
    }))
  const setNotes = (
    updater: AgentNote[] | ((current: AgentNote[]) => AgentNote[]),
  ) =>
    setNotesByAgent((current) => ({
      ...current,
      [selected]:
        typeof updater === "function"
          ? updater(current[selected] || [])
          : updater,
    }))
  const [newNote, setNewNote] = useState(false)
  const [noteTitle, setNoteTitle] = useState("")
  const [noteBody, setNoteBody] = useState("")
  const [editingNote, setEditingNote] = useState<string | null>(null)
  const [noteSearch, setNoteSearch] = useState("")
  const [scanStage, setScanStage] = useState(0)
  const [scanFile, setScanFile] = useState<File>()
  const [scanTitle, setScanTitle] = useState("")
  const [scanDetails, setScanDetails] = useState("")
  const scanInputRef = useRef<HTMLInputElement>(null)
  const agent = agents[selected]
  const send = async (e: FormEvent) => {
    e.preventDefault()
    if (!message.trim() || isSending) return
    const text = message
    setMessages((m) => [...m, { from: "user", text }])
    void saveAgentMessage({ userId, agent: selected, from: "user", text })
    setMessage("")
    setIsSending(true)
    setChatError("")
    try {
      const reply = await askAgent(selected, userName, checkIn, [
        ...messages.map((item) => ({
          role: item.from === "user" ? "user" as const : "assistant" as const,
          content: item.text,
        })),
        { role: "user", content: text },
      ])
      setMessages((m) => [...m, { from: "agent", text: reply }])
      void saveAgentMessage({
        userId,
        agent: selected,
        from: "agent",
        text: reply,
      })
    } catch (error) {
      setChatError(
        error instanceof Error ? error.message : "Não foi possível responder.",
      )
    } finally {
      setIsSending(false)
    }
  }
  const tabs: Array<{
    id: AgentTab
    label: string
    icon: string
  }> = [
    { id: "chat", label: "Conversa", icon: "message" },
    { id: "notes", label: "Anotações", icon: "note" },
    { id: "scanner", label: "Scanner", icon: "scan" },
    { id: "settings", label: "Configurações", icon: "settings" },
  ]
  return (
    <>
      <Header title="Agentes" subtitle="Escolha uma área para cuidar agora" />
      <div className="agent-layout">
        <aside className="agent-selector">
          {Object.entries(agents).map(([id, a]) => (
            <button
              key={id}
              className={selected === id ? "active" : ""}
              aria-pressed={selected === id}
              onClick={() => {
                setSelected(id as AgentId)
                setTab("chat")
              }}
            >
              <span style={{ background: a.soft, color: a.color }}>
                <Icon name={a.icon} />
              </span>
              <div>
                <strong>{a.name}</strong>
                <small>{a.intro.split(".")[0]}</small>
              </div>
              <Icon name="arrow" size={16} />
            </button>
          ))}
        </aside>
        <section className="agent-workspace">
          <div className="agent-head">
            <div className="agent-title">
              <span style={{ background: agent.soft, color: agent.color }}>
                <Icon name={agent.icon} size={25} />
              </span>
              <div>
                <h2>{agent.name}</h2>
                <p>{agent.intro}</p>
              </div>
            </div>
            <div className="status">
              <i /> Disponível
            </div>
          </div>
          <div className="tabs" role="tablist">
            {tabs.map((t) => (
              <button
                className={tab === t.id ? "active" : ""}
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                key={t.id}
              >
                <Icon name={t.icon} />
                {t.label}
              </button>
            ))}
          </div>
          {tab === "chat" && (
            <div className="chat-panel">
              <div className="messages">
                <AgentToolkit
                  agent={selected}
                  color={agent.color}
                  soft={agent.soft}
                  onPrompt={setMessage}
                />
                <div className="date-divider">Hoje</div>
                {messages.map((m, i) => (
                  <div key={i} className={`bubble ${m.from}`}>
                    <p>{m.text}</p>
                    <small>{m.from === "user" ? "10:42" : "10:41"}</small>
                  </div>
                ))}
                {isSending && (
                  <div className="bubble agent">
                    <p>Estou pensando com base no seu check-in...</p>
                  </div>
                )}
                {chatError && <p className="safe-note">{chatError}</p>}
                {messages.length === 1 && (
                  <div className="suggestions">
                    <span>Sugestões</span>
                    <button onClick={() => setMessage(agent.prompt)}>
                      {agent.prompt}
                    </button>
                    {selected === "study" && (
                      <button
                        onClick={() =>
                          setMessage("Quero praticar flashcards agora")
                        }
                      >
                        Praticar flashcards
                      </button>
                    )}
                    {selected === "physical" && (
                      <button
                        onClick={() =>
                          setMessage("Mostrar exercícios com vídeo")
                        }
                      >
                        Exercícios guiados
                      </button>
                    )}
                  </div>
                )}
              </div>
              <form className="chat-input" onSubmit={send}>
                <button
                  type="button"
                  aria-label="Abrir scanner para anexar"
                  onClick={() => setTab("scanner")}
                >
                  <Icon name="plus" />
                </button>
                <input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={`Mensagem para ${agent.name}...`}
                  aria-label={`Mensagem para ${agent.name}`}
                />
                <button
                  className="send"
                  type="submit"
                  disabled={isSending || !message.trim()}
                  aria-label="Enviar mensagem"
                >
                  <Icon name="send" />
                </button>
              </form>
              {selected === "mental" && (
                <p className="chat-disclaimer">
                  Este agente não faz diagnósticos nem substitui acompanhamento
                  profissional.
                </p>
              )}
            </div>
          )}
          {tab === "notes" && (
            <div className="notes-panel">
              <div className="panel-toolbar">
                <label>
                  <Icon name="search" />
                  <input
                    value={noteSearch}
                    onChange={(event) => setNoteSearch(event.target.value)}
                    placeholder="Buscar anotações..."
                  />
                </label>
                <Button onClick={() => setNewNote(true)}>
                  <Icon name="plus" /> Nova anotação
                </Button>
              </div>
              {newNote && (
                <div className="note-editor">
                  <input
                    value={noteTitle}
                    onChange={(event) => setNoteTitle(event.target.value)}
                    placeholder="Título da anotação"
                  />
                  <textarea
                    value={noteBody}
                    onChange={(event) => setNoteBody(event.target.value)}
                    autoFocus
                    placeholder="Escreva aqui..."
                    rows={4}
                  />
                  <div>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setNewNote(false)
                        setEditingNote(null)
                        setNoteTitle("")
                        setNoteBody("")
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={() => {
                        if (!noteTitle.trim() || !noteBody.trim()) return
                        if (editingNote) {
                          const updated = {
                            id: editingNote,
                            userId,
                            agent: selected,
                            title: noteTitle.trim(),
                            body: noteBody.trim(),
                          }
                          void saveAgentNote(updated)
                          setNotes(
                            notes.map((note) =>
                              note.id === editingNote
                                ? {
                                    ...note,
                                    title: updated.title,
                                    body: updated.body,
                                    date: new Date().toLocaleString("pt-BR"),
                                  }
                                : note,
                            ),
                          )
                        } else {
                          const id = crypto.randomUUID()
                          const created = {
                            id,
                            userId,
                            agent: selected,
                            title: noteTitle.trim(),
                            body: noteBody.trim(),
                          }
                          void saveAgentNote(created)
                          setNotes([
                            {
                              id,
                              title: created.title,
                              body: created.body,
                              date: new Date().toLocaleString("pt-BR"),
                            },
                            ...notes,
                          ])
                        }
                        setNoteTitle("")
                        setNoteBody("")
                        setEditingNote(null)
                        setNewNote(false)
                      }}
                    >
                      Salvar
                    </Button>
                  </div>
                </div>
              )}
              <div className="notes-grid">
                {notes
                  .filter((note) =>
                    `${note.title} ${note.body}`
                      .toLowerCase()
                      .includes(noteSearch.toLowerCase()),
                  )
                  .map((n) => (
                    <article key={n.id}>
                      <div className="note-top">
                        <span
                          style={{ background: agent.soft, color: agent.color }}
                        >
                          <Icon name="note" />
                        </span>
                        <div>
                          <button
                            aria-label={`Editar ${n.title}`}
                            onClick={() => {
                              setNoteTitle(n.title)
                              setNoteBody(n.body)
                              setEditingNote(n.id)
                              setNewNote(true)
                            }}
                          >
                            <Icon name="edit" size={17} />
                          </button>
                          <button
                            aria-label={`Excluir ${n.title}`}
                            onClick={() =>
                              void deleteAgentNote(n.id).then(() =>
                                setNotes(notes.filter((x) => x.id !== n.id)),
                              )
                            }
                          >
                            <Icon name="trash" size={17} />
                          </button>
                        </div>
                      </div>
                      <h3>{n.title}</h3>
                      <p>{n.body}</p>
                      <small>{n.date}</small>
                    </article>
                  ))}
              </div>
            </div>
          )}
          {tab === "scanner" && (
            <div className="scanner-panel">
              {scanStage === 0 && (
                <>
                  <div className="scan-drop">
                    <span>
                      <Icon name="camera" size={31} />
                    </span>
                    <h3>Digitalize ou envie uma imagem</h3>
                    <p>
                      {selected === "nutrition"
                        ? "Cardápios, rótulos e registros de refeições."
                        : "Materiais e anotações para organizar com o agente."}
                    </p>
                    <div>
                      <input
                        ref={scanInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        hidden
                        onChange={(event) => {
                          const file = event.target.files?.[0]
                          if (!file) return
                          setScanFile(file)
                          setScanTitle(file.name.replace(/\.[^.]+$/, ""))
                          setScanDetails("")
                          setScanStage(1)
                        }}
                      />
                      <Button onClick={() => scanInputRef.current?.click()}>
                        <Icon name="camera" /> Usar câmera
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => scanInputRef.current?.click()}
                      >
                        Enviar arquivo
                      </Button>
                    </div>
                  </div>
                  <p className="safe-note">
                    <Icon name="shield" size={16} /> O arquivo é lido
                    localmente. Revise o texto antes de salvar.
                  </p>
                </>
              )}
              {scanStage === 1 && (
                <div className="scan-result">
                  <div className="fake-image">
                    {scanFile ? (
                      <img
                        src={URL.createObjectURL(scanFile)}
                        alt="Pré-visualização do arquivo selecionado"
                      />
                    ) : (
                      <Icon name="camera" size={42} />
                    )}
                    <span>{scanFile?.name || "arquivo selecionado"}</span>
                  </div>
                  <div>
                    <span className="eyebrow">LEITURA CONCLUÍDA</span>
                    <h3>
                      {selected === "nutrition"
                        ? "Refeição identificada"
                        : "Conteúdo identificado"}
                    </h3>
                    <label className="input-label">
                      Título
                      <input
                        value={scanTitle}
                        onChange={(event) => setScanTitle(event.target.value)}
                      />
                    </label>
                    <label className="input-label">
                      Detalhes
                      <textarea
                        rows={4}
                        value={scanDetails}
                        onChange={(event) => setScanDetails(event.target.value)}
                      />
                    </label>
                    <div className="scan-actions">
                      <Button variant="ghost" onClick={() => setScanStage(0)}>
                        Descartar
                      </Button>
                      <Button
                        disabled={!scanTitle.trim() || !scanFile}
                        onClick={() => {
                          if (!scanFile) return
                          void saveEvent({
                            userId,
                            type: "scan.saved",
                            payload: {
                              agent: selected,
                              fileName: scanFile.name,
                              title: scanTitle.trim(),
                              details: scanDetails.trim(),
                            },
                          })
                          setScanStage(2)
                        }}
                      >
                        Revisar e salvar
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              {scanStage === 2 && (
                <div className="saved-state">
                  <span>
                    <Icon name="check" size={30} />
                  </span>
                  <h3>Registro salvo</h3>
                  <p>
                    A informação foi adicionada ao seu histórico de{" "}
                    {agent.name.toLowerCase()}.
                  </p>
                  <Button
                    onClick={() => {
                      setScanFile(undefined)
                      setScanTitle("")
                      setScanDetails("")
                      setScanStage(0)
                    }}
                  >
                    Digitalizar outro
                  </Button>
                </div>
              )}
            </div>
          )}
          {tab === "settings" && (
            <div className="settings-panel">
              <h3>Preferências do agente</h3>
              <div className="setting-row">
                <div>
                  <strong>Lembretes</strong>
                  <small>Receba sugestões gentis durante a semana</small>
                </div>
                <input
                  type="checkbox"
                  checked={remindersEnabled}
                  onChange={(event) => {
                    setRemindersEnabled(event.target.checked)
                    void savePreference(
                      userId,
                      "reminders",
                      event.target.checked,
                    )
                  }}
                />
              </div>
              <div className="setting-row">
                <div>
                  <strong>Tom das conversas</strong>
                  <small>Escolha como prefere receber orientações</small>
                </div>
                <select
                  value={conversationTone}
                  onChange={(event) => {
                    setConversationTone(event.target.value)
                    void savePreference(userId, "tone", event.target.value)
                  }}
                >
                  <option>Acolhedor e direto</option>
                  <option>Objetivo</option>
                  <option>Detalhado</option>
                </select>
              </div>
              <div className="setting-row">
                <div>
                  <strong>Usar histórico</strong>
                  <small>Considere registros anteriores nas conversas</small>
                </div>
                <input
                  type="checkbox"
                  checked={useHistory}
                  onChange={(event) => {
                    setUseHistory(event.target.checked)
                    void savePreference(userId, "history", event.target.checked)
                  }}
                />
              </div>
            </div>
          )}
        </section>
      </div>
    </>
  )
}

function Records({ checkIn }: { checkIn?: CheckInRecord }) {
  const [filter, setFilter] = useState("Todos")
  const [range, setRange] = useState<"7 dias" | "30 dias">("7 dias")
  const [advancedFilters, setAdvancedFilters] = useState(false)
  const exportRecords = () => {
    const date = checkIn
      ? new Date(checkIn.createdAt).toLocaleDateString("pt-BR")
      : new Date().toLocaleDateString("pt-BR")
    const rows = checkIn
      ? [
          `${date},Check-in,${checkIn.activity} / ${checkIn.food} / ${checkIn.water} copos`,
          `${date},Agenda,${checkIn.priority} às ${checkIn.priorityTime}`,
          checkIn.note ? `${date},Nota,${checkIn.note.replace(/,/g, " ")}` : "",
        ].filter(Boolean)
      : []
    const blob = new Blob([["data,categoria,registro", ...rows].join("\n")], {
      type: "text/csv;charset=utf-8",
    })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = "cultiva-registros.csv"
    link.click()
    URL.revokeObjectURL(link.href)
  }
  const records = checkIn
    ? [
        {
          icon: "water",
          title: "Check-in concluído",
          meta: `${new Date(checkIn.createdAt).toLocaleString("pt-BR")} · ${checkIn.activity}`,
          cat: "Check-ins",
          color: "#3a83a6",
        },
        {
          icon: "utensils",
          title: "Alimentação registrada",
          meta: `${checkIn.food} · ${checkIn.water} copos de água`,
          cat: "Nutrição",
          color: "#4f9c76",
        },
        {
          icon: "clock",
          title: checkIn.priority,
          meta: `${checkIn.priorityTime} · Agenda`,
          cat: "Atividades",
          color: "#3a83a6",
        },
      ]
    : []
  const shown =
    filter === "Todos" ? records : records.filter((r) => r.cat === filter)
  return (
    <>
      <Header
        title="Registros"
        subtitle="Acompanhe sua evolução, sem cobranças"
      />
      <div className="page-content records-page">
        <div className="record-filters">
          <button
            onClick={() => setRange(range === "7 dias" ? "30 dias" : "7 dias")}
          >
            <Icon name="calendar" /> Últimos {range}
          </button>
          {["Todos", "Check-ins", "Nutrição", "Atividades", "Estudos"].map(
            (x) => (
              <button
                className={filter === x ? "active" : ""}
                onClick={() => setFilter(x)}
                key={x}
              >
                {x}
              </button>
            ),
          )}
          <button
            aria-expanded={advancedFilters}
            onClick={() => setAdvancedFilters(!advancedFilters)}
          >
            <Icon name="filter" /> Filtros
          </button>
        </div>
        {advancedFilters && (
          <div className="advanced-filters">
            <span>
              Mostrando registros de <strong>{range}</strong>
            </span>
            <button
              onClick={() => {
                setFilter("Todos")
                setRange("7 dias")
                setAdvancedFilters(false)
              }}
            >
              Limpar filtros
            </button>
          </div>
        )}
        <div className="stats-grid">
          <article>
            <span>Constância semanal</span>
            <strong>
              {checkIn ? 1 : 0} <small>de 7 dias</small>
            </strong>
            <div className="bars">
              {[45, 70, 55, 85, 62, 20, 10].map((h, i) => (
                <i
                  key={i}
                  style={{ height: `${h}%` }}
                  className={i < 5 ? "on" : ""}
                />
              ))}
            </div>
          </article>
          <article>
            <span>Bem-estar</span>
            <strong>Estável</strong>
            <div className="line-chart">
              <svg viewBox="0 0 260 65">
                <path d="M4 48 C35 45 38 22 70 30 S110 52 140 30 180 15 205 25 235 18 256 8" />
                <circle cx="256" cy="8" r="4" />
              </svg>
            </div>
          </article>
          <article>
            <span>Água na semana</span>
            <strong>
              {checkIn?.water ?? 0} <small>copos registrados</small>
            </strong>
            <div className="stat-progress">
              <i
                style={{
                  width: `${Math.min(100, ((checkIn?.water ?? 0) / 8) * 100)}%`,
                }}
              />
            </div>
            <small>Meta diária: 8 copos</small>
          </article>
        </div>
        <section className="timeline">
          <div className="section-title">
            <h2>Histórico recente</h2>
            <button onClick={exportRecords}>Exportar dados</button>
          </div>
          {shown.length === 0 && (
            <p className="safe-note">
              Ainda não há registros reais. Finalize um check-in para começar
              seu histórico.
            </p>
          )}
          {shown.map((r, i) => (
            <div className="timeline-item" key={i}>
              <span style={{ color: r.color, background: `${r.color}18` }}>
                <Icon name={r.icon} />
              </span>
              <div>
                <strong>{r.title}</strong>
                <small>{r.meta}</small>
              </div>
              <span className="tag">{r.cat}</span>
              <Icon name="arrow" size={16} />
            </div>
          ))}
        </section>
      </div>
    </>
  )
}

function Profile({
  name,
  setName,
  onLogout,
  onDeleteAccount,
  userId,
}: {
  name: string
  setName: (name: string) => void
  onLogout: () => void
  onDeleteAccount: () => Promise<void>
  userId: string
}) {
  const [support, setSupport] = useState(false)
  const [panel, setPanel] = useState<string | null>(null)
  const [draftName, setDraftName] = useState(name)
  const [contactAdded, setContactAdded] = useState(false)
  return (
    <>
      <Header title="Perfil" subtitle="Suas preferências e privacidade" />
      <div className="page-content profile-page">
        <section className="profile-card">
          <div className="big-avatar">{name.slice(0, 2).toUpperCase()}</div>
          <div>
            <h2>{name}</h2>
            <p>Conta local neste dispositivo</p>
            <button onClick={() => setPanel("Editar perfil")}>
              Editar perfil
            </button>
          </div>
        </section>
        <div className="profile-columns">
          <section className="profile-section">
            <h3>Preferências</h3>
            {[
              ["bell", "Notificações", "Lembretes e horários"],
              [
                "spark",
                "Configurações dos agentes",
                "Tom, histórico e objetivos",
              ],
              ["shield", "Privacidade e dados", "Consentimentos e exportação"],
            ].map((x) => (
              <button key={x[1]} onClick={() => setPanel(x[1])}>
                <span>
                  <Icon name={x[0]} />
                </span>
                <div>
                  <strong>{x[1]}</strong>
                  <small>{x[2]}</small>
                </div>
                <Icon name="arrow" size={16} />
              </button>
            ))}
          </section>
          <section className="profile-section support-section">
            <h3>Cuidado e segurança</h3>
            <button onClick={() => setSupport(true)}>
              <span>
                <Icon name="heart" />
              </span>
              <div>
                <strong>Alertas e apoio</strong>
                <small>Contatos de confiança e orientações</small>
              </div>
              <Icon name="arrow" size={16} />
            </button>
            <p>
              O CULTIVA não monitora emergências nem aciona contatos
              automaticamente.
            </p>
          </section>
        </div>
        <button className="logout" onClick={onLogout}>
          Sair da conta
        </button>
        <button
          className="logout"
          onClick={() => {
            if (
              window.confirm(
                "Excluir permanentemente todos os seus dados deste dispositivo?",
              )
            ) {
              void onDeleteAccount()
            }
          }}
        >
          Excluir todos os meus dados
        </button>
      </div>
      {support && (
        <Modal title="Alertas e apoio" onClose={() => setSupport(false)}>
          <div className="support-modal">
            <div className="support-alert">
              <Icon name="heart" />
              <p>
                <strong>
                  Você não precisa passar por momentos difíceis sozinho.
                </strong>
                <span>
                  Procure uma pessoa de confiança ou um serviço profissional da
                  sua região.
                </span>
              </p>
            </div>
            <h3>Contatos de confiança</h3>
            <div className="contact">
              <div>AC</div>
              <p>
                <strong>Ana Costa</strong>
                <small>Irmã · (11) 99999-0000</small>
              </p>
              <button
                onClick={() => {
                  window.location.href = "tel:+5511999990000"
                }}
              >
                Ligar
              </button>
            </div>
            {contactAdded && (
              <div className="contact">
                <div>RL</div>
                <p>
                  <strong>Rafael Lima</strong>
                  <small>Amigo · contato adicionado</small>
                </p>
              </div>
            )}
            <Button variant="secondary" onClick={() => setContactAdded(true)}>
              <Icon name="plus" /> Adicionar contato
            </Button>
            <div className="no-monitor">
              <Icon name="shield" />
              <p>
                <strong>Importante</strong>
                <span>
                  O CULTIVA não monitora seu estado, não detecta crises e não
                  contata ninguém automaticamente. Em risco imediato, procure o
                  serviço de emergência local.
                </span>
              </p>
            </div>
          </div>
        </Modal>
      )}
      {panel && (
        <Modal title={panel} onClose={() => setPanel(null)}>
          <div className="preference-modal">
            {panel === "Editar perfil" && (
              <>
                <label className="input-label">
                  Nome preferido
                  <input
                    value={draftName}
                    onChange={(event) => setDraftName(event.target.value)}
                  />
                </label>
                <Button
                  onClick={() => {
                    if (draftName.trim()) setName(draftName.trim())
                    setPanel(null)
                  }}
                >
                  Salvar alterações
                </Button>
              </>
            )}
            {panel === "Notificações" && (
              <>
                <div className="setting-row">
                  <div>
                    <strong>Lembretes diários</strong>
                    <small>Check-in, água e pausas</small>
                  </div>
                  <input type="checkbox" />
                </div>
                <div className="setting-row">
                  <div>
                    <strong>Revisões de estudo</strong>
                    <small>Avise quando uma revisão estiver pronta</small>
                  </div>
                  <input type="checkbox" />
                </div>
              </>
            )}
            {panel === "Configurações dos agentes" && (
              <>
                <p className="preference-intro">
                  Cada agente mantém preferências e histórico separados.
                </p>
                {Object.values(agents).map((agent) => (
                  <div className="setting-row" key={agent.name}>
                    <div>
                      <strong>{agent.name}</strong>
                      <small>Ativo · tom acolhedor</small>
                    </div>
                    <Icon name="check" size={17} />
                  </div>
                ))}
              </>
            )}
            {panel === "Privacidade e dados" && (
              <>
                <div className="support-alert">
                  <Icon name="shield" />
                  <p>
                    <strong>Seus controles de privacidade</strong>
                    <span>
                      Os dados deste protótipo ficam salvos apenas neste
                      navegador.
                    </span>
                  </p>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => void deleteAgentMessages(userId)}
                >
                  Limpar histórico de conversas
                </Button>
              </>
            )}
          </div>
        </Modal>
      )}
    </>
  )
}

function LoginScreen({
  onLogin,
}: {
  onLogin: (account: { id: string; name: string }) => void
}) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  return (
    <main className="onboarding">
      <section className="onboard-content">
        <div className="step-panel">
          <Logo />
          <span className="eyebrow">CULTIVA LOCAL</span>
          <h1>Entrar na sua conta</h1>
          <p className="lead">
            Seus dados ficam neste dispositivo e não são enviados para um
            servidor de contas.
          </p>
          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault()
              setLoading(true)
              setError("")
              void loginAccount(email, password)
                .then((account) => onLogin(account))
                .catch((reason) =>
                  setError(
                    reason instanceof Error
                      ? reason.message
                      : "Não foi possível entrar.",
                  ),
                )
                .finally(() => setLoading(false))
            }}
          >
            <label className="full">
              E-mail
              <input
                required
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <label className="full">
              Senha
              <input
                required
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            {error && <p className="safe-note full">{error}</p>}
            <Button className="full" type="submit" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </div>
      </section>
    </main>
  )
}

export default function App() {
  const [onboarded, setOnboarded] = usePersistentState(
    "cultiva-onboarded",
    false,
  )
  const [authenticated, setAuthenticated] = usePersistentState(
    "cultiva-authenticated",
    false,
  )
  const [name, setName] = usePersistentState("cultiva-name", "")
  const [page, setPage] = usePersistentState<Page>("cultiva-page", "today")
  const [selectedAgent, setSelectedAgent] = usePersistentState<AgentId>(
    "cultiva-selected-agent",
    "nutrition",
  )
  const [tasks, setTasks] = useState<LocalTask[]>([])
  const userId = localStorage.getItem("cultiva-user-id") || ""
  useEffect(() => {
    if (
      (!userId || userId === "local-user") &&
      (name === "Marina" || name === "Marina Silva")
    ) {
      localStorage.removeItem("cultiva-name")
      localStorage.removeItem("cultiva-onboarded")
      localStorage.removeItem("cultiva-authenticated")
      setName("")
      setOnboarded(false)
      setAuthenticated(false)
    }
  }, [name, userId])
  useEffect(() => {
    if (!userId) return
    void listTasks(userId)
      .then(setTasks)
      .catch(() => setTasks([]))
  }, [userId])
  useEffect(() => {
    if (!userId) return
    for (const task of tasks) void saveTask(task)
  }, [tasks, userId])
  const [checkDone, setCheckDone] = usePersistentState(
    "cultiva-check-done",
    false,
  )
  const [checkIn, setCheckIn] = useState<CheckInRecord>()
  useEffect(() => {
    const userId = localStorage.getItem("cultiva-user-id")
    if (!userId) return
    void getLatestCheckIn(userId)
      .then(setCheckIn)
      .catch(() => setCheckIn(undefined))
  }, [onboarded])
  const content = useMemo(() => {
    if (page === "today")
      return (
        <Today
          name={name}
          tasks={tasks}
          setTasks={setTasks}
          checkDone={checkDone}
          setCheckDone={setCheckDone}
          openAgent={(id) => {
            setSelectedAgent(id)
            setPage("agents")
          }}
          goRecords={() => setPage("records")}
          onCheckIn={async (record) => {
            const saved = await saveCheckIn({ ...record, userId })
            setCheckIn(saved)
            await saveEvent({
              userId,
              type: "checkin.completed",
              payload: { checkInId: saved.id },
            })
          }}
          userId={userId}
        />
      )
    if (page === "agents")
      return (
        <AgentsPage
          selected={selectedAgent}
          setSelected={setSelectedAgent}
          userName={name}
          checkIn={checkIn}
          userId={userId}
        />
      )
    if (page === "records") return <Records checkIn={checkIn} />
    return (
      <Profile
        name={name}
        setName={setName}
        onLogout={() => setAuthenticated(false)}
        onDeleteAccount={async () => {
          await deleteAllUserData(userId)
          await deleteAccount(userId)
          for (const key of Object.keys(localStorage)) {
            if (key.startsWith("cultiva-")) localStorage.removeItem(key)
          }
          setName("")
          setOnboarded(false)
          setAuthenticated(false)
        }}
        userId={userId}
      />
    )
  }, [page, name, tasks, checkDone, selectedAgent, checkIn])
  if (!onboarded)
    return (
      <Onboarding
        onFinish={(n, email, password) => {
          const finish = (userId: string) => {
            localStorage.setItem("cultiva-user-id", userId)
            setName(n)
            setOnboarded(true)
            setAuthenticated(true)
          }
          if (!email || !password) {
            return
          }
          void registerAccount(n, email, password)
            .then((account) => finish(account.id))
            .catch((error) => {
              window.alert(
                error instanceof Error
                  ? error.message
                  : "Não foi possível criar sua conta local.",
              )
            })
        }}
      />
    )
  if (!authenticated)
    return (
      <LoginScreen
        onLogin={(account) => {
          localStorage.setItem("cultiva-user-id", account.id)
          setName(account.name)
          setAuthenticated(true)
        }}
      />
    )
  return (
    <div className="app-shell">
      <Navigation page={page} setPage={setPage} name={name} />
      <main className="main-area">{content}</main>
    </div>
  )
}

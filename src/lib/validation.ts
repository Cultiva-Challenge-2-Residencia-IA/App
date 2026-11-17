export function validateRegistration(
  name: string,
  email: string,
  password: string,
) {
  if (name.trim().length < 2) throw new Error("Informe seu nome completo.")

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    throw new Error("Informe um e-mail válido.")
  }

  if (password.length < 6)
    throw new Error("A senha precisa ter pelo menos 6 caracteres.")
}

export function validateCheckIn(input: {
  userId: string

  water: number

  mood: number

  energy: number

  stress: number

  priority: string
}) {
  if (!input.userId) throw new Error("Sessão local inválida.")

  if (input.water < 0 || input.water > 10)
    throw new Error("A quantidade de água está inválida.")

  if (
    ![input.mood, input.energy, input.stress].every(
      (value) => value >= 1 && value <= 5,
    )
  ) {
    throw new Error("Os indicadores do check-in estão inválidos.")
  }

  if (!input.priority.trim())
    throw new Error("Informe a principal tarefa do dia.")
}

const riskSignals = [
  /\b(suic[ií]d|me matar|tirar minha vida)\b/i,
  /\b(auto[- ]?les[aã]o|me cortar|me machucar)\b/i,
  /\b(n[aã]o quero mais viver|acabar com tudo)\b/i,
]

export function detectRiskSignal(text: string) {
  return riskSignals.some((pattern) => pattern.test(text))
}

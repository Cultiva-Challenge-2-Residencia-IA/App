import { validateRegistration } from "./validation"

export type UserAccount = {
  id: string

  name: string

  email: string

  passwordHash: string

  createdAt: string
}

export type CheckInRecord = {
  id: string

  userId: string

  createdAt: string

  activity: string

  food: string

  water: number

  mood: number

  energy: number

  stress: number

  priority: string

  priorityTime: string

  extraTask: string

  note: string
}

export type LocalTask = {
  id: string
  userId: string
  label: string
  meta: string
  done: boolean
  createdAt: string
  dueDate?: string
  dueTime?: string
  category?: string
}

export type AgentMessageRecord = {
  id: string
  userId: string
  agent: string
  from: "agent" | "user"
  text: string
  createdAt: string
}

export type AgentNoteRecord = {
  id: string
  userId: string
  agent: string
  title: string
  body: string
  createdAt: string
}

export type EventRecord = {
  id: string
  userId: string
  type: string
  payload: Record<string, unknown>
  createdAt: string
}

const databaseName = "cultiva-local"

const databaseVersion = 2

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, databaseVersion)

    request.onerror = () =>
      reject(request.error ?? new Error("Falha ao abrir o banco local."))

    request.onupgradeneeded = () => {
      const database = request.result

      if (!database.objectStoreNames.contains("accounts")) {
        const accounts = database.createObjectStore("accounts", {
          keyPath: "id",
        })

        accounts.createIndex("email", "email", { unique: true })
      }

      if (!database.objectStoreNames.contains("checkins")) {
        const checkins = database.createObjectStore("checkins", {
          keyPath: "id",
        })

        checkins.createIndex("userId", "userId", { unique: false })
      }
      for (const store of [
        "tasks",
        "agentMessages",
        "agentNotes",
        "events",
        "preferences",
        "scans",
      ]) {
        if (!database.objectStoreNames.contains(store)) {
          const objectStore = database.createObjectStore(store, {
            keyPath: "id",
          })
          objectStore.createIndex("userId", "userId", { unique: false })
        }
      }
    }

    request.onsuccess = () => resolve(request.result)
  })
}

async function digest(value: string) {
  const bytes = new TextEncoder().encode(value)

  const hash = await crypto.subtle.digest("SHA-256", bytes)

  return Array.from(new Uint8Array(hash), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("")
}

export async function registerAccount(
  name: string,
  email: string,
  password: string,
) {
  validateRegistration(name, email, password)
  const database = await openDatabase()

  const account: UserAccount = {
    id: crypto.randomUUID(),

    name: name.trim(),

    email: email.trim().toLowerCase(),

    passwordHash: await digest(password),

    createdAt: new Date().toISOString(),
  }

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction("accounts", "readwrite")

    transaction.objectStore("accounts").add(account)

    transaction.oncomplete = () => resolve()

    transaction.onerror = () =>
      reject(transaction.error ?? new Error("Este e-mail já está cadastrado."))
  })

  database.close()

  return account
}

export async function loginAccount(email: string, password: string) {
  const database = await openDatabase()

  const account = await new Promise<UserAccount | undefined>(
    (resolve, reject) => {
      const request = database
        .transaction("accounts")
        .objectStore("accounts")
        .index("email")
        .get(email.trim().toLowerCase())

      request.onsuccess = () => resolve(request.result)

      request.onerror = () => reject(request.error)
    },
  )

  database.close()

  if (!account || account.passwordHash !== (await digest(password))) {
    throw new Error("E-mail ou senha inválidos.")
  }

  return account
}

export async function updateAccountName(userId: string, name: string) {
  if (name.trim().length < 2) throw new Error("Informe um nome válido.")
  const database = await openDatabase()
  const account = await new Promise<UserAccount>((resolve, reject) => {
    const request = database
      .transaction("accounts")
      .objectStore("accounts")
      .get(userId)
    request.onsuccess = () => {
      if (request.result) resolve(request.result)
      else reject(new Error("Conta local não encontrada."))
    }
    request.onerror = () => reject(request.error)
  })
  database.close()
  return putRecord("accounts", { ...account, name: name.trim() })
}

export async function saveCheckIn(
  record: Omit<CheckInRecord, "id" | "createdAt">,
) {
  const database = await openDatabase()

  const value: CheckInRecord = {
    ...record,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  }

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction("checkins", "readwrite")

    transaction.objectStore("checkins").put(value)

    transaction.oncomplete = () => resolve()

    transaction.onerror = () =>
      reject(
        transaction.error ?? new Error("Não foi possível salvar o check-in."),
      )
  })

  database.close()

  return value
}

export async function getLatestCheckIn(userId: string) {
  const database = await openDatabase()

  const records = await new Promise<CheckInRecord[]>((resolve, reject) => {
    const request = database
      .transaction("checkins")
      .objectStore("checkins")
      .index("userId")
      .getAll(userId)

    request.onsuccess = () => resolve(request.result)

    request.onerror = () => reject(request.error)
  })

  database.close()

  return records.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
}

async function getAllByUser<T>(storeName: string, userId: string) {
  const database = await openDatabase()
  const records = await new Promise<T[]>((resolve, reject) => {
    const request = database
      .transaction(storeName)
      .objectStore(storeName)
      .index("userId")
      .getAll(userId)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  database.close()
  return records
}

async function putRecord<T extends { id: string }>(
  storeName: string,
  value: T,
) {
  const database = await openDatabase()
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(storeName, "readwrite")
    transaction.objectStore(storeName).put(value)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () =>
      reject(
        transaction.error ??
          new Error("Não foi possível salvar os dados locais."),
      )
  })
  database.close()
  return value
}

async function deleteRecord(storeName: string, id: string) {
  const database = await openDatabase()
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(storeName, "readwrite")
    transaction.objectStore(storeName).delete(id)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
  database.close()
}

export async function listTasks(userId: string) {
  return getAllByUser<LocalTask>("tasks", userId)
}

export async function saveTask(
  task: Omit<LocalTask, "createdAt"> & { createdAt?: string },
) {
  return putRecord("tasks", {
    ...task,
    createdAt: task.createdAt ?? new Date().toISOString(),
  })
}

export async function listAgentMessages(userId: string, agent: string) {
  return (await getAllByUser<AgentMessageRecord>("agentMessages", userId))
    .filter((message) => message.agent === agent)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export async function saveAgentMessage(
  message: Omit<AgentMessageRecord, "id" | "createdAt">,
) {
  return putRecord("agentMessages", {
    ...message,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  })
}

export async function deleteAgentMessages(userId: string) {
  const messages = await getAllByUser<AgentMessageRecord>(
    "agentMessages",
    userId,
  )
  await Promise.all(
    messages.map((message) => deleteRecord("agentMessages", message.id)),
  )
}

export async function listAgentNotes(userId: string, agent: string) {
  return (await getAllByUser<AgentNoteRecord>("agentNotes", userId))
    .filter((note) => note.agent === agent)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function saveAgentNote(
  note: Omit<AgentNoteRecord, "createdAt"> & { createdAt?: string },
) {
  return putRecord("agentNotes", {
    ...note,
    createdAt: note.createdAt ?? new Date().toISOString(),
  })
}

export async function deleteAgentNote(id: string) {
  return deleteRecord("agentNotes", id)
}

export async function saveEvent(event: Omit<EventRecord, "id" | "createdAt">) {
  return putRecord("events", {
    ...event,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  })
}

export async function listEvents(userId: string) {
  return (await getAllByUser<EventRecord>("events", userId)).sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  )
}

export async function savePreference(
  userId: string,
  key: string,
  value: unknown,
) {
  return putRecord("preferences", {
    id: `${userId}:${key}`,
    userId,
    key,
    value,
    updatedAt: new Date().toISOString(),
  })
}

export async function getPreferences(userId: string) {
  return getAllByUser<{
    id: string
    userId: string
    key: string
    value: unknown
  }>("preferences", userId)
}

export async function deleteAllUserData(userId: string) {
  const database = await openDatabase()
  const stores = [
    "checkins",
    "tasks",
    "agentMessages",
    "agentNotes",
    "events",
    "preferences",
    "scans",
  ]
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(stores, "readwrite")
    for (const store of stores) {
      const request = transaction
        .objectStore(store)
        .index("userId")
        .openKeyCursor(userId)
      request.onsuccess = () => {
        const cursor = request.result
        if (cursor) {
          transaction.objectStore(store).delete(cursor.primaryKey)
          cursor.continue()
        }
      }
    }
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
  database.close()
}

export async function deleteAccount(userId: string) {
  const database = await openDatabase()
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction("accounts", "readwrite")
    transaction.objectStore("accounts").delete(userId)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
  database.close()
}

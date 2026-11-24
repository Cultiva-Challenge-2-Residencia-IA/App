import { useCallback, useState } from "react"
import { useFocusEffect, useRouter } from "expo-router"
import { Alert } from "react-native"
import { randomUUID } from "expo-crypto"
import {
  client,
  fail,
  localDay,
  put,
  remove,
  rows,
  stepDay,
  validDay,
  validTime,
  type CheckIn,
  type Event,
  type Task,
} from "./backend"
import { Button, Card, Copy, Field, Page, Row, Status, useAction } from "./ui"
import { validateCheckIn } from "../../src/lib/validation"
import { useAccount } from "./session"

const categories = ["Pessoal", "Nutrição", "Atividades", "Estudos"]

function Scale({
  label,
  value,
  max,
  min = 1,
  set,
}: {
  label: string
  value: number
  max: number
  min?: number
  set: (value: number) => void
}) {
  return (
    <>
      <Copy label={label + " · " + value} />
      <Row>
        {Array.from({ length: max - min + 1 }, (_, index) => index + min).map(
          (number) => (
            <Button
              key={number}
              label={String(number)}
              selected={number === value}
              onPress={() => set(number)}
            />
          ),
        )}
      </Row>
    </>
  )
}

function CheckInForm({
  close,
  saved,
}: {
  close: () => void
  saved: () => Promise<void>
}) {
  const { id: userId } = useAccount()
  const [id] = useState(randomUUID)
  const [step, setStep] = useState(0)
  const [activity, setActivity] = useState("")
  const [food, setFood] = useState("")
  const [water, setWater] = useState(0)
  const [mood, setMood] = useState(3)
  const [energy, setEnergy] = useState(3)
  const [stress, setStress] = useState(2)
  const [priority, setPriority] = useState("")
  const [time, setTime] = useState("")
  const [extra, setExtra] = useState("")
  const [note, setNote] = useState("")
  const action = useAction()
  return (
    <Card>
      <Copy
        heading
        label={["Corpo", "Mente", "Prioridades", "Observações"][step]}
      />
      {step === 0 && (
        <>
          <Field
            label="Atividade física"
            value={activity}
            onChangeText={setActivity}
            maxLength={120}
          />
          <Field
            label="Alimentação"
            value={food}
            onChangeText={setFood}
            maxLength={120}
          />
          <Scale
            label="Copos de água"
            value={water}
            set={setWater}
            min={0}
            max={10}
          />
        </>
      )}
      {step === 1 && (
        <>
          <Scale label="Humor" value={mood} set={setMood} max={5} />
          <Scale label="Energia" value={energy} set={setEnergy} max={5} />
          <Scale label="Estresse" value={stress} set={setStress} max={5} />
        </>
      )}
      {step === 2 && (
        <>
          <Field
            label="Principal tarefa do dia"
            value={priority}
            onChangeText={setPriority}
            maxLength={200}
          />
          <Field
            label="Horário (HH:MM)"
            value={time}
            onChangeText={setTime}
            maxLength={5}
          />
          <Field
            label="Tarefa adicional (opcional)"
            value={extra}
            onChangeText={setExtra}
            maxLength={200}
          />
        </>
      )}
      {step === 3 && (
        <Field
          label="Anotação (opcional)"
          multiline
          value={note}
          onChangeText={setNote}
          maxLength={4000}
        />
      )}
      <Status {...action} />
      <Row>
        <Button
          label={step ? "Voltar" : "Cancelar"}
          disabled={action.busy}
          selected={false}
          onPress={() => (step ? setStep(step - 1) : close())}
        />
        <Button
          label={step === 3 ? "Salvar check-in" : "Continuar"}
          disabled={action.busy}
          onPress={() =>
            void action.run(async () => {
              if (step === 2 && (!priority.trim() || !validTime(time)))
                throw new Error(
                  "Informe a prioridade e um horário válido, se houver.",
                )
              if (step < 3) {
                setStep(step + 1)
                return
              }
              validateCheckIn({ userId, water, mood, energy, stress, priority })
              fail(
                (
                  await client().rpc("record_checkin", {
                    entry_id: id,
                    day: localDay(),
                    body_activity: activity.trim(),
                    body_food: food.trim(),
                    cups: water,
                    mood_score: mood,
                    energy_score: energy,
                    stress_score: stress,
                    main_task: priority.trim(),
                    main_time: time || null,
                    extra_task: extra.trim(),
                    personal_note: note.trim(),
                  })
                ).error,
              )
              close()
              await saved()
            })
          }
        />
      </Row>
    </Card>
  )
}

function TaskForm({
  day,
  task,
  close,
  saved,
}: {
  day: string
  task?: Task
  close: () => void
  saved: () => Promise<void>
}) {
  const [label, setLabel] = useState(task?.label ?? "")
  const [date, setDate] = useState(task?.due_date ?? day)
  const [time, setTime] = useState(task?.due_time?.slice(0, 5) ?? "")
  const [category, setCategory] = useState(task?.category ?? "Pessoal")
  const action = useAction()
  return (
    <Card>
      <Copy heading label={task ? "Editar tarefa" : "Nova tarefa"} />
      <Field
        label="Tarefa"
        value={label}
        onChangeText={setLabel}
        maxLength={200}
      />
      <Field
        label="Data (AAAA-MM-DD)"
        value={date}
        onChangeText={setDate}
        maxLength={10}
      />
      <Field
        label="Horário (HH:MM)"
        value={time}
        onChangeText={setTime}
        maxLength={5}
      />
      <Row>
        {categories.map((item) => (
          <Button
            key={item}
            label={item}
            selected={category === item}
            onPress={() => setCategory(item)}
          />
        ))}
      </Row>
      <Status {...action} />
      <Row>
        <Button
          label="Cancelar"
          selected={false}
          disabled={action.busy}
          onPress={close}
        />
        <Button
          label="Salvar tarefa"
          disabled={action.busy}
          onPress={() =>
            void action.run(async () => {
              if (!label.trim() || !validDay(date) || !validTime(time))
                throw new Error(
                  "Preencha a tarefa e revise a data e o horário.",
                )
              await put(
                "tasks",
                {
                  label: label.trim(),
                  due_date: date,
                  due_time: time || null,
                  category,
                },
                task?.id,
              )
              close()
              await saved()
            })
          }
        />
      </Row>
    </Card>
  )
}

export function Routine({ agenda = false }: { agenda?: boolean }) {
  const router = useRouter()
  const [day, setDay] = useState(localDay)
  const [week, setWeek] = useState(true)
  const [tasks, setTasks] = useState<Task[]>()
  const [checkIn, setCheckIn] = useState<CheckIn>()
  const [water, setWater] = useState(0)
  const [checking, setChecking] = useState(false)
  const [editing, setEditing] = useState<Task | "new">()
  const action = useAction()
  const { run } = action
  const today = localDay()

  const load = useCallback(async () => {
    if (agenda) {
      setTasks(await rows<Task>("tasks"))
      return
    }
    const [nextTasks, checkIns, events] = await Promise.all([
      rows<Task>("tasks"),
      rows<CheckIn>("checkins"),
      rows<Event>("events", { column: "type", value: "water.logged" }),
    ])
    const latest = checkIns.find(
      (item) => localDay(new Date(item.created_at)) === today,
    )
    const after = events.filter(
      (event) =>
        localDay(new Date(event.created_at)) === today &&
        (!latest || event.created_at > latest.created_at),
    )
    setTasks(nextTasks)
    setCheckIn(latest)
    setWater(
      (latest?.water ?? 0) +
        after.reduce(
          (total, event) => total + Number(event.payload.amount ?? 0),
          0,
        ),
    )
  }, [agenda, today])
  useFocusEffect(
    useCallback(() => {
      void run(load)
    }, [load]),
  )

  const weekStart = stepDay(
    day,
    -((new Date(day + "T12:00:00").getDay() + 6) % 7),
  )
  const days =
    agenda && week
      ? Array.from({ length: 7 }, (_, index) => stepDay(weekStart, index))
      : [agenda ? day : today]
  return (
    <Page title={agenda ? "Agenda" : "Hoje"}>
      {!agenda && (
        <Card dark>
          <Copy
            heading
            light
            label={checkIn ? "Você começou bem." : "Como você está hoje?"}
          />
          <Button
            label={checkIn ? "Novo check-in" : "Fazer check-in"}
            onPress={() => setChecking(true)}
          />
        </Card>
      )}
      {checking && (
        <CheckInForm close={() => setChecking(false)} saved={() => run(load)} />
      )}
      {!agenda && (
        <Card>
          <Copy heading label="Hidratação" />
          <Copy label={water + " copos registrados hoje"} />
          <Button
            label="Adicionar um copo"
            disabled={action.busy}
            onPress={() =>
              void run(async () => {
                await put("events", {
                  type: "water.logged",
                  payload: { amount: 1, source: "today" },
                })
                await load()
              })
            }
          />
          <Row>
            <Button
              label="Seus agentes"
              selected={false}
              onPress={() => router.navigate("/agents")}
            />
            <Button
              label="Ver registros"
              selected={false}
              onPress={() => router.navigate("/records")}
            />
          </Row>
        </Card>
      )}
      {agenda && (
        <Row>
          <Button
            label="Anterior"
            selected={false}
            onPress={() => setDay(stepDay(day, week ? -7 : -1))}
          />
          <Button label="Hoje" selected={false} onPress={() => setDay(today)} />
          <Button
            label="Próximo"
            selected={false}
            onPress={() => setDay(stepDay(day, week ? 7 : 1))}
          />
          <Button
            label={week ? "Ver dia" : "Ver semana"}
            onPress={() => setWeek(!week)}
          />
        </Row>
      )}
      <Copy heading label={agenda ? "Tarefas" : "Próximos passos"} />
      {!editing && (
        <Button label="Nova tarefa" onPress={() => setEditing("new")} />
      )}
      {!!editing && (
        <TaskForm
          key={editing === "new" ? "new" : editing.id}
          day={agenda ? day : today}
          task={editing === "new" ? undefined : editing}
          close={() => setEditing(undefined)}
          saved={() => run(load)}
        />
      )}
      <Status {...action} />
      {!!action.error && (
        <Button label="Atualizar registros" onPress={() => void run(load)} />
      )}
      {tasks &&
        days.map((date) => {
          const entries = tasks
            .filter((item) => item.due_date === date)
            .sort((a, b) =>
              (a.due_time ?? "99").localeCompare(b.due_time ?? "99"),
            )
          return (
            <Card key={date}>
              {agenda && (
                <Button
                  label={new Date(date + "T12:00:00").toLocaleDateString(
                    "pt-BR",
                    { weekday: "short", day: "numeric", month: "short" },
                  )}
                  selected={date === day}
                  onPress={() => {
                    setDay(date)
                    setWeek(false)
                  }}
                />
              )}
              {!entries.length && <Copy label="Nada agendado por aqui." />}
              {entries.map((task) => (
                <Card key={task.id}>
                  <Copy heading label={task.label} />
                  <Copy
                    label={[task.due_time?.slice(0, 5), task.category]
                      .filter(Boolean)
                      .join(" · ")}
                  />
                  <Row>
                    <Button
                      label={task.done ? "✓ Concluída" : "Concluir"}
                      selected={task.done}
                      disabled={action.busy}
                      onPress={() =>
                        void run(async () => {
                          await put("tasks", { done: !task.done }, task.id)
                          await load()
                        })
                      }
                    />
                    <Button
                      label="Editar"
                      selected={false}
                      onPress={() => setEditing(task)}
                    />
                    <Button
                      label="Excluir"
                      selected={false}
                      disabled={action.busy}
                      onPress={() =>
                        Alert.alert("Excluir tarefa?", task.label, [
                          { text: "Cancelar", style: "cancel" },
                          {
                            text: "Excluir",
                            style: "destructive",
                            onPress: () =>
                              void run(async () => {
                                await remove("tasks", "id", task.id)
                                await load()
                              }),
                          },
                        ])
                      }
                    />
                  </Row>
                </Card>
              ))}
            </Card>
          )
        })}
    </Page>
  )
}

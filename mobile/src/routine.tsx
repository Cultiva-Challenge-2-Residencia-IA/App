import { useCallback, useEffect, useRef, useState } from "react"
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router"
import { Alert, LayoutAnimation, StyleSheet, Text, View } from "react-native"
import * as Haptics from "expo-haptics"
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
import { Button, Card, Copy, Field, Page, Row, Status, tones, useAction, usePalette } from "./ui"
import { validateCheckIn } from "../../src/lib/validation"
import { useAccount } from "./session"
import { CheckInSteps, DailyPanel } from "./daily-panel"
import { Icon } from "./icons"
import { AgendaCalendar } from "./agenda-calendar"
import { AgendaDaySummary, AgendaEmpty, AgendaUpcoming } from "./agenda-overview"
import { MotionIn } from "./motion"
import { agendaAgent, readAgendaDraft, type TaskDraft } from "./agenda-suggestions"
import { AgentBadge } from "./agent-tile"
import { hasTaskReminder, setTaskReminder } from "./reminders"
import { usePreferences } from "./preferences"
import { TodayAgents, TodayHeader, TodayJourney, TodayModules } from "./today-overview"
import { activityForDay, weekDates, type DayActivity } from "./today-metrics"
import { hydrationOn, waterGoal } from "./hydration"
import { activityDay } from "./local-date"
import { FormScreen } from "./form-screen"
import { useLocalToday } from "./use-local-today"
import { useReducedMotion } from "./today-motion"

const categories = ["Pessoal", "Nutrição", "Saúde física", "Saúde mental", "Estudos"]

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
      <Copy label={label + ": " + value} />
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
  day,
}: {
  close: () => void
  saved: () => Promise<void>
  day: string
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
  const reduced = useReducedMotion()
  function changeStep(next: number) {
    if (!reduced) LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setStep(next)
  }
  function cancel() {
    if (action.busy) return
    if (!activity && !food && !water && mood === 3 && energy === 3 && stress === 2 && !priority && !time && !extra && !note) {
      close()
      return
    }
    Alert.alert("Descartar check-in?", "As respostas deste check-in serão perdidas.", [
      { text: "Continuar preenchendo", style: "cancel" },
      { text: "Descartar", style: "destructive", onPress: close },
    ])
  }
  return (
    <FormScreen title="Check-in" close={cancel} busy={action.busy}>
      <Copy
        heading
        label={["Corpo", "Mente", "Prioridades", "Observações"][step]}
      />
      <CheckInSteps step={step + 1} />
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
            label="Copos de água adicionais"
            value={water}
            set={setWater}
            min={0}
            max={10}
          />
          <Copy muted label="Inclua apenas os copos que ainda não registrou hoje." />
        </>
      )}
      {step === 1 && (
        <>
          <Scale label="Humor (1 muito ruim, 5 muito bom)" value={mood} set={setMood} max={5} />
          <Scale label="Energia (1 muito baixa, 5 muito alta)" value={energy} set={setEnergy} max={5} />
          <Scale label="Estresse (1 muito baixo, 5 muito alto)" value={stress} set={setStress} max={5} />
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
          onPress={() => (step ? changeStep(step - 1) : cancel())}
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
                changeStep(step + 1)
                return
              }
              validateCheckIn({ userId, water, mood, energy, stress, priority })
              fail(
                (
                  await client().rpc("record_daily_checkin", {
                    entry_id: id,
                    day,
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
    </FormScreen>
  )
}

function TaskForm({
  day,
  task,
  draft,
  close,
  saved,
}: {
  day: string
  task?: Task
  draft?: TaskDraft
  close: () => void
  saved: (date: string) => Promise<void>
}) {
  const [id] = useState(() => task?.id ?? randomUUID())
  const [label, setLabel] = useState(task?.label ?? draft?.label ?? "")
  const [date, setDate] = useState(task?.due_date ?? draft?.day ?? day)
  const [time, setTime] = useState(task?.due_time?.slice(0, 5) ?? draft?.time ?? "")
  const [category, setCategory] = useState(task?.category ?? draft?.category ?? "Pessoal")
  const [remind, setRemind] = useState<boolean | undefined>(task ? undefined : false)
  const action = useAction()
  useEffect(() => {
    if (!task) return
    let current = true
    void hasTaskReminder(id).then(value => { if (current) setRemind(value) }).catch(() => {})
    return () => { current = false }
  }, [task, id])
  function cancel() {
    if (action.busy) return
    const changed = label !== (task?.label ?? draft?.label ?? "") ||
      date !== (task?.due_date ?? draft?.day ?? day) ||
      time !== (task?.due_time?.slice(0, 5) ?? draft?.time ?? "") ||
      category !== (task?.category ?? draft?.category ?? "Pessoal")
    if (!changed) return close()
    Alert.alert("Descartar alterações?", "As alterações desta tarefa serão perdidas.", [
      { text: "Continuar editando", style: "cancel" },
      { text: "Descartar", style: "destructive", onPress: close },
    ])
  }
  return (
    <FormScreen title={task ? "Editar tarefa" : "Nova tarefa"} close={cancel} busy={action.busy}>
      {draft && <Copy muted label={"Sugestão de " + draft.category} />}
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
        {Array.from(new Set([...categories, category])).map((item) => (
          <Button
            key={item}
            label={item}
            selected={category === item}
            onPress={() => setCategory(item)}
          />
        ))}
      </Row>
      {!task?.done && (
        <Button
          label={remind ? "Notificação ativada neste aparelho" : "Notificar no horário"}
          icon="bell"
          selected={remind === true}
          disabled={action.busy || remind === undefined}
          onPress={() => setRemind(!remind)}
        />
      )}
      <Status {...action} />
      <Row>
        <Button
          label="Cancelar"
          selected={false}
          disabled={action.busy}
          onPress={cancel}
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
              const when = time ? new Date(date + "T" + time + ":00") : null
              if (remind && (!when || when.getTime() <= Date.now()))
                throw new Error("Para receber a notificação, informe uma data e um horário futuros.")
              await put(
                "tasks",
                {
                  ...(task ? {} : { id }),
                  label: label.trim(),
                  due_date: date,
                  due_time: time || null,
                  category,
                },
                task?.id,
              )
              if (remind || (task && remind === false)) {
                try {
                  await setTaskReminder(id, label.trim(), remind ? when : null)
                } catch (cause) {
                  Alert.alert("Tarefa salva", cause instanceof Error ? cause.message : "O aparelho não agendou a notificação.")
                }
              }
              close()
              await saved(date)
            })
          }
        />
      </Row>
    </FormScreen>
  )
}

export function Routine({ agenda = false }: { agenda?: boolean }) {
  const router = useRouter()
  const { draft: incoming, day: calendarDay } = useLocalSearchParams<{ draft?: string; day?: string }>()
  const colors = usePalette()
  const prefs = usePreferences()
  const reduced = useReducedMotion()
  const [day, setDay] = useState(localDay)
  const [week, setWeek] = useState(false)
  const [tasks, setTasks] = useState<Task[]>()
  const [dayCheckIns, setDayCheckIns] = useState<CheckIn[]>([])
  const [water, setWater] = useState(0)
  const [undoId, setUndoId] = useState<string>()
  const [activity, setActivity] = useState<{ week: DayActivity[]; journey: DayActivity[] }>()
  const [checking, setChecking] = useState<string>()
  const [editing, setEditing] = useState<Task | "new">()
  const [draft, setDraft] = useState<TaskDraft>()
  const action = useAction()
  const { run } = action
  const today = useLocalToday()
  const goal = waterGoal(prefs.values.water_goal)
  const loadVersion = useRef(0)
  useEffect(() => {
    if (!agenda || typeof calendarDay !== "string" || !validDay(calendarDay)) return
    setDay(calendarDay)
    setWeek(false)
    router.setParams({ day: "" })
  }, [agenda, calendarDay, router])
  useEffect(() => {
    if (!agenda || !incoming) return
    const next = readAgendaDraft(incoming)
    router.setParams({ draft: "" })
    if (!next) return
    setDay(next.day)
    setDraft(next)
    setEditing("new")
  }, [agenda, incoming, router])
  const load = useCallback(async () => {
    const version = ++loadVersion.current
    if (agenda) {
      const nextTasks = await rows<Task>("tasks")
      if (version === loadVersion.current) setTasks(nextTasks)
      return
    }
    const [nextTasks, checkIns, events] = await Promise.all([
      rows<Task>("tasks"),
      rows<CheckIn>("checkins"),
      rows<Event>("events", { column: "type", value: "water.logged" }),
    ])
    if (version !== loadVersion.current) return
    const entries = checkIns.filter(
      (item) => activityDay(item.activity_date, item.created_at) === today,
    )
    const hydration = hydrationOn(today, checkIns, events)
    const buildDay = (date: string) => activityForDay(date, checkIns, events, nextTasks)
    setTasks(nextTasks)
    setDayCheckIns(entries)
    setWater(hydration.cups)
    setUndoId(hydration.additions[0]?.id)
    setActivity({
      week: weekDates(today).map(buildDay),
      journey: Array.from({ length: 7 }, (_, index) => buildDay(stepDay(today, index - 6))),
    })
  }, [agenda, today])
  useFocusEffect(
    useCallback(() => {
      void run(load)
    }, [load]),
  )

  const days =
    agenda && week
      ? weekDates(day)
      : [agenda ? day : today]
  const todayTasks = agenda ? [] : tasks?.filter(task => task.due_date === today) ?? []
  const completed = todayTasks.filter(task => task.done).length
  const visibleDays = agenda && week
    ? days.filter(date => date === day || tasks?.some(task => task.due_date === date))
    : days
  function animateLayout() {
    if (!reduced) LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
  }
  return (
    <Page title={agenda ? "Agenda" : "Hoje"} subtitle={agenda ? "Planeje e acompanhe sua rotina" : undefined} header={agenda ? undefined : (
      <TodayHeader
        day={today}
        week={activity?.week ?? weekDates(today).map(date => activityForDay(date, [], [], []))}
        openDay={date => router.navigate({ pathname: "/agenda", params: { day: date } })}
        openProfile={() => router.navigate("/profile")}
      />
    )}>
      {!agenda && (
        <DailyPanel checkIns={dayCheckIns} onCheckIn={() => setChecking(today)} />
      )}
      {checking && (
        <CheckInForm day={checking} close={() => setChecking(undefined)} saved={() => run(load)} />
      )}
      {!agenda && (
        <TodayModules
          water={water} goal={goal} ready={!!tasks}
          pending={todayTasks.length - completed} done={completed} total={todayTasks.length}
          busy={action.busy} canUndo={!!undoId} taskOpen={!!editing}
          addWater={() => void run(async () => {
            await put("events", { type: "water.logged", payload: { amount: 1, source: "today", day: today } })
            void Haptics.selectionAsync().catch(() => {})
            await load()
          })}
          undoWater={() => void run(async () => {
            if (!undoId) return
            await remove("events", "id", undoId)
            await load()
          })}
          saveGoal={value => void run(() => prefs.save("water_goal", value))}
          newTask={() => { animateLayout(); setEditing("new") }}
        />
      )}
      {agenda && (
        <>
          <AgendaCalendar day={day} days={weekDates(day)} week={week} tasks={tasks}
            choose={date => { setDay(date); setWeek(false) }}
            move={direction => setDay(stepDay(day, direction * 7))}
            today={() => { setDay(today); setWeek(false) }} toggle={() => setWeek(false)} />
          {!week && <MotionIn key={day} distance={5} duration={175}>
            <AgendaDaySummary day={day} today={today} tasks={tasks} />
          </MotionIn>}
        </>
      )}
      <Row>
        <View style={{ flexGrow: 1 }}>
          <Copy heading label={agenda && week ? "Tarefas da semana" : !agenda || day === today ? "Tarefas de hoje" : "Tarefas do dia"} />
        </View>
        {agenda && !editing && (
          <Button label="Nova tarefa" icon="plus" variant="highlight" onPress={() => setEditing("new")} />
        )}
      </Row>
      {!!editing && (
        <TaskForm
          key={editing === "new" ? JSON.stringify(draft ?? "new") : editing.id}
          day={agenda ? day : today}
          task={editing === "new" ? undefined : editing}
          draft={editing === "new" ? draft : undefined}
          close={() => { setEditing(undefined); setDraft(undefined) }}
          saved={date => {
            if (agenda) setDay(date)
            return run(load)
          }}
        />
      )}
      <Status {...action} />
      {!!action.error && (
        <Button label="Atualizar registros" onPress={() => void run(load)} />
      )}
      {tasks &&
        visibleDays.map((date) => {
          const entries = tasks
            .filter((item) => item.due_date === date)
            .sort((a, b) =>
              (a.due_time ?? "99").localeCompare(b.due_time ?? "99"),
            )
          const Container = agenda && week ? Card : View
          return (
            <Container key={date}>
              {agenda && week && (
                <Copy
                  heading
                  label={new Date(date + "T12:00:00").toLocaleDateString(
                    "pt-BR",
                    { weekday: "long", day: "numeric", month: "short" },
                  )}
                />
              )}
              {!entries.length && (agenda && !week ? <AgendaEmpty /> :
                <Copy muted label={agenda ? "Nada agendado por aqui." : "Hoje está livre. Reserve tempo para o que importa."} />)}
              {entries.map((task) => {
                const linkedAgent = agendaAgent(task.category)
                return (
                <View key={task.id} style={[routineStyle.task, { borderTopColor: colors.line }, !agenda && routineStyle.timelineRow]}>
                  {!agenda && (
                    <View style={routineStyle.timeColumn}>
                      <Text style={[routineStyle.time, { color: colors.ink }]}>{task.due_time?.slice(0, 5) ?? "—"}</Text>
                      <View style={[routineStyle.timelineMark, { borderColor: colors.muted, backgroundColor: task.done ? colors.lime : colors.paper }]}>
                        {task.done && <Icon name="check" size={11} color={tones.onAction} />}
                      </View>
                    </View>
                  )}
                  <View style={[routineStyle.taskContent, !agenda && [routineStyle.timelineBody, { borderLeftColor: colors.line }]]}>
                  <View style={routineStyle.taskHeader}>
                    {agenda && linkedAgent && <AgentBadge agent={linkedAgent} />}
                    <View style={routineStyle.taskCopy}>
                      <Copy heading label={task.label} />
                      <Copy muted label={agenda ? [task.due_time?.slice(0, 5) || "Sem horário", task.category].join(", ") : task.category} />
                    </View>
                  </View>
                  <Row>
                    <Button
                      label={task.done ? "Concluída" : "Concluir"}
                      icon="check"
                      iconOnly={!agenda}
                      selected={task.done}
                      disabled={action.busy}
                      onPress={() =>
                        void run(async () => {
                          await put("tasks", { done: !task.done }, task.id)
                          animateLayout()
                          if (!task.done) void Haptics.selectionAsync().catch(() => {})
                          await load()
                          if (!task.done) await setTaskReminder(task.id, task.label, null)
                        })
                      }
                    />
                    <Button
                      label="Editar"
                      icon="edit"
                      iconOnly={!agenda}
                      selected={false}
                      onPress={() => setEditing(task)}
                    />
                    <Button
                      label="Excluir"
                      icon="trash"
                      iconOnly={!agenda}
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
                                await setTaskReminder(task.id, task.label, null)
                              }),
                          },
                        ])
                      }
                    />
                    {agenda && linkedAgent && (
                      <Button
                        label="Abrir agente"
                        icon="message"
                        selected={false}
                        onPress={() => router.navigate({ pathname: "/agents", params: { agent: linkedAgent } })}
                      />
                    )}
                  </Row>
                  </View>
                </View>
                )
              })}
            </Container>
          )
        })}
      {agenda && !week && tasks && <AgendaUpcoming tasks={tasks} day={day}
        showWeek={() => setWeek(true)} openDay={date => setDay(date)} />}
      {!agenda && (
        <>
          {!!activity && <TodayJourney days={activity.journey} goal={goal} />}
          <TodayAgents
            openAll={() => router.navigate({ pathname: "/agents", params: { agent: "" } })}
            openAgent={agent => router.navigate({ pathname: "/agents", params: { agent } })}
          />
          <Button label="Ver registros" icon="record" selected={false} onPress={() => router.navigate("/records")} />
        </>
      )}
    </Page>
  )
}

const routineStyle = StyleSheet.create({
  task: { borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: 12, gap: 8 },
  taskHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  taskCopy: { flex: 1, gap: 2 },
  timelineRow: { flexDirection: "row", gap: 8 },
  timeColumn: { width: 49, alignItems: "center", gap: 7 },
  time: { fontSize: 13, fontWeight: "800", fontVariant: ["tabular-nums"] },
  timelineMark: { width: 17, height: 17, borderRadius: 9, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  taskContent: { gap: 7 },
  timelineBody: { flex: 1, borderLeftWidth: StyleSheet.hairlineWidth, paddingLeft: 10 },
})

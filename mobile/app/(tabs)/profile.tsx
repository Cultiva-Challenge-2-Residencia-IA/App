import { useState } from "react"
import { Alert, Linking } from "react-native"
import { useRouter } from "expo-router"
import { useAccount } from "../../src/session"
import { client, fail, remove } from "../../src/backend"
import { usePreferences } from "../../src/preferences"
import { ReminderSettings } from "../../src/reminder-settings"
import { clearReminders } from "../../src/reminders"
import { AccountPanel, ProfileSection, ProfileSheet, SettingsRow, SettingsToggle, ThemePreviews, type ThemeName } from "../../src/profile-view"
import { Button, Copy, Field, Page, Row, Status, themes, useAction } from "../../src/ui"

type Panel = "account" | "reminders" | "safety" | "privacy"
const headings: Record<Panel, string> = {
  account: "Editar perfil",
  reminders: "Lembretes",
  safety: "Cuidado e segurança",
  privacy: "Dados e privacidade",
}
const consentFormat = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" })

function confirmDelete(title: string, description: string, label: string, removeItem: () => void) {
  Alert.alert(title, description, [
    { text: "Cancelar", style: "cancel" },
    { text: label, style: "destructive", onPress: removeItem },
  ])
}

export default function Profile() {
  const router = useRouter()
  const user = useAccount()
  const { values, save } = usePreferences()
  const action = useAction()
  const [panel, setPanel] = useState<Panel>()
  const [notice, setNotice] = useState("")
  const [draftName, setDraftName] = useState("")
  const [contactName, setContactName] = useState("")
  const [phone, setPhone] = useState("")

  const name = typeof user.user_metadata.name === "string" ? user.user_metadata.name : ""
  const consent = typeof user.user_metadata.consent_at === "string" ? Date.parse(user.user_metadata.consent_at) : NaN
  const contact = values.contact as { name?: string; phone?: string } | null | undefined
  const sharing = values.share_checkin === true
  const theme = typeof values.theme === "string" && Object.hasOwn(themes, values.theme)
    ? values.theme as ThemeName
    : "punk"

  function open(section: Panel) {
    setNotice("")
    if (section === "account") setDraftName(name)
    if (section === "safety") {
      setContactName(contact?.name ?? "")
      setPhone(contact?.phone ?? "")
    }
    setPanel(section)
  }

  function dial(number: string) {
    void action.run(async () => { await Linking.openURL("tel:" + number) })
  }

  function changeSharing(value: boolean) {
    void action.run(() => save("share_checkin", value))
  }

  function saveContact() {
    void action.run(async () => {
      const number = phone.replace(/[^+\d]/g, "")
      if (!contactName.trim() || !/^\+?\d{8,15}$/.test(number))
        throw new Error("Revise o nome e o telefone.")
      await save("contact", { name: contactName.trim(), phone: number })
      setNotice("Contato salvo.")
      setPanel(undefined)
    })
  }

  function deleteConversations() {
    confirmDelete("Apagar todas as conversas?", "A exclusão do histórico é permanente.", "Apagar conversas", () =>
      void action.run(async () => {
        await remove("messages", "owner", user.id)
        setNotice("Conversas apagadas.")
      }),
    )
  }

  function deleteAccount() {
    confirmDelete("Excluir conta e dados?", "Esta ação apaga permanentemente os dados da sua conta no Cultiva.", "Excluir conta", () =>
      void action.run(async () => {
        await clearReminders()
        fail((await client().rpc("delete_my_account")).error)
        fail((await client().auth.signOut({ scope: "local" })).error)
      }),
    )
  }

  function status() {
    return <>
      <Status {...action} />
      {!!notice && <Copy muted label={notice} />}
    </>
  }

  return (
    <Page title="Perfil" subtitle="Sua conta e preferências">
      <AccountPanel name={name} email={user.email ?? ""} onEdit={() => open("account")} />

      <ProfileSection>
        <SettingsRow icon="spark" title="Aparência" />
        <ThemePreviews selected={theme} disabled={action.busy}
          select={next => void action.run(() => save("theme", next))} />
      </ProfileSection>

      <ProfileSection>
        <SettingsRow icon="bell" title="Lembretes" description="Notificações neste aparelho" open={() => open("reminders")} />
      </ProfileSection>

      <ProfileSection>
        <SettingsRow icon="shield" title="Cuidado e segurança"
          description={contact?.name ? "Contato: " + contact.name : "Apoio emocional e contato de confiança"}
          open={() => open("safety")} />
        <Row>
          <Button label="CVV 188" icon="heart" selected={false} onPress={() => dial("188")} />
          {contact?.phone ? (
            <Button label="Ligar para contato" icon="user" selected={false} onPress={() => dial(contact.phone!)} />
          ) : (
            <Button label="Adicionar contato" icon="plus" selected={false} onPress={() => open("safety")} />
          )}
        </Row>
      </ProfileSection>

      <ProfileSection>
        <SettingsRow icon="record" title="Dados e privacidade" description="Consentimento e uso das informações"
          open={() => open("privacy")} />
        <SettingsToggle label="Compartilhar check-in com agentes" enabled={sharing} disabled={action.busy} change={changeSharing} />
      </ProfileSection>

      {!panel && status()}
      <Button label="Sair da conta" icon="logout" selected={false} disabled={action.busy}
        onPress={() => void action.run(async () => {
          await clearReminders()
          fail((await client().auth.signOut()).error)
        })} />

      {panel && (
        <ProfileSheet title={headings[panel]} close={() => { if (!action.busy) setPanel(undefined) }}>
          {panel === "account" && (
            <>
              <Copy muted label={user.email ?? ""} />
              <Field label="Nome" value={draftName} onChangeText={setDraftName} maxLength={100} />
              <Button label="Salvar nome" icon="check" disabled={action.busy} onPress={() => void action.run(async () => {
                if (draftName.trim().length < 2) throw new Error("Informe um nome válido.")
                fail((await client().auth.updateUser({ data: { name: draftName.trim() } })).error)
                setNotice("Nome atualizado.")
                setPanel(undefined)
              })} />
            </>
          )}
          {panel === "reminders" && (
            <>
              <ReminderSettings />
              <Copy muted label="Para receber lembretes de tarefas, defina um horário ao criar ou editar um compromisso." />
              <Button label="Abrir Agenda" icon="calendar" selected={false} onPress={() => {
                setPanel(undefined)
                router.navigate("/agenda")
              }} />
            </>
          )}
          {panel === "safety" && (
            <>
              <Copy label="Em uma emergência, procure atendimento imediato na sua região. Você também pode ligar para sua pessoa de confiança." />
              <Button label="Apoio emocional no Brasil · CVV 188" icon="heart" selected={false} onPress={() => dial("188")} />
              <Field label="Nome do contato de confiança" value={contactName} onChangeText={setContactName} maxLength={100} />
              <Field label="Telefone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={24} />
              <Row>
                <Button label="Salvar contato" icon="check" disabled={action.busy} onPress={saveContact} />
                {!!contact?.phone && (
                  <Button label="Remover contato" icon="trash" selected={false} disabled={action.busy}
                    onPress={() => void action.run(async () => {
                      await save("contact", null)
                      setContactName("")
                      setPhone("")
                      setNotice("Contato removido.")
                    })} />
                )}
              </Row>
            </>
          )}
          {panel === "privacy" && (
            <>
              <ProfileSection>
                <Copy heading label="Consentimento e compartilhamento" />
                {Number.isFinite(consent) && <Copy muted label={"Aceite no cadastro em " + consentFormat.format(consent)} />}
                <Copy label="Sua mensagem é enviada ao provedor do chat. Com o compartilhamento de check-in ativo, cada agente recebe apenas dados pertinentes ao seu tema, como humor e estresse para Saúde mental." />
                <SettingsToggle label="Compartilhar check-in com agentes" enabled={sharing} disabled={action.busy} change={changeSharing} />
                <Copy muted label="Ative o histórico nos ajustes de cada agente para incluir mensagens anteriores. Notas, documentos, anexos e observações privadas só entram na conversa quando você compartilha o conteúdo." />
              </ProfileSection>
              <ProfileSection>
                <Copy heading label="Exclusão de dados" />
                <Copy muted label="Cada ação abaixo exige confirmação." />
                <Button label="Apagar conversas" icon="trash" selected={false} disabled={action.busy} onPress={deleteConversations} />
                <Button label="Excluir conta e dados" icon="trash" selected={false} disabled={action.busy} onPress={deleteAccount} />
              </ProfileSection>
            </>
          )}
          {status()}
        </ProfileSheet>
      )}
    </Page>
  )
}

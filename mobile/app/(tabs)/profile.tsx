import { useState } from "react"
import { Alert, Linking } from "react-native"
import { useAccount } from "../../src/session"
import { client, fail, remove } from "../../src/backend"
import { usePreferences } from "../../src/preferences"
import { ReminderSettings } from "../../src/reminder-settings"
import { clearReminders } from "../../src/reminders"
import {
  Button,
  Card,
  Copy,
  Field,
  Page,
  Row,
  Status,
  useAction,
  themes,
} from "../../src/ui"

export default function Profile() {
  const user = useAccount()
  const [name, setName] = useState(String(user.user_metadata.name ?? ""))
  const { values, save } = usePreferences()
  const contact = values.contact as { name?: string ; phone?: string } | undefined
  const [contactName, setContactName] = useState(contact?.name ?? "")
  const [phone, setPhone] = useState(contact?.phone ?? "")
  const [notice, setNotice] = useState("")
  const action = useAction()

  return (
    <Page title="Perfil">
      <Card>
        <Copy heading label="Sua conta" />
        <Copy label={user.email ?? ""} />
        <Field
          label="Nome"
          value={name}
          onChangeText={setName}
          maxLength={100}
        />
        <Button
          label="Salvar nome"
          disabled={action.busy}
          onPress={() =>
            void action.run(async () => {
              if (name.trim().length < 2)
                throw new Error("Informe um nome válido.")
              fail(
                (
                  await client().auth.updateUser({
                    data: { name: name.trim() },
                  })
                ).error,
              )
              setNotice("Nome atualizado.")
            })
          }
        />
      </Card>
      <Card>
        <Copy heading label="Aparência" />
        <Row>
          {(Object.keys(themes) as Array<keyof typeof themes>).map((theme) => (
            <Button
              key={theme}
              label={theme}
              selected={(values.theme ?? "punk") === theme}
              disabled={action.busy}
              onPress={() => void action.run(() => save("theme", theme))}
            />
          ))}
        </Row>
      </Card>
      <ReminderSettings />
      <Card>
        <Copy heading label="Cuidado e segurança" />
        <Copy label="Em uma emergência, procure atendimento imediato na sua região. Você também pode ligar para sua pessoa de confiança." />
        <Button
          label="Apoio emocional no Brasil · CVV 188"
          selected={false}
          onPress={() =>
            void action.run(() => Linking.openURL("tel:188").then(() => {}))
          }
        />
        <Field
          label="Nome do contato de confiança"
          value={contactName}
          onChangeText={setContactName}
          maxLength={100}
        />
        <Field
          label="Telefone"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          maxLength={24}
        />
        <Row>
          <Button
            label="Salvar contato"
            disabled={action.busy}
            onPress={() =>
              void action.run(async () => {
                const number = phone.replace(/[^+\d]/g, "")
                if (!contactName.trim() || !/^\+?\d{8,15}$/.test(number))
                  throw new Error("Revise o nome e o telefone.")
                await save("contact", {
                  name: contactName.trim(),
                  phone: number,
                })
                setNotice("Contato salvo.")
              })
            }
          />
          {!!contact?.phone && (
            <Button
              label={"Ligar para " + (contact.name ?? "contato")}
              selected={false}
              onPress={() =>
                void action.run(() =>
                  Linking.openURL("tel:" + contact.phone).then(() => {}),
                )
              }
            />
          )}
          {!!contact?.phone && (
            <Button
              label="Remover contato"
              selected={false}
              disabled={action.busy}
              onPress={() =>
                void action.run(async () => {
                  await save("contact", null)
                  setContactName("")
                  setPhone("")
                  setNotice("Contato removido.")
                })
              }
            />
          )}
        </Row>
      </Card>
      <Card>
        <Copy heading label="Dados e consentimentos" />
        <Copy label="Ao ativar esta opção, parte do check-in mais recente é enviada ao provedor do chat quando você conversa com um agente." />
        <Button
          label={
            values.share_checkin === true
              ? "✓ Compartilhar check-in com agentes"
              : "Compartilhar check-in com agentes"
          }
          selected={values.share_checkin === true}
          disabled={action.busy}
          onPress={() =>
            void action.run(() =>
              save("share_checkin", values.share_checkin !== true),
            )
          }
        />
        <Button
          label="Apagar conversas"
          selected={false}
          disabled={action.busy}
          onPress={() =>
            Alert.alert(
              "Apagar todas as conversas?",
              "A exclusão é permanente.",
              [
                { text: "Cancelar", style: "cancel" },
                {
                  text: "Apagar",
                  style: "destructive",
                  onPress: () =>
                    void action.run(async () => {
                      await remove("messages", "owner", user.id)
                      setNotice("Conversas apagadas.")
                    }),
                },
              ],
            )
          }
        />
      </Card>
      <Status {...action} />
      {!!notice && <Copy label={notice} />}
      <Button
        label="Sair da conta"
        selected={false}
        disabled={action.busy}
        onPress={() =>
          void action.run(async () => {
            await clearReminders()
            fail((await client().auth.signOut()).error)
          })
        }
      />
      <Button
        label="Excluir conta e dados"
        selected={false}
        disabled={action.busy}
        onPress={() =>
          Alert.alert(
            "Excluir conta e dados?",
            "Esta ação apaga os dados da sua conta no Cultiva.",
            [
              { text: "Cancelar", style: "cancel" },
              {
                text: "Excluir conta",
                style: "destructive",
                onPress: () =>
                  void action.run(async () => {
                    await clearReminders()
                    fail((await client().rpc("delete_my_account")).error)
                    fail(
                      (await client().auth.signOut({ scope: "local" })).error,
                    )
                  }),
              },
            ],
          )
        }
      />
    </Page>
  )
}

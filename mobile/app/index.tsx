import { useContext, useState } from "react"
import { Redirect } from "expo-router"
import { client, fail } from "../src/backend"
import { SessionContext } from "../src/session"
import { Button, Card, Copy, Field, Page, Status, useAction } from "../src/ui"
import { validateRegistration } from "../../src/lib/validation"

type Mode = "login" | "register" | "recover" | "verify"

export default function Index() {
  const session = useContext(SessionContext)
  return session ? <Redirect href="/(tabs)/today" /> : <Access />
}

function Access() {
  const [mode, setMode] = useState<Mode>("login")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [code, setCode] = useState("")
  const [consent, setConsent] = useState(false)
  const [notice, setNotice] = useState("")
  const action = useAction()
  const titles: Record<Mode, string> = {
    login: "Entrar na sua conta",
    register: "Vamos nos conhecer?",
    recover: "Recuperar acesso",
    verify: "Definir nova senha",
  }

  function submit() {
    void action.run(async () => {
      const address = email.trim().toLowerCase()
      const auth = client().auth
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address))
        throw new Error("Informe um e-mail válido.")
      if (mode !== "recover" && password.length < 6)
        throw new Error("A senha precisa ter pelo menos 6 caracteres.")
      if (mode === "login")
        fail(
          (await auth.signInWithPassword({ email: address, password })).error,
        )
      if (mode === "register") {
        validateRegistration(name, address, password)
        if (!consent)
          throw new Error("Confirme o consentimento para criar a conta.")
        const { data, error } = await auth.signUp({
          email: address,
          password,
          options: {
            data: { name: name.trim(), consent_at: new Date().toISOString() },
          },
        })
        fail(error)
        if (!data.session) {
          setNotice("Confirme o cadastro pelo e-mail recebido e depois entre.")
          setMode("login")
        }
      }
      if (mode === "recover") {
        fail((await auth.resetPasswordForEmail(address)).error)
        setNotice("Digite o código enviado por e-mail.")
        setMode("verify")
      }
      if (mode === "verify") {
        if (!/^\d{6,10}$/.test(code.trim()))
          throw new Error("Informe o código recebido.")
        // Use a non-persisting client so verification cannot open the tabs early.
        const { verifyRecovery } = await import("../src/recovery")
        await verifyRecovery(address, code.trim(), password)
        setPassword("")
        setNotice("Senha atualizada. Entre com a nova senha.")
        setMode("login")
      }
    })
  }

  return (
    <Page title={titles[mode]}>
      <Card dark>
        <Copy heading light label="Seu cuidado, no seu ritmo." />
      </Card>
      {mode === "register" && (
        <Field
          label="Nome"
          value={name}
          onChangeText={setName}
          maxLength={100}
        />
      )}
      <Field
        label="E-mail"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      {mode === "verify" && (
        <Field
          label="Código"
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
        />
      )}
      {mode !== "recover" && (
        <Field
          label={mode === "verify" ? "Nova senha" : "Senha"}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
      )}
      {mode === "register" && (
        <>
          <Copy label="Seus registros ficam associados à sua conta. O envio de contexto para o chat pode ser ativado no Perfil." />
          <Button
            label={
              consent
                ? "✓ Autorizo o armazenamento dos meus registros"
                : "Autorizo o armazenamento dos meus registros"
            }
            selected={consent}
            onPress={() => setConsent(!consent)}
          />
        </>
      )}
      <Status {...action} />
      {!!notice && <Copy label={notice} />}
      <Button
        label={
          {
            login: "Entrar",
            register: "Criar conta",
            recover: "Enviar código",
            verify: "Atualizar senha",
          }[mode]
        }
        onPress={submit}
        disabled={action.busy}
      />
      {mode === "login" ? (
        <>
          <Button
            label="Criar uma conta"
            selected={false}
            disabled={action.busy}
            onPress={() => {
              setNotice("")
              setMode("register")
            }}
          />
          <Button
            label="Esqueci minha senha"
            selected={false}
            disabled={action.busy}
            onPress={() => {
              setNotice("")
              setMode("recover")
            }}
          />
        </>
      ) : (
        <Button
          label="Voltar ao login"
          selected={false}
          disabled={action.busy}
          onPress={() => {
            setNotice("")
            setMode("login")
          }}
        />
      )}
    </Page>
  )
}

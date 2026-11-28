import { useContext, useState } from "react"
import { Redirect } from "expo-router"
import { Keyboard, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native"
import { client, fail } from "../src/backend"
import { Icon } from "../src/icons"
import { SessionContext } from "../src/session"
import { BotanicalEtching } from "../src/today-art"
import { Button, Field, Page, Status, tones, useAction, usePalette } from "../src/ui"
import { validateRegistration } from "../../src/lib/validation"

type Mode = "login" | "register" | "recover" | "verify"

const accessCopy = {
  login: { title: "Entre na sua conta", submit: "Entrar" },
  register: { title: "Crie sua conta", submit: "Criar conta" },
  recover: { title: "Recupere seu acesso", submit: "Enviar código" },
  verify: { title: "Escolha uma nova senha", submit: "Atualizar senha" },
}

function AccessHeader({ title, compact }: { title: string; compact: boolean }) {
  const palette = usePalette()
  const { width, fontScale } = useWindowDimensions()
  const showArt = !compact && width >= 360 && fontScale < 1.25
  return (
    <View style={styles.frame}>
      <View style={styles.wordmark}>
        <View style={[styles.logo, { backgroundColor: palette.lime }]} importantForAccessibility="no-hide-descendants">
          <Icon name="leaf" size={18} color={tones.onAction} />
        </View>
        <Text style={[styles.brand, { color: palette.ink }]}>Cultiva</Text>
      </View>
      <View style={[styles.hero, { backgroundColor: palette.hero }, compact && styles.compactHero]}>
        {showArt && (
          <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.etching}>
            <BotanicalEtching ink={palette.lime} grid={tones.quietOnCanvas + "26"} />
          </View>
        )}
        <View style={[styles.heading, showArt && styles.withArt]}>
          <Text accessibilityRole="header" style={[styles.title, compact && styles.compactTitle]}>{title}</Text>
          <View style={[styles.rule, { backgroundColor: palette.lime }]} />
        </View>
      </View>
    </View>
  )
}

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
  const [showError, setShowError] = useState(false)
  const action = useAction()
  const palette = usePalette()
  const { title, submit: submitLabel } = accessCopy[mode]
  const isLogin = mode === "login"
  const isRegister = mode === "register"

  function changeMode(next: Mode) {
    Keyboard.dismiss()
    setNotice("")
    setShowError(false)
    setMode(next)
  }

  function submit() {
    void action.run(async () => {
      Keyboard.dismiss()
      setShowError(true)
      setNotice("")
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
    <Page key={mode} title={title} header={<AccessHeader title={title} compact={!isLogin && !isRegister} />}>
      <View style={styles.frame}>
        <View style={[styles.form, { backgroundColor: palette.surface, borderColor: palette.line }]}>
          {!!notice && (
            <View style={[styles.notice, { backgroundColor: palette.paper, borderLeftColor: palette.lime }]}>
              <Icon name="check" size={18} color={palette.ink} />
              <Text accessibilityLiveRegion="polite" style={[styles.noticeText, { color: palette.ink }]}>{notice}</Text>
            </View>
          )}
          {mode === "recover" && (
            <Text style={[styles.hint, { color: palette.muted }]}>Informe o e-mail da sua conta para receber um código de recuperação.</Text>
          )}
          {isRegister && (
            <Field label="Nome" value={name} onChangeText={setName} maxLength={100} autoComplete="name" autoCapitalize="words" />
          )}
          <Field
            label="E-mail"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            returnKeyType={mode === "recover" ? "go" : undefined}
            onSubmitEditing={mode === "recover" ? submit : undefined}
          />
          {mode === "verify" && (
            <Field label="Código do e-mail" value={code} onChangeText={setCode} keyboardType="number-pad"
              maxLength={10} autoComplete="one-time-code" />
          )}
          {mode !== "recover" && (
            <View style={styles.password}>
              <Field
                label={mode === "verify" ? "Nova senha" : "Senha"}
                value={password}
                onChangeText={setPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete={isLogin ? "current-password" : "new-password"}
                secureTextEntry
                returnKeyType={isRegister ? "done" : "go"}
                onSubmitEditing={isRegister ? undefined : submit}
              />
              {!isLogin && <Text style={[styles.hint, { color: palette.muted }]}>Use pelo menos 6 caracteres.</Text>}
              {isLogin && (
                <Pressable accessibilityRole="button" disabled={action.busy} onPress={() => changeMode("recover")}
                  style={({ pressed }) => [styles.recovery, pressed && styles.pressed]}>
                  <Text style={[styles.link, { color: palette.ink }]}>Esqueci minha senha</Text>
                </Pressable>
              )}
            </View>
          )}
          {isRegister && (
            <View style={[styles.consent, { borderTopColor: palette.line }]}>
              <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: consent, disabled: action.busy }}
                accessibilityLabel="Autorizo o armazenamento dos meus registros"
                disabled={action.busy} onPress={() => setConsent(current => !current)}
                style={({ pressed }) => [styles.consentRow, pressed && styles.pressed]}>
                <View style={[styles.checkbox, { borderColor: palette.ink, backgroundColor: consent ? palette.lime : palette.paper }]}>
                  {consent && <Icon name="check" size={15} color={tones.onAction} />}
                </View>
                <Text style={[styles.consentLabel, { color: palette.ink }]}>Autorizo o armazenamento dos meus registros</Text>
              </Pressable>
              <Text style={[styles.hint, { color: palette.muted }]}>Seus registros ficam associados à sua conta. Você pode autorizar o compartilhamento de contexto com os agentes no Perfil.</Text>
            </View>
          )}
          <Status busy={action.busy} error={showError ? action.error : undefined} />
          <Button label={submitLabel} icon="arrow" variant="highlight" onPress={submit} disabled={action.busy} />
        </View>
        <Pressable accessibilityRole="button"
          accessibilityLabel={isLogin ? "Criar uma conta" : "Voltar ao login"}
          disabled={action.busy} onPress={() => changeMode(isLogin ? "register" : "login")}
          style={({ pressed }) => [styles.switch, { borderTopColor: palette.line }, pressed && styles.pressed]}>
          {(isLogin || isRegister) && (
            <Text style={[styles.hint, { color: palette.muted }]}>{isLogin ? "Primeira vez no Cultiva?" : "Já tem uma conta?"}</Text>
          )}
          <Text style={[styles.link, { color: palette.ink }]}>{isLogin ? "Criar uma conta" : "Voltar ao login"}</Text>
          <View style={!isLogin && styles.backArrow} importantForAccessibility="no-hide-descendants">
            <Icon name="arrow" size={15} color={palette.ink} />
          </View>
        </Pressable>
      </View>
    </Page>
  )
}

const styles = StyleSheet.create({
  frame: { width: "100%", maxWidth: 480, alignSelf: "center", gap: 12 },
  wordmark: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 },
  logo: { width: 30, height: 30, alignItems: "center", justifyContent: "center", transform: [{ rotate: "-8deg" }] },
  brand: { fontSize: 19, fontWeight: "800", letterSpacing: -0.4 },
  hero: { padding: 20, minHeight: 148, justifyContent: "center", overflow: "hidden", borderRadius: 16 },
  compactHero: { minHeight: 0, paddingVertical: 16 },
  heading: { gap: 12 },
  withArt: { maxWidth: "66%" },
  title: { color: tones.onCanvas, fontSize: 39, fontWeight: "900", letterSpacing: -1.6 },
  compactTitle: { fontSize: 30, letterSpacing: -0.9 },
  rule: { width: 32, height: 3 },
  etching: { position: "absolute", width: 156, height: 156, top: -4, right: -15, opacity: 0.8 },
  form: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 16, padding: 16, gap: 14 },
  notice: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderLeftWidth: 3 },
  noticeText: { flex: 1, fontSize: 14, lineHeight: 20 },
  hint: { fontSize: 14, lineHeight: 20 },
  password: { gap: 5 },
  recovery: { alignSelf: "flex-end", justifyContent: "center", minHeight: 44, paddingHorizontal: 4 },
  link: { fontSize: 14, fontWeight: "800", textDecorationLine: "underline" },
  consent: { gap: 4, paddingTop: 4, borderTopWidth: StyleSheet.hairlineWidth },
  consentRow: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 48, paddingVertical: 4 },
  consentLabel: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: "700" },
  checkbox: { width: 22, height: 22, borderWidth: 1, borderRadius: 4, alignItems: "center", justifyContent: "center" },
  switch: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "center", columnGap: 6, rowGap: 4,
    minHeight: 48, borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: 10 },
  backArrow: { transform: [{ rotate: "180deg" }] },
  pressed: { opacity: 0.65 },
})

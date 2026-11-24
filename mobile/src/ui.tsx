import {
  createContext,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react"
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

export const themes = {
  punk: {
    paper: "#f1eee5",
    ink: "#171b18",
    accent: "#f36b3f",
    lime: "#d7ed54",
  },
  cutie: {
    paper: "#fff0f6",
    ink: "#422237",
    accent: "#f591b3",
    lime: "#ffcfe5",
  },
  gothic: {
    paper: "#211d28",
    ink: "#f4eaf7",
    accent: "#d1a8ef",
    lime: "#d1a8ef",
  },
  neon: {
    paper: "#14202a",
    ink: "#effaff",
    accent: "#62e7ff",
    lime: "#cbfc62",
  },
}
export const Palette = createContext(themes.punk)
export const usePalette = () => useContext(Palette)

export function useAction() {
  const lock = useRef(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  async function run(action: () => Promise<void>) {
    if (lock.current) return
    lock.current = true
    setBusy(true)
    setError("")
    try {
      await action()
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível concluir a operação.",
      )
    } finally {
      lock.current = false
      setBusy(false)
    }
  }
  return { busy, error, run }
}

export function Page({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  const color = usePalette()
  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={{ flex: 1, backgroundColor: color.paper }}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={style.page}
        >
          <Copy label="CULTIVA" />
          <Text
            accessibilityRole="header"
            style={[
              style.title,
              { color: color.ink, borderBottomColor: color.accent },
            ]}
          >
            {title}
          </Text>
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

export function Copy({
  label,
  heading,
  light,
}: {
  label: string
  heading?: boolean
  light?: boolean
}) {
  const color = usePalette()
  return (
    <Text
      style={[
        heading ? style.heading : style.copy,
        { color: light ? "#f1eee5" : color.ink },
      ]}
    >
      {label}
    </Text>
  )
}

export function Card({
  children,
  dark,
}: {
  children: ReactNode
  dark?: boolean
}) {
  const color = usePalette()
  return (
    <View
      style={[
        style.card,
        {
          borderColor: color.ink,
          backgroundColor: dark ? "#171b18" : color.paper,
        },
      ]}
    >
      {children}
    </View>
  )
}

export function Button({
  label,
  onPress,
  disabled,
  selected,
}: {
  label: string
  onPress: () => void
  disabled?: boolean
  selected?: boolean
}) {
  const color = usePalette()
  const filled = selected ?? true
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        style.button,
        {
          borderColor: color.ink,
          backgroundColor: filled ? color.accent : color.paper,
          opacity: disabled ? 0.45 : pressed ? 0.72 : 1,
        },
      ]}
    >
      <Text
        style={{ fontWeight: "700", color: filled ? "#171b18" : color.ink }}
      >
        {label}
      </Text>
    </Pressable>
  )
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  const color = usePalette()
  return (
    <View style={{ gap: 4 }}>
      <Copy label={label} />
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={color.ink}
        {...props}
        style={[
          style.field,
          { borderColor: color.ink, color: color.ink },
          props.multiline && { minHeight: 90, textAlignVertical: "top" },
        ]}
      />
    </View>
  )
}

export function Row({ children }: { children: ReactNode }) {
  return <View style={style.row}>{children}</View>
}

export function Status({ error, busy }: { error?: string ; busy?: boolean }) {
  return (
    <>
      {busy && <ActivityIndicator accessibilityLabel="Carregando" />}
      {!!error && (
        <Text accessibilityRole="alert" style={style.error}>
          {error}
        </Text>
      )}
    </>
  )
}

const style = StyleSheet.create({
  page: {
    padding: 20,
    paddingBottom: 36,
    gap: 16,
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
  },
  title: {
    fontSize: 34,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: -1,
    borderBottomWidth: 3,
    paddingBottom: 8,
  },
  heading: { fontSize: 21, fontWeight: "800", textTransform: "uppercase" },
  copy: { fontSize: 15, lineHeight: 21 },
  card: { padding: 16, borderWidth: 2, gap: 12 },
  button: {
    minHeight: 46,
    borderWidth: 1,
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
  field: { minHeight: 46, borderWidth: 1, padding: 10, fontSize: 16 },
  error: { backgroundColor: "#ffe3db", color: "#762719", padding: 10 },
})

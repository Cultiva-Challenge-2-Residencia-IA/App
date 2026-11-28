/* Hallmark v2.0.0 | app screen | custom editorial direction | Cultiva */
/* The daily check-in leads, with hydration and tasks presented as working data. */
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
import { Icon, type IconName } from "./icons"
import { MotionPressable } from "./motion"

export const tones = {
  canvas: "#171b18",
  onCanvas: "#f1eee5",
  onAction: "#171b18",
  quietOnCanvas: "#c1c9c1",
  errorSurface: "#ffe3db",
  errorInk: "#762719",
}

export const themes = {
  punk: {
    paper: "#f1eee5",
    ink: "#171b18",
    accent: "#f36b3f",
    lime: "#d7ed54",
    hero: "#161c16",
    surface: "#faf8f0",
    line: "#c7c3b8",
    muted: "#555b52",
  },
  cutie: {
    paper: "#fff0f6",
    ink: "#422237",
    accent: "#f591b3",
    lime: "#ffcfe5",
    hero: "#382333",
    surface: "#fff8fb",
    line: "#d6a8bc",
    muted: "#734a61",
  },
  gothic: {
    paper: "#211d28",
    ink: "#f4eaf7",
    accent: "#d1a8ef",
    lime: "#d1a8ef",
    hero: "#140e1a",
    surface: "#312839",
    line: "#63516f",
    muted: "#d0bcd8",
  },
  neon: {
    paper: "#14202a",
    ink: "#effaff",
    accent: "#62e7ff",
    lime: "#cbfc62",
    hero: "#081620",
    surface: "#1e303c",
    line: "#4e6876",
    muted: "#abc6d0",
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
  subtitle,
  onBack,
  header,
  children,
}: {
  title: string
  subtitle?: string
  onBack?: () => void
  header?: ReactNode
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
          {header ?? <View style={[style.pageHeader, { borderBottomColor: color.line }]}>
            <View style={style.brand}>
              <View style={[style.brandMark, { backgroundColor: color.lime }]}>
                <Icon name="leaf" size={16} color={tones.onAction} />
              </View>
              <Text style={[style.brandName, { color: color.ink }]}>Cultiva</Text>
            </View>
            <View style={style.titleRow}>
              {onBack && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Voltar aos agentes"
                  onPress={onBack}
                  style={({ pressed }) => [
                    style.backButton,
                    { backgroundColor: pressed ? color.surface : "transparent" },
                  ]}
                >
                  <View style={style.backIcon}>
                    <Icon name="arrow" size={24} color={color.ink} />
                  </View>
                </Pressable>
              )}
              <Text accessibilityRole="header" style={[style.title, { color: color.ink }]}>
                {title}
              </Text>
            </View>
            {subtitle && <Text style={[style.caption, { color: color.muted }]}>{subtitle}</Text>}
          </View>}
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
  muted,
  figure,
}: {
  label: string
  heading?: boolean
  light?: boolean
  muted?: boolean
  figure?: boolean
}) {
  const color = usePalette()
  return (
    <Text
      style={[
        figure ? style.figure : heading ? style.heading : style.copy,
        { color: light ? tones.onCanvas : muted ? color.muted : color.ink },
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
          backgroundColor: dark ? tones.canvas : color.surface,
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
  variant = "default",
  icon,
  iconOnly,
}: {
  label: string
  onPress: () => void
  disabled?: boolean
  selected?: boolean
  variant?: "default" | "highlight"
  icon?: IconName
  iconOnly?: boolean
}) {
  const color = usePalette()
  const [focused, setFocused] = useState(false)
  const filled = selected ?? true
  const ink = filled ? tones.onAction : color.ink
  return (
    <MotionPressable
      accessibilityRole="button"
      accessibilityLabel={iconOnly ? label : undefined}
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={[
        style.button,
        iconOnly && style.iconButton,
        {
          borderColor: filled ? "transparent" : color.line,
          backgroundColor: filled ? (variant === "highlight" ? color.lime : color.accent) : color.surface,
          outlineColor: variant === "highlight" ? color.lime : color.ink,
          outlineWidth: focused ? 2 : 0,
          outlineOffset: 2,
        },
      ]}
    >
      {icon && <Icon name={icon} color={ink} size={17} />}
      {!iconOnly && (
        <Text style={{ fontWeight: "700", color: ink, flexShrink: 1 }}>{label}</Text>
      )}
    </MotionPressable>
  )
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  const color = usePalette()
  const [focused, setFocused] = useState(false)
  return (
    <View style={{ gap: 4 }}>
      <Copy label={label} />
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={color.muted}
        {...props}
        onFocus={(event) => {
          setFocused(true)
          props.onFocus?.(event)
        }}
        onBlur={(event) => {
          setFocused(false)
          props.onBlur?.(event)
        }}
        style={[
          style.field,
          {
            borderColor: color.muted,
            backgroundColor: color.paper,
            color: color.ink,
            outlineColor: color.ink,
            outlineWidth: focused ? 2 : 0,
          },
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
  const color = usePalette()
  return (
    <>
      {busy && <ActivityIndicator color={color.ink} accessibilityLabel="Carregando" />}
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
    gap: 20,
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
  },
  pageHeader: { gap: 4, paddingTop: 6, paddingBottom: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  brand: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  brandMark: { width: 26, height: 26, alignItems: "center", justifyContent: "center", transform: [{ rotate: "-8deg" }] },
  brandName: { fontSize: 13, fontWeight: "800", letterSpacing: 0.5 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  backButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 10 },
  backIcon: { transform: [{ rotate: "180deg" }] },
  title: { flexShrink: 1, fontSize: 36, fontWeight: "800", letterSpacing: -1.2 },
  caption: { fontSize: 14, lineHeight: 20 },
  heading: { fontSize: 21, fontWeight: "700", letterSpacing: -0.4 },
  copy: { fontSize: 16, lineHeight: 23 },
  figure: { fontSize: 32, fontWeight: "700", fontVariant: ["tabular-nums"] },
  card: { padding: 18, borderRadius: 16, gap: 12 },
  button: {
    minHeight: 46,
    borderWidth: 1,
    borderRadius: 10,
    justifyContent: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
  iconButton: { minWidth: 44, paddingHorizontal: 8 },
  field: { minHeight: 48, borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 16 },
  error: { backgroundColor: tones.errorSurface, color: tones.errorInk, borderRadius: 10, padding: 12 },
})

import type { ReactNode } from "react"
import { KeyboardAvoidingView, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, useWindowDimensions, View } from "react-native"
import { useMotionReduced } from "./motion"
import { SafeAreaView } from "react-native-safe-area-context"
import { Icon, type IconName } from "./icons"
import { themes, tones, usePalette } from "./ui"

export type ThemeName = keyof typeof themes
const themeNames: Record<ThemeName, string> = { punk: "Punk", cutie: "Cutie", gothic: "Gothic", neon: "Neon" }

export function AccountPanel({ name, email, onEdit }: {
  name: string
  email: string
  onEdit: () => void
}) {
  const color = usePalette()
  const parts = (name || email.split("@")[0]).trim().split(/\s+/).filter(Boolean)
  const initials = (parts.length > 1
    ? [parts[0], parts.at(-1)!].map(part => Array.from(part)[0]).join("")
    : Array.from(parts[0] ?? "").slice(0, 2).join("")).toLocaleUpperCase("pt-BR")
  return (
    <View style={[styles.account, { backgroundColor: color.hero }]}>
      <View style={styles.identity}>
        <View importantForAccessibility="no-hide-descendants" style={[styles.avatar, { backgroundColor: color.lime }]}>
          {initials ? <Text style={styles.initials}>{initials}</Text> : <Icon name="user" color={tones.onAction} size={27} />}
        </View>
        <View style={styles.accountText}>
          <Text accessibilityRole="header" style={styles.accountTitle}>{name || "Sua conta"}</Text>
          {!!email && <Text style={styles.email}>{email}</Text>}
        </View>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Editar perfil" onPress={onEdit}
        style={({ pressed }) => [styles.edit, { borderColor: tones.quietOnCanvas, opacity: pressed ? 0.7 : 1 }]}>
        <Icon name="edit" color={tones.onCanvas} size={17} />
        <Text style={styles.editLabel}>Editar</Text>
      </Pressable>
    </View>
  )
}

export function ProfileSection({ children }: { children: ReactNode }) {
  const color = usePalette()
  return <View style={[styles.section, { backgroundColor: color.surface, borderColor: color.line }]}>{children}</View>
}

export function SettingsRow({ icon, title, description, open }: {
  icon: IconName
  title: string
  description?: string
  open?: () => void
}) {
  const color = usePalette()
  const contents = <>
    <Icon name={icon} color={color.ink} size={24} />
    <View style={styles.rowCopy}>
      <Text accessibilityRole={open ? undefined : "header"} style={[styles.rowTitle, { color: color.ink }]}>{title}</Text>
      {!!description && <Text style={[styles.rowDescription, { color: color.muted }]}>{description}</Text>}
    </View>
    {!!open && <Icon name="arrow" size={19} color={color.muted} />}
  </>
  return open ? (
    <Pressable accessibilityRole="button" onPress={open} style={({ pressed }) => [
      styles.row, { opacity: pressed ? 0.7 : 1 },
    ]}>{contents}</Pressable>
  ) : <View style={styles.row}>{contents}</View>
}

export function ThemePreviews({ selected, select, disabled }: {
  selected: ThemeName
  select: (theme: ThemeName) => void
  disabled: boolean
}) {
  const color = usePalette()
  const { width, fontScale } = useWindowDimensions()
  const columns = width >= 350 && fontScale <= 1.25
  return (
    <View style={styles.themes}>
      {(Object.keys(themes) as ThemeName[]).map(name => {
        const theme = themes[name]
        const active = selected === name
        return (
          <Pressable key={name} accessibilityRole="button" accessibilityLabel={`Tema ${themeNames[name]}`}
            accessibilityState={{ selected: active, disabled }} disabled={disabled} onPress={() => select(name)}
            style={({ pressed }) => [
              styles.theme,
              { flexBasis: columns ? "22%" : "47%", backgroundColor: color.paper, borderColor: active ? color.ink : color.line, opacity: pressed ? 0.72 : 1 },
            ]}>
            <View style={[styles.preview, { backgroundColor: theme.paper, borderColor: theme.line }]} importantForAccessibility="no-hide-descendants">
              <View style={[styles.previewHero, { backgroundColor: theme.hero }]}>
                <View style={[styles.previewMark, { backgroundColor: theme.lime }]} />
                <View style={[styles.previewStripe, { backgroundColor: theme.accent }]} />
              </View>
              <View style={styles.swatches}>
                <View style={[styles.swatch, { backgroundColor: theme.lime }]} />
                <View style={[styles.swatch, { backgroundColor: theme.accent }]} />
                <View style={[styles.swatch, { backgroundColor: theme.ink }]} />
              </View>
            </View>
            <Text style={[styles.themeName, { color: color.ink }]}>{themeNames[name]}</Text>
            {active && <View style={[styles.selected, { backgroundColor: color.lime }]}>
              <Icon name="check" size={12} color={tones.onAction} />
            </View>}
          </Pressable>
        )
      })}
    </View>
  )
}

export function SettingsToggle({ label, enabled, disabled, change }: {
  label: string
  enabled: boolean
  disabled?: boolean
  change: (value: boolean) => void
}) {
  const color = usePalette()
  return (
    <View style={styles.toggleRow}>
      <Text style={[styles.toggleLabel, { color: color.ink }]}>{label}</Text>
      <Switch accessibilityLabel={label} value={enabled} disabled={disabled} onValueChange={change}
        trackColor={{ false: color.line, true: color.lime }}
        thumbColor={enabled ? tones.onAction : tones.onCanvas}
        ios_backgroundColor={color.line} />
    </View>
  )
}

export function ProfileSheet({ title, close, children }: { title: string; close: () => void; children: ReactNode }) {
  const reduced = useMotionReduced()
  const color = usePalette()
  return (
    <Modal visible transparent animationType={reduced ? "none" : "slide"} onRequestClose={close}>
      <KeyboardAvoidingView behavior="padding" style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} accessibilityElementsHidden importantForAccessibility="no"
          onPress={close} />
        <SafeAreaView edges={["bottom", "left", "right"]}
          style={[styles.sheet, { backgroundColor: color.paper }]} accessibilityViewIsModal>
          <View style={[styles.sheetHeader, { borderBottomColor: color.line }]}>
            <Text accessibilityRole="header" style={[styles.sheetTitle, { color: color.ink }]}>{title}</Text>
            <Pressable style={styles.close} accessibilityRole="button" accessibilityLabel="Fechar painel" onPress={close}>
              <Icon name="close" color={color.ink} size={22} />
            </Pressable>
          </View>
          <ScrollView style={styles.sheetScroll} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.sheetContent}>
            {children}
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  account: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10, padding: 13, borderRadius: 15 },
  identity: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1, minWidth: 175 },
  avatar: { width: 54, height: 54, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  initials: { fontSize: 22, fontWeight: "900", color: tones.onAction },
  accountText: { flex: 1, gap: 3 },
  accountTitle: { fontSize: 21, fontWeight: "900", letterSpacing: -0.4, color: tones.onCanvas },
  email: { color: tones.quietOnCanvas, fontSize: 13, flexShrink: 1 },
  edit: { minHeight: 44, paddingHorizontal: 9, flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 9, borderWidth: 1 },
  editLabel: { color: tones.onCanvas, fontWeight: "700" },
  section: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 13, padding: 11, gap: 7 },
  row: { flexDirection: "row", alignItems: "center", minHeight: 45, gap: 9 },
  rowCopy: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 17, fontWeight: "800", letterSpacing: -0.35 },
  rowDescription: { fontSize: 13, lineHeight: 17 },
  themes: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  theme: { flexGrow: 1, minWidth: 0, padding: 4, gap: 4, borderRadius: 8, borderWidth: 1 },
  preview: { padding: 3, gap: 3, borderWidth: 1, borderRadius: 5 },
  previewHero: { height: 21, borderRadius: 3, gap: 2, justifyContent: "center", paddingLeft: 4 },
  previewMark: { width: "48%", height: 4, borderRadius: 2 },
  previewStripe: { width: "68%", height: 2, borderRadius: 1 },
  swatches: { flexDirection: "row", gap: 2 },
  swatch: { flex: 1, height: 5, borderRadius: 2 },
  themeName: { textAlign: "center", fontSize: 12, fontWeight: "800" },
  selected: { position: "absolute", top: 1, right: 1, width: 19, height: 19, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 44 },
  toggleLabel: { flex: 1, fontSize: 14, fontWeight: "600" },
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "#10151090" },
  sheet: { maxHeight: "90%", borderTopLeftRadius: 17, borderTopRightRadius: 17, paddingHorizontal: 14 },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", minHeight: 52, gap: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  sheetTitle: { flex: 1, fontSize: 21, fontWeight: "900", letterSpacing: -0.4 },
  sheetScroll: { flexGrow: 0, flexShrink: 1 },
  sheetContent: { gap: 12, paddingTop: 13, paddingBottom: 20 },
  close: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
})

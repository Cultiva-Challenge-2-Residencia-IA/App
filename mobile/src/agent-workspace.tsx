import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { Animated, Easing, Keyboard, KeyboardAvoidingView, Modal, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { agents, type Agent } from "./backend"
import { Icon, type IconName } from "./icons"
import { AgentMonogram } from "./today-art"
import { MotionIn, MotionPressable, useMotionReduced } from "./motion"
import { tones, usePalette } from "./ui"

const workspaceTabs = [
  { label: "Conversa", icon: "message" },
  { label: "Ferramentas", icon: "spark" },
  { label: "Notas", icon: "note" },
  { label: "Scanner", icon: "scan" },
] as const

export type WorkspaceTab = typeof workspaceTabs[number]["label"] | "Ajustes"
const workspaceScreens: WorkspaceTab[] = [...workspaceTabs.map(item => item.label), "Ajustes"]

function adjacentTab(index: number, displacement: number) {
  if (index < 0 || displacement === 0) return undefined
  return workspaceTabs[index + (displacement < 0 ? 1 : -1)]?.label
}

export type MenuAction = { label: string; icon: IconName; run: () => void; disabled?: boolean }

export function AgentMenu({ title, visible, close, actions }: {
  title: string
  visible: boolean
  close: () => void
  actions: MenuAction[]
}) {
  const colors = usePalette()
  const reduced = useMotionReduced()
  return (
    <Modal visible={visible} transparent animationType={reduced ? "none" : "slide"} onRequestClose={close}>
      <View style={styles.overlay}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fechar menu"
          onPress={close}
          style={StyleSheet.absoluteFill}
        />
        <SafeAreaView edges={["bottom"]} style={[styles.sheet, { backgroundColor: colors.paper }]}>
          <View style={styles.sheetHeader}>
            <Text accessibilityRole="header" style={[styles.sheetTitle, { color: colors.ink }]}>{title}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Fechar menu" onPress={close} style={styles.iconButton}>
              <Icon name="close" color={colors.ink} size={21} />
            </Pressable>
          </View>
          {actions.map(action => (
            <Pressable
              key={action.label}
              accessibilityRole="button"
              accessibilityState={{ disabled: action.disabled }}
              disabled={action.disabled}
              onPress={() => { close(); action.run() }}
              style={({ pressed }) => [
                styles.sheetItem,
                { borderTopColor: colors.line, backgroundColor: pressed ? colors.surface : colors.paper, opacity: action.disabled ? 0.5 : 1 },
              ]}
            >
              <Icon name={action.icon} color={colors.ink} size={21} />
              <Text style={[styles.sheetLabel, { color: colors.ink }]}>{action.label}</Text>
              <Icon name="arrow" color={colors.muted} size={17} />
            </Pressable>
          ))}
        </SafeAreaView>
      </View>
    </Modal>
  )
}

export function AgentWorkspace({ agent, tab, changeTab, back, screens }: {
  agent: Agent
  tab: WorkspaceTab
  changeTab: (tab: WorkspaceTab) => void
  back: () => void
  screens: Record<WorkspaceTab, ReactNode>
}) {
  const colors = usePalette()
  const reduced = useMotionReduced()
  const [settings, setSettings] = useState(false)
  const [keyboardOpen, setKeyboardOpen] = useState(false)
  const [visited, setVisited] = useState<WorkspaceTab[]>([tab])
  const [width, setWidth] = useState(0)
  const index = workspaceTabs.findIndex(item => item.label === tab)
  const position = useRef(new Animated.Value(Math.max(0, index))).current
  const tabWidth = width / workspaceTabs.length
  const offset = useMemo(() => Animated.multiply(position, tabWidth), [position, tabWidth])
  const swipe = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_, gesture) =>
      tab !== "Conversa" && !keyboardOpen && gesture.numberActiveTouches === 1 && Math.abs(gesture.dx) > 18 &&
      Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5 && !!adjacentTab(index, gesture.dx),
    onPanResponderRelease: (_, gesture) => {
      const distance = Math.abs(gesture.dx)
      if (distance < 52 && (distance < 24 || Math.abs(gesture.vx) < 0.45)) return
      if (distance <= Math.abs(gesture.dy) * 1.25) return
      const next = adjacentTab(index, gesture.dx)
      if (!next) return
      Keyboard.dismiss()
      changeTab(next)
    },
  }), [index, changeTab, tab, keyboardOpen])

  useEffect(() => {
    setVisited(current => current.includes(tab) ? current : [...current, tab])
  }, [tab])

  useEffect(() => {
    if (index < 0) return
    if (reduced) {
      position.setValue(index)
      return
    }
    const animation = Animated.timing(position, {
      toValue: index, duration: 200, easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== "web", isInteraction: false,
    })
    animation.start()
    return () => animation.stop()
  }, [index, position, reduced])
  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => setKeyboardOpen(true))
    const hide = Keyboard.addListener("keyboardDidHide", () => setKeyboardOpen(false))
    return () => { show.remove(); hide.remove() }
  }, [])
  return (
    <KeyboardAvoidingView style={[styles.screen, { backgroundColor: colors.paper }]} behavior="padding">
      <SafeAreaView edges={["top", "left", "right"]} style={styles.screen}>
        <MotionIn style={styles.heading} distance={10}>
          <MotionPressable accessibilityRole="button" accessibilityLabel="Voltar aos agentes" onPress={() => {
            Keyboard.dismiss()
            back()
          }} style={styles.iconButton}>
            <View style={styles.back}><Icon name="arrow" color={colors.ink} size={24} /></View>
          </MotionPressable>
          <View style={styles.identity}>
            <Text accessibilityRole="header" style={[styles.title, { color: colors.ink }]}>{agents[agent].title}</Text>
            {!keyboardOpen && (
              <Text style={[styles.subtitle, { color: colors.muted }]} numberOfLines={1}>{agents[agent].description}</Text>
            )}
          </View>
          {!keyboardOpen && (
            <View style={[styles.monogram, { backgroundColor: colors.lime }]} importantForAccessibility="no-hide-descendants">
              <AgentMonogram agent={agent} ink={tones.onAction} />
            </View>
          )}
          <Pressable accessibilityRole="button" accessibilityLabel="Menu do agente" accessibilityState={{ expanded: settings }}
            onPress={() => {
              Keyboard.dismiss()
              setSettings(true)
            }} style={({ pressed }) => [styles.iconButton, { backgroundColor: pressed ? colors.surface : "transparent" }]}>
            <Icon name="settings" size={22} color={colors.ink} />
          </Pressable>
        </MotionIn>
        <View style={styles.ribbon} onLayout={event => setWidth(event.nativeEvent.layout.width)}>
            {workspaceTabs.map(item => {
              const active = tab === item.label
              const color = active ? colors.accent : colors.muted
              return (
                <Pressable key={item.label} accessibilityRole="tab" accessibilityState={{ selected: active }}
                  onPress={() => { Keyboard.dismiss(); changeTab(item.label) }}
                  style={({ pressed }) => [styles.tab, pressed && styles.pressed]}>
                  <Icon name={item.icon} color={color} size={19} />
                  <Text
                    style={[styles.tabLabel, { color: active ? colors.ink : colors.muted, fontWeight: active ? "800" : "600" }]}>
                    {item.label}
                  </Text>
                </Pressable>
              )
            })}
          {index >= 0 && tabWidth > 0 && <Animated.View pointerEvents="none"
            style={[styles.indicatorTrack, { width: tabWidth, transform: [{ translateX: offset }] }]}>
            <View style={[styles.indicator, { backgroundColor: colors.accent }]} />
          </Animated.View>}
        </View>
        <View style={styles.screen} {...swipe.panHandlers}>
          {workspaceScreens.map(screen => {
            const active = screen === tab
            if (!active && !visited.includes(screen)) return null
            return <View key={screen} pointerEvents={active ? "auto" : "none"} accessibilityElementsHidden={!active}
              importantForAccessibility={active ? "auto" : "no-hide-descendants"}
              style={[StyleSheet.absoluteFill, !active && styles.inactiveScreen]}>
              {screen === "Conversa" ? screens[screen] : (
                <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.tools}>{screens[screen]}</ScrollView>
              )}
            </View>
          })}
        </View>
        <AgentMenu title="Menu do agente" visible={settings} close={() => setSettings(false)}
          actions={[{ label: "Ajustes do agente", icon: "settings", run: () => changeTab("Ajustes") }]} />
      </SafeAreaView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  heading: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 8, paddingTop: 3, paddingBottom: 7 },
  iconButton: { width: 44, height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  back: { transform: [{ rotate: "180deg" }] },
  identity: { flex: 1, gap: 1 },
  title: { fontSize: 27, fontWeight: "900", letterSpacing: -1 },
  subtitle: { fontSize: 12, lineHeight: 16 },
  monogram: { width: 40, height: 40, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  ribbon: { flexDirection: "row" },
  tab: { flex: 1, minWidth: 0, minHeight: 50, paddingHorizontal: 3, paddingTop: 3, paddingBottom: 8, alignItems: "center", justifyContent: "center", gap: 3 },
  tabLabel: { width: "100%", textAlign: "center", fontSize: 12 },
  pressed: { opacity: 0.68 },
  indicatorTrack: { position: "absolute", left: 0, bottom: 0, alignItems: "center" },
  indicator: { width: "68%", maxWidth: 58, height: 2, borderRadius: 1 },
  inactiveScreen: { opacity: 0 },
  tools: { alignSelf: "center", width: "100%", maxWidth: 720, padding: 14, paddingBottom: 32, gap: 12 },
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "#10151090" },
  sheet: { borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 14, paddingTop: 8 },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  sheetTitle: { fontSize: 19, fontWeight: "800" },
  sheetItem: { minHeight: 50, flexDirection: "row", alignItems: "center", borderTopWidth: StyleSheet.hairlineWidth, gap: 10, paddingHorizontal: 4 },
  sheetLabel: { flex: 1, fontSize: 16, fontWeight: "600" },
})

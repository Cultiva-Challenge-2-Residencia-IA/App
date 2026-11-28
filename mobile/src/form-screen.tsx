import type { ReactNode } from "react"
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Button, Copy, usePalette } from "./ui"
import { useReducedMotion } from "./today-motion"

export function FormScreen({ title, close, busy, children }: {
  title: string
  close: () => void
  busy?: boolean
  children: ReactNode
}) {
  const colors = usePalette()
  const reduced = useReducedMotion()
  return (
    <Modal visible animationType={reduced ? "none" : "slide"} onRequestClose={close}>
      <SafeAreaView style={[styles.screen, { backgroundColor: colors.paper }]}>
        <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={[styles.header, { borderBottomColor: colors.line }]}>
            <View style={styles.title}><Copy heading label={title} /></View>
            <Button label="Fechar formulário" icon="close" iconOnly selected={false} disabled={busy} onPress={close} />
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
            {children}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { flex: 1 },
  content: { gap: 16, padding: 20, paddingBottom: 40, width: "100%", maxWidth: 720, alignSelf: "center" },
})

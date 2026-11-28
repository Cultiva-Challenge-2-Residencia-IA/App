import { useCallback, useRef, useState } from "react"
import { useFocusEffect } from "expo-router"
import { Animated, Easing, StyleSheet, Text, useWindowDimensions, View } from "react-native"
import Svg, { Defs, Path, Pattern, Rect } from "react-native-svg"
import type { CheckIn } from "./backend"
import { Icon } from "./icons"
import { CheckInOrbits } from "./today-art"
import { useReducedMotion } from "./today-motion"
import { Button, Card, Copy, tones, usePalette } from "./ui"
import { FormScreen } from "./form-screen"

export function CheckInSteps({ step, onDark = false }: { step: number; onDark?: boolean }) {
  const colors = usePalette()
  return (
    <View accessible accessibilityLabel={step === 0 ? "Check-in com 4 etapas" : `Etapa ${step} de 4`} style={styles.steps}>
      <Text style={[styles.stepCaption, { color: onDark ? tones.onCanvas : colors.muted }]}>{step ? `${step} de 4` : "4 etapas"}</Text>
      <View style={styles.segments}>
        {[1, 2, 3, 4].map(index => (
          <View key={index} style={[styles.step, {
            backgroundColor: index <= step ? (onDark ? colors.lime : colors.ink) : (onDark ? colors.lime + "45" : colors.line),
          }]} />
        ))}
      </View>
    </View>
  )
}

const clock = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" })
const checkInScales = [
  { label: "Humor", key: "mood", levels: ["Muito ruim", "Ruim", "Regular", "Bom", "Muito bom"] },
  { label: "Energia", key: "energy", levels: ["Muito baixa", "Baixa", "Moderada", "Alta", "Muito alta"] },
  { label: "Estresse", key: "stress", levels: ["Muito baixo", "Baixo", "Moderado", "Alto", "Muito alto"] },
] as const

export function DailyPanel({ checkIns, onCheckIn }: {
  checkIns: CheckIn[]
  onCheckIn: () => void
}) {
  const colors = usePalette()
  const [showHistory, setShowHistory] = useState(false)
  const checkIn = checkIns[0]
  const reduced = useReducedMotion()
  const { width, fontScale } = useWindowDimensions()
  const compact = width < 345 || fontScale > 1.25
  const rotation = useRef(new Animated.Value(0)).current
  useFocusEffect(useCallback(() => {
    if (reduced || checkIn) {
      rotation.setValue(0)
      return
    }
    const drift = Animated.loop(Animated.sequence([
      Animated.timing(rotation, { toValue: 1, duration: 6400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(rotation, { toValue: 0, duration: 6400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]))
    drift.start()
    return () => drift.stop()
  }, [checkIn, reduced, rotation]))

  return (
    <View style={[styles.panel, { backgroundColor: colors.hero }]}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill} importantForAccessibility="no-hide-descendants">
        <Svg width="100%" height="100%" accessible={false}>
          <Defs>
            <Pattern id="grid" width={24} height={24} patternUnits="userSpaceOnUse">
              <Path d="M0 24V0H24" fill="none" stroke={colors.lime} strokeOpacity={0.12} />
            </Pattern>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#grid)" />
        </Svg>
      </View>
      <View style={styles.kicker}>
        <Icon name={checkIn ? "check" : "leaf"} size={17} color={colors.lime} />
        <Text style={[styles.kickerText, { color: colors.lime }]}>{checkIn ? "Check-in registrado" : "Check-in diário"}</Text>
      </View>
      {checkIn ? (
        <>
          <Text style={styles.title} accessibilityRole="header">Seu registro de hoje.</Text>
          <Text style={styles.description}>Último check-in às {clock.format(new Date(checkIn.created_at))}</Text>
          <View style={styles.responses}>
            {checkInScales.map(item => (
              <View key={item.label} style={[styles.response, { borderTopColor: colors.lime + "75" }]}>
                <Text style={styles.description}>{item.label}</Text>
                <Text style={styles.description}>{item.levels[checkIn[item.key] - 1]}</Text>
              </View>
            ))}
          </View>
          {!!checkIn.priority && <Text style={styles.description}>Prioridade: {checkIn.priority}</Text>}
        </>
      ) : (
        <View style={styles.content}>
          <View style={styles.message}>
            <Text style={[styles.title, compact && styles.compactTitle]} accessibilityRole="header">Como você está hoje?</Text>
            <Text style={styles.description}>Um momento para se cuidar e entender seu ritmo.</Text>
          </View>
          {!compact && (
            <Animated.View
              pointerEvents="none"
              importantForAccessibility="no-hide-descendants"
              style={[styles.orbits, { transform: [{ rotate: rotation.interpolate({ inputRange: [0, 1], outputRange: ["-5deg", "11deg"] }) }] }]}
            >
              <CheckInOrbits ink={colors.lime} />
            </Animated.View>
          )}
        </View>
      )}
      <View style={styles.actions}>
        <Button label={checkIn ? "Novo check-in" : "Fazer check-in"} icon="arrow" variant="highlight" onPress={onCheckIn} />
        {checkIn ? <Button label={checkIns.length > 1 ? "Histórico de hoje" : "Ver respostas"} onPress={() => setShowHistory(true)} selected={false} /> :
          <CheckInSteps step={0} onDark />}
      </View>
      {showHistory && <FormScreen title="Check-ins de hoje" close={() => setShowHistory(false)}>
        {checkIns.map(entry => (
          <Card key={entry.id}>
            <Copy heading label={clock.format(new Date(entry.created_at))} />
            {checkInScales.map(item => <Copy key={item.key} label={item.label + " · " + item.levels[entry[item.key] - 1]} />)}
            {!!entry.activity && <Copy label={"Atividade · " + entry.activity} />}
            {!!entry.food && <Copy label={"Alimentação · " + entry.food} />}
            <Copy label={(entry.water_mode === "additional" ? "Copos adicionais · " : "Total informado · ") + entry.water} />
            <Copy label={"Prioridade · " + entry.priority} />
            {!!entry.note && <Copy label={entry.note} />}
          </Card>
        ))}
      </FormScreen>}
    </View>
  )
}

const styles = StyleSheet.create({
  panel: { padding: 17, gap: 13, borderRadius: 17, overflow: "hidden" },
  kicker: { flexDirection: "row", alignItems: "center", gap: 8 },
  kickerText: { fontSize: 14, fontWeight: "700" },
  content: { flexDirection: "row", alignItems: "center", gap: 2 },
  message: { flex: 1, gap: 7 },
  title: { color: tones.onCanvas, fontSize: 36, fontWeight: "900", letterSpacing: -1.65 },
  compactTitle: { fontSize: 32 },
  description: { color: tones.onCanvas, fontSize: 13, lineHeight: 18 },
  orbits: { width: "39%", height: 140 },
  actions: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 10 },
  steps: { gap: 4 },
  stepCaption: { fontSize: 12, fontWeight: "600" },
  segments: { flexDirection: "row", gap: 4 },
  step: { width: 15, height: 5, borderRadius: 2 },
  responses: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  response: { flexGrow: 1, minWidth: 58, paddingVertical: 5, borderTopWidth: 1 },
  rating: { fontSize: 23, fontWeight: "800", fontVariant: ["tabular-nums"] },
})

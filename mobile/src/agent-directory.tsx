import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native"
import { MotionPressable } from "./motion"
import Svg, { Circle, Ellipse, G, Line, Path } from "react-native-svg"
import { agents, type Agent } from "./backend"
import { Icon } from "./icons"
import { AgentMonogram } from "./today-art"
import { Page, tones, usePalette } from "./ui"

const order = ["nutrition", "physical", "mental", "study"] as const

function Orbit({ ink, line }: { ink: string; line: string }) {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 144 137" accessible={false}>
      <G stroke={line} strokeWidth={0.6}>
        {[20, 42, 64, 86, 108, 130].map(x => <Line key={x} x1={x} x2={x} y1={5} y2={135} />)}
        {[18, 40, 62, 84, 106, 128].map(y => <Line key={y} x1={4} x2={141} y1={y} y2={y} />)}
      </G>
      <G stroke={ink} fill="none" strokeWidth={1.1}>
        <Circle cx={78} cy={69} r={45} strokeDasharray="1.5 3" />
        <Ellipse cx={78} cy={69} rx={61} ry={24} transform="rotate(-29 78 69)" />
        <Ellipse cx={78} cy={74} rx={61} ry={24} transform="rotate(-43 78 74)" />
      </G>
      <Path fill={ink} d="M79 55Q80 67 93 69Q80 70 79 83Q77 71 65 69Q77 67 79 55Z" />
    </Svg>
  )
}

function IntegrationMark({ ink, accent }: { ink: string; accent: string }) {
  return (
    <Svg width={100} height={76} viewBox="0 0 100 76" accessible={false}>
      <Path d="M8 68h21V52h20V36h20V20h20V4" fill="none" stroke={ink} strokeWidth={1.2} />
      <Path d="M29 52v16h20V52m0-16v16h20V36m0-16v16h20V20" fill="none" stroke={ink} strokeWidth={1.2} />
      <Path d="M89 4h10v32H89Z" fill={accent} stroke={ink} strokeWidth={1.2} />
    </Svg>
  )
}

export function AgentDirectory({ openAgent, openProfile }: {
  openAgent: (agent: Agent) => void
  openProfile: () => void
}) {
  const color = usePalette()
  const { width, fontScale } = useWindowDimensions()
  const columns = width >= 320 && fontScale <= 1.3
  return (
    <Page title="Agentes" header={
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.wordmark}>
            <View style={[styles.logo, { backgroundColor: color.lime }]}>
              <Icon name="leaf" color={tones.onAction} size={19} />
            </View>
            <Text style={[styles.brand, { color: color.ink }]}>Cultiva</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Abrir ajustes do perfil" onPress={openProfile}
            style={({ pressed }) => [styles.gear, { backgroundColor: pressed ? color.line : color.surface }]}>
            <Icon name="settings" size={22} color={color.ink} />
          </Pressable>
        </View>
        {columns && <View style={styles.orbit} pointerEvents="none" importantForAccessibility="no-hide-descendants">
          <Orbit ink={color.muted} line={color.line} />
        </View>}
        <Text accessibilityRole="header" style={[styles.title, { color: color.ink }]}>Agentes</Text>
        <Text style={[styles.deck, { color: color.ink, borderLeftColor: color.lime }, columns && styles.shortDeck]}>
          Converse, planeje e organize sua rotina com os agentes do Cultiva.
        </Text>
      </View>
    }>
      <View style={styles.grid}>
        {order.map((agent, index) => {
          const dark = index === 1 || index === 2
          const ink = dark ? tones.onCanvas : color.ink
          return (
            <MotionPressable key={agent} accessibilityRole="button" accessibilityLabel={`Abrir ${agents[agent].title}`}
              accessibilityHint={agents[agent].description} onPress={() => openAgent(agent)}
              style={[
                styles.tile,
                { flexBasis: columns ? "47%" : "100%", backgroundColor: dark ? color.hero : color.surface,
                  borderColor: dark ? color.hero : color.line },
              ]}>
              {!dark && <View pointerEvents="none" importantForAccessibility="no-hide-descendants" style={styles.curves}>
                <Svg width={62} height={58} viewBox="0 0 62 58" accessible={false}>
                  <Path d="M2 58A60 60 0 0 1 62 0M15 58A47 47 0 0 1 62 13M28 58A34 34 0 0 1 62 26"
                    fill="none" stroke={color.lime} strokeWidth={1.4} />
                </Svg>
              </View>}
              <View style={styles.cardTop}>
                <View style={styles.glyph} importantForAccessibility="no-hide-descendants">
                  <AgentMonogram agent={agent} ink={dark ? color.lime : color.ink} />
                </View>
                <View style={styles.arrow}><Icon name="arrow" color={ink} size={21} /></View>
              </View>
              <Text style={[styles.cardTitle, { color: ink }]}>{agents[agent].title}</Text>
              <Text style={[styles.description, { color: ink }]}>{agents[agent].description}</Text>
            </MotionPressable>
          )
        })}
      </View>
      <View style={[styles.integration, { borderLeftColor: color.lime }]}>
        <View style={styles.integrationCopy}>
          <Text accessibilityRole="header" style={[styles.integrationTitle, { color: color.ink }]}>Rotina integrada</Text>
          <Text style={[styles.description, { color: color.muted }]}>
            Leve sugestões dos agentes para a Agenda e acompanhe suas tarefas ao longo da semana.
          </Text>
        </View>
        {columns && <View importantForAccessibility="no-hide-descendants">
          <IntegrationMark ink={color.ink} accent={color.lime} />
        </View>}
      </View>
    </Page>
  )
}

const styles = StyleSheet.create({
  header: { gap: 12, paddingBottom: 6 },
  headerTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  wordmark: { flexDirection: "row", alignItems: "center", gap: 9 },
  logo: { width: 31, height: 31, transform: [{ rotate: "-9deg" }], alignItems: "center", justifyContent: "center" },
  brand: { fontSize: 18, fontWeight: "800" },
  gear: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  orbit: { position: "absolute", width: "43%", height: 135, right: 0, bottom: 0, opacity: 0.75 },
  title: { fontSize: 51, letterSpacing: -2.5, fontWeight: "900" },
  deck: { borderLeftWidth: 4, paddingLeft: 10, fontSize: 15, lineHeight: 21 },
  shortDeck: { maxWidth: "62%" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: { flexGrow: 1, minHeight: 153, borderRadius: 15, borderWidth: 1, padding: 11, gap: 5, overflow: "hidden" },
  cardTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  glyph: { width: 84, maxWidth: "74%", height: 56, justifyContent: "center", alignItems: "flex-start" },
  arrow: { transform: [{ rotate: "-45deg" }] },
  curves: { position: "absolute", bottom: 0, right: 0, opacity: 0.74 },
  cardTitle: { fontSize: 20, fontWeight: "900", letterSpacing: -0.6 },
  description: { fontSize: 14, lineHeight: 19 },
  integration: { flexDirection: "row", alignItems: "center", gap: 8, borderLeftWidth: 4, paddingLeft: 11 },
  integrationCopy: { flex: 1, gap: 4 },
  integrationTitle: { fontSize: 22, fontWeight: "900", letterSpacing: -0.65 },
})

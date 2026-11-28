import { StyleSheet, View } from "react-native"
import { agents, type Agent } from "./backend"
import { Icon, type IconName } from "./icons"

const agentArtwork = {
  nutrition: { icon: "leaf", ink: "#236749", paper: "#e0f0e7" },
  physical: { icon: "activity", ink: "#215d7c", paper: "#deeff7" },
  mental: { icon: "heart", ink: "#594885", paper: "#ebe4f9" },
  study: { icon: "book", ink: "#854128", paper: "#f8e5d9" },
} satisfies Record<Agent, { icon: IconName; ink: string; paper: string }>

export function AgentBadge({ agent }: { agent: Agent }) {
  const art = agentArtwork[agent]
  return (
    <View style={[styles.badge, { backgroundColor: art.paper }]}>
      <Icon name={art.icon} color={art.ink} size={25} />
    </View>
  )
}

const styles = StyleSheet.create({
  badge: { width: 44, height: 44, borderRadius: 11, alignItems: "center", justifyContent: "center" },
})

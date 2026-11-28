import { Tabs } from "expo-router"
import { Preferences } from "../../src/preferences"
import { NotebookProvider } from "../../src/notebook-data"
import { useAccount } from "../../src/session"
import { tones, usePalette } from "../../src/ui"
import { Icon, type IconName } from "../../src/icons"

const tabs = [
  { name: "today", title: "Hoje", icon: "home" },
  { name: "agents", title: "Agentes", icon: "spark" },
  { name: "agenda", title: "Agenda", icon: "calendar" },
  { name: "records", title: "Registros", icon: "record" },
  { name: "profile", title: "Perfil", icon: "user" },
] as const satisfies ReadonlyArray<{ name: string; title: string; icon: IconName }>

function Navigation() {
  const colors = usePalette()
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        animation: "none",
        sceneStyle: { backgroundColor: colors.paper },
        tabBarActiveTintColor: colors.lime,
        tabBarInactiveTintColor: tones.quietOnCanvas,
        tabBarStyle: { backgroundColor: colors.hero, borderTopWidth: 0 },
        tabBarLabelStyle: { fontWeight: "600", fontSize: 12 },
      }}
    >
      {tabs.map(tab => (
        <Tabs.Screen key={tab.name} name={tab.name} options={{
          title: tab.title,
          tabBarHideOnKeyboard: tab.name === "agents",
          tabBarIcon: ({ focused, size }) => (
            <Icon name={tab.icon} color={focused ? colors.lime : tones.quietOnCanvas} size={size} />
          ),
        }} />
      ))}
    </Tabs>
  )
}

export default function TabsLayout() {
  const account = useAccount()
  return (
    <Preferences>
      <NotebookProvider key={account.id}>
        <Navigation />
      </NotebookProvider>
    </Preferences>
  )
}

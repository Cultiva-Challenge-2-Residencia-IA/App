import { Tabs } from "expo-router"
import { Preferences } from "../../src/preferences"
import { usePalette } from "../../src/ui"

function Navigation() {
  const colors = usePalette()
  return (
    <Tabs
      initialRouteName="today"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.lime,
        tabBarInactiveTintColor: "#c1c9c1",
        tabBarStyle: { backgroundColor: "#171b18" },
        tabBarLabelStyle: { fontWeight: "700", fontSize: 11 },
      }}
    >
      <Tabs.Screen name="today" options={{ title: "Hoje" }} />
      <Tabs.Screen name="agents" options={{ title: "Agentes" }} />
      <Tabs.Screen name="agenda" options={{ title: "Agenda" }} />
      <Tabs.Screen name="records" options={{ title: "Registros" }} />
      <Tabs.Screen name="profile" options={{ title: "Perfil" }} />
    </Tabs>
  )
}

export default function TabsLayout() {
  return (
    <Preferences>
      <Navigation />
    </Preferences>
  )
}

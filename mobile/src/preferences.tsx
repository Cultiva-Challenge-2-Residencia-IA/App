import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import { client, fail, preference } from "./backend"
import { Page, Palette, Status, Button, themes, useAction } from "./ui"

type Values = Record<string, unknown>
const Context = createContext({
  values: {} as Values,
  save: async (_key: string, _value: unknown) => {},
})
export const usePreferences = () => useContext(Context)

export function Preferences({ children }: { children: ReactNode }) {
  const [values, setValues] = useState<Values>()
  const action = useAction()
  const load = () =>
    action.run(async () => {
      const { data, error } = await client()
        .from("preferences")
        .select("key,value")
      fail(error)
      setValues(
        Object.fromEntries((data ?? []).map((row) => [row.key, row.value])),
      )
    })
  useEffect(() => {
    void load()
  }, [])
  if (!values)
    return (
      <Page title="Preparando sua conta">
        <Status {...action} />
        {!!action.error && (
          <Button label="Tentar novamente" onPress={() => void load()} />
        )}
      </Page>
    )
  const theme =
    typeof values.theme === "string" && Object.hasOwn(themes, values.theme)
      ? themes[(values.theme as keyof typeof themes)]
      : themes.punk
  async function save(key: string, value: unknown) {
    await preference(key, value)
    setValues((current) => ({ ...current, [key]: value }))
  }
  return (
    <Context.Provider value={{ values, save }}>
      <Palette.Provider value={theme}>{children}</Palette.Provider>
    </Context.Provider>
  )
}

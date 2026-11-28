import { memo, useMemo } from "react"
import Markdown from "@ronradtke/react-native-markdown-display"
import { usePalette } from "./ui"

const rules = { image: () => null }
const allowLink = (url: string) => /^https?:\/\//i.test(url)

export const ChatMarkdown = memo(function ChatMarkdown({ text }: { text: string }) {
  const colors = usePalette()
  const style = useMemo(() => {
    const code = { backgroundColor: colors.paper, color: colors.ink, borderColor: colors.line }
    return {
      body: { color: colors.ink, fontSize: 15, lineHeight: 23 },
      heading1: { fontSize: 22, lineHeight: 29, fontWeight: "800" as const },
      heading2: { fontSize: 19, lineHeight: 26, fontWeight: "800" as const },
      heading3: { fontSize: 17, lineHeight: 24, fontWeight: "700" as const },
      paragraph: { marginTop: 2, marginBottom: 7 },
      blockquote: { backgroundColor: colors.paper, borderLeftColor: colors.line },
      link: { color: colors.ink, textDecorationLine: "underline" as const },
      hr: { backgroundColor: colors.line },
      table: { borderColor: colors.line },
      tr: { borderColor: colors.line },
      fence: code,
      code_block: code,
      code_inline: code,
    }
  }, [colors])

  return <Markdown style={style} rules={rules} onLinkPress={allowLink}>{text}</Markdown>
})

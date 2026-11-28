import { useEffect, useState } from "react"
import { Alert } from "react-native"
import * as DocumentPicker from "expo-document-picker"
import { File, Paths } from "expo-file-system"
import { randomUUID } from "expo-crypto"
import * as Sharing from "expo-sharing"
import { client, fail } from "./backend"
import { Button, Card, Copy, Row, Status, useAction } from "./ui"

const formats = {
  "application/pdf": "pdf",
  "image/png": "png",
  "image/jpeg": "jpg",
  "text/plain": "txt",
} as const
type Attachment = { id: string; name: string; mime: keyof typeof formats }

export function NotebookFiles({ noteId }: { noteId: string }) {
  const action = useAction()
  const [files, setFiles] = useState<Attachment[]>()
  async function load() {
    const { data, error } = await client().from("note_files").select("id,name,mime").eq("note_id", noteId).order("created_at")
    fail(error)
    setFiles(data as Attachment[])
  }
  useEffect(() => { void action.run(load) }, [noteId])

  function attach() {
    void action.run(async () => {
      const result = await DocumentPicker.getDocumentAsync({ type: Object.keys(formats), copyToCacheDirectory: true })
      if (result.canceled) return
      const asset = result.assets[0]
      const file = new File(asset.uri)
      try {
        const mime = asset.mimeType ?? file.type
        if (!Object.hasOwn(formats, mime)) throw new Error("Escolha um PDF, PNG, JPEG ou texto.")
        if (!file.size || file.size > 1048576) throw new Error("Escolha um arquivo de até 1 MB.")
        const { error } = await client().from("note_files").insert({
          note_id: noteId, name: asset.name.slice(0, 180), mime, content: await file.base64(),
        })
        fail(error)
        await load()
      } finally {
        const cache = Paths.cache.uri.replace(/\/$/, "") + "/"
        if (file.uri.startsWith(cache) && file.exists) file.delete()
      }
    })
  }

  function share(attachment: Attachment) {
    void action.run(async () => {
      if (!await Sharing.isAvailableAsync()) throw new Error("O compartilhamento está indisponível neste dispositivo.")
      const { data, error } = await client().from("note_files").select("content").eq("id", attachment.id).eq("note_id", noteId).single()
      fail(error)
      const file = new File(Paths.cache, "cultiva-" + randomUUID() + "." + formats[attachment.mime])
      file.create()
      try {
        file.write(data!.content, { encoding: "base64" })
        await Sharing.shareAsync(file.uri, { mimeType: attachment.mime })
      } finally {
        if (file.exists) file.delete()
      }
    })
  }

  return <Card>
    <Copy heading label="Anexos" />
    {files?.map(file => <Row key={file.id}>
      <Button label={file.name} icon="record" selected={false} disabled={action.busy} onPress={() => share(file)} />
      <Button label="Remover anexo" selected={false} disabled={action.busy} onPress={() => Alert.alert("Remover anexo?", file.name, [
        { text: "Cancelar", style: "cancel" },
        { text: "Remover", style: "destructive", onPress: () => void action.run(async () => {
          const { error } = await client().from("note_files").delete().eq("id", file.id).eq("note_id", noteId)
          fail(error)
          await load()
        }) },
      ])} />
    </Row>)}
    <Button label="Adicionar anexo" icon="plus" selected={false} disabled={action.busy} onPress={attach} />
    <Copy muted label="PDF, imagem ou texto de até 1 MB por arquivo." />
    <Status {...action} />
    {!!action.error && <Button label="Atualizar anexos" selected={false} onPress={() => void action.run(load)} />}
  </Card>
}

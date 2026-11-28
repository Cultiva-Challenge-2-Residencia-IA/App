# Cultiva para Android e iOS

O app usa Expo SDK 58, Expo Router, TypeScript e Supabase. Use Node.js 22.13 ou superior. O cliente envia a chave pública do projeto e a sessão do usuário. O servidor usa a chave privada do Groq para solicitar respostas aos agentes.

## Configuração

1. Crie ou use um projeto Supabase. Na raiz do repositório, vincule a CLI ao projeto e aplique a migração com `supabase link --project-ref <ref>` e `supabase db push`. Para um ambiente de desenvolvimento local com Docker, use `supabase start` e `supabase db reset`.
2. Habilite login por e-mail. No modelo **Reset Password**, inclua `{{ .Token }}` como código que o usuário digitará no aplicativo. Se confirmação de cadastro estiver ativa, configure o e-mail de confirmação e a URL do site. Use SMTP próprio antes de liberar o cadastro ao público.
3. Para habilitar o chat, configure `GROQ_API_KEY` e `GROQ_MODEL` como secrets do Supabase. Configure também `GROQ_VISION_MODEL` com um modelo que aceite imagens para ativar a extração do scanner. Publique com `supabase functions deploy agent-chat` e `supabase functions deploy scan-image`. As funções validam o token com Supabase Auth e compartilham uma quota por conta.
4. Em `mobile`, copie `.env.example` para `.env` e preencha a URL e a chave **publicável** do projeto. Aparelhos físicos precisam de uma URL acessível pela rede. Use HTTPS em produção.

```powershell
cd mobile
npm install
npm start
```

Abra o projeto no Expo Go compatível com SDK 58 ou numa development build. Após atualizar o SDK, encerre a sessão anterior do Metro e inicie com `npm start -- --clear` para gerar um novo QR code. Execute `npm run android` com um emulador Android configurado. No macOS com Xcode, execute `npm run ios` para o simulador iOS.

## Validação

Em **Agentes > Nutrição > Acompanhamento**, o plano ativo e o histórico usam as tabelas de preferências e eventos desta instalação. Para interpretar texto ou PDF, publique `supabase functions deploy nutrition-plan` no projeto que já tem `GROQ_API_KEY` e `GROQ_MODEL`. O PDF precisa conter texto selecionável e ter até 2 MB e 12 páginas. Para documentos digitalizados como imagem, salve um texto revisado no Scanner e use-o como fonte. O preenchimento manual também está disponível.

Para testar a integração dos agentes com a Agenda, publique a versão atual de `agent-chat` com `supabase functions deploy agent-chat`. Peça no chat um lembrete com data e horário. A resposta pode abrir um rascunho com o botão **Revisar lembrete na Agenda**. Revise e salve a tarefa. Marque **Notificar no horário** para agendar a notificação local neste aparelho, se as permissões estiverem disponíveis.

```powershell
npm run typecheck
npm run bundle
```

Na raiz do repositório, `supabase test db` executa os testes pgTAP contra o Supabase local. Eles cobrem persistência, retry de check-in, validação de limites, isolamento entre contas e exclusão em cascata.

Em dois dispositivos, teste cadastro e confirmação, recuperação por código, login, check-in com duas tarefas, alteração e conclusão na agenda, pesquisa de notas, chat com e sem contexto, câmera/galeria, CSV, permissões de notificações e retorno à sessão após reiniciar. Use uma segunda conta para verificar o isolamento. Teste exclusão com uma conta descartável.

## Dados e escopo

- A sessão persiste no SQLite do aparelho. Dados de rotina são sincronizados pelos endpoints do Supabase quando a aplicação está conectada.
- O scanner permite revisar uma foto do aparelho e salvar o texto confirmado com o agente de origem. A foto fica na prévia local até você pedir extração automática e autorizar o envio ao Groq.
- A exportação CSV usa o filtro e o período selecionados em Registros. O arquivo temporário é apagado após compartilhar.
- A exclusão apaga a conta e registros associados no Supabase. Retenção de backups e dados do provedor do chat é administrada nesses serviços.
- A versão Vite guarda dados no IndexedDB da instalação original. A transferência automatizada desses dados ainda precisa ser implementada.

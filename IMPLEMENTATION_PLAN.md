# Cultiva mobile

## Auditoria do projeto Vite

| Área | Estado encontrado |
| --- | --- |
| Navegação | Estado React alterna Hoje, Agentes, Agenda, Registros e Perfil. Agentes têm seletor e espaço com conversa, ferramentas, notas, scanner e ajustes. |
| Conta | Cadastro e login locais com digest SHA-256, sessão em localStorage e onboarding com consentimento. Sem verificação e recuperação de conta no servidor. |
| Hoje e check-in | Etapas de corpo, mente, prioridade e nota, com escalas, validação e escrita no IndexedDB. Prioridades alimentam tarefas. Hidratação usa eventos. |
| Agenda | Semana e dia, formulário de tarefa, categoria, data, hora e conclusão. |
| Agentes | Quatro especialidades. Chat, notas pesquisáveis e preferências locais. Chat usa middleware Vite com Groq e contexto opcional. Scanner seleciona foto e permite revisão manual. |
| Ferramentas | Registra água, conclusão de exercício, nota privada e revisão de flashcard. Há cartões, progresso, refeição e sessão ilustrativos. O cronômetro é local. |
| Registros e perfil | Filtros, agregações, CSV, temas, contatos, consentimentos, exclusão da conta e preferências. Algumas opções de lembrete apenas gravam preferências. |
| Infraestrutura | IndexedDB e cache de shell do service worker. Sem contas remotas, sincronização, API de produção ou políticas de isolamento no banco. |

## Arquitetura e sequência

- React e TypeScript reaproveitam as validações de cadastro e check-in. Componentes DOM, CSS, service worker e IndexedDB não são dependências do app nativo.
- Expo Router, componentes nativos e paleta Cultiva em um projeto `mobile`. O Vite continua disponível como referência e para acesso aos dados locais anteriores.
- Supabase Auth e PostgreSQL com chaves estrangeiras, validações e RLS por proprietário. Check-in e criação de tarefas derivados na mesma transação.
- Função autenticada para Groq com instruções controladas no servidor. O cliente recebe apenas a chave pública do Supabase.
- Dados anteriores residem no navegador de cada pessoa. A migração entre dispositivos depende de um fluxo explícito de exportação e importação por usuário.

## Acompanhamento

- [x] Auditoria e decisão de arquitetura.
- [x] Projeto Expo e rotas nativas para Hoje, Agentes, Agenda, Registros e Perfil.
- [x] Contas por e-mail, recuperação por código, persistência de sessão, migração SQL, RLS e operações dos fluxos principais.
- [x] Check-in, tarefas, notas, chat, ferramentas, scanner, CSV, lembretes locais, preferências e exclusão com confirmação.
- [x] Sete testes existentes, TypeScript e build do Vite aprovados. Migração testada em PostgreSQL embarcado (PGlite) com identidades simuladas, incluindo isolamento, check-in atômico, repetição, validação, conclusão de tarefa, quota de IA e exclusão em cascata.
- [x] TypeScript do Expo aprovado após a formatação, Metro iniciado na porta 8082 e bundles Hermes gerados para Android e iOS.
- [ ] Validação com projeto Supabase provisionado, provedor de e-mail e modelo Groq de chat e visão. O ambiente local não tinha daemon Docker acessível para executar o pgTAP via Supabase CLI.
- [ ] Validar em dispositivos Android e iOS, incluindo teclado, câmera, notificações e compartilhamento.
- [ ] Importação de históricos das instalações Vite. Áudio, PDF, fila offline e vitrine profissional continuam como itens de evolução do produto.

Referências: [Expo SDK 56](https://docs.expo.dev/versions/v56.0.0/), [Supabase com React Native](https://supabase.com/docs/guides/getting-started/quickstarts/expo-react-native).

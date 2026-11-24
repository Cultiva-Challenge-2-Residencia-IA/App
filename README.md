# Cultiva

O aplicativo React Native para Android e iOS está em [mobile](mobile/README.md). Consulte o [plano de implementação](IMPLEMENTATION_PLAN.md) para acompanhar a migração. As instruções abaixo descrevem o frontend Vite.

Aplicação local-first de rotina e bem-estar, com check-in, agenda, registros e agentes especializados.

## Rodar localmente

Requisitos: Node.js 20+ e pnpm.

```powershell
pnpm install
Copy-Item .env.example .env
# edite .env e informe GROQ_API_KEY para habilitar os agentes
pnpm dev
```

Abra `http://localhost:8443`.

## Validar antes de entregar

```powershell
pnpm exec tsc --noEmit
pnpm test
pnpm run build
```

Sem `GROQ_API_KEY`, o restante da aplicação continua disponível, mas as conversas com agentes retornam uma indisponibilidade explícita.

## Dados e privacidade

Contas, check-ins, tarefas, mensagens, notas, eventos e preferências são armazenados no IndexedDB do navegador. O login é local ao dispositivo; não existe servidor de contas ou recuperação remota de senha. A chave do Groq é usada somente pelo middleware do Vite e não é enviada ao bundle do navegador.

Para testar uma conta nova, saia pelo Perfil e selecione **Criar conta** na tela de login. Para limpar completamente os dados da conta atual, use **Excluir todos os meus dados**.

## Status frente aos requisitos

Implementado no MVP local: cadastro/login/logout, onboarding com consentimento geral, check-in validado, tarefas e Agenda em IndexedDB, histórico de eventos, notas e conversas persistidas por agente, scanner com câmera/galeria e confirmação manual, preferências persistidas, exportação CSV, exclusão local e modo offline básico.

Limitações conhecidas antes de uma submissão de produção:

- não há recuperação de senha por e-mail nem servidor de contas;
- o scanner ainda não envia imagem para OCR/visão; ele oferece revisão manual local;
- ainda não há entrada de áudio, leitura de PDF, geração de PDF ou notificações agendadas;
- as respostas dos agentes não têm recuperação de fontes aprovada nem rastreabilidade de prompt/modelo por resposta;
- detecção automática de risco e encaminhamento para CVV 188 ainda precisam de uma camada determinística e testes de segurança;
- o serviço offline usa cache de shell, sem fila de sincronização;
- exclusão e exportação cobrem o dispositivo atual; não existe provedor remoto para confirmar remoção;
- a área de profissionais/vitrine está fora do MVP local.

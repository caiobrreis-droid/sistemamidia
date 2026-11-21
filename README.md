# Estúdio Mídia

Quadro de produção da equipe de mídia do **Vereador Julio Cezar** e da **Deputada Aurelina Medeiros**.
Fluxo: Planejar → Executar → Aprovar → Finalizar → Concluído.

## Rodar localmente

Precisa de um PostgreSQL. Crie um arquivo `.env` (já está no `.gitignore`) com:

```
DATABASE_URL=postgres://usuario:senha@localhost:5432/sistemamidia
ADMIN_EMAIL=voce@exemplo.com
ADMIN_PASSWORD=uma-senha
ADMIN_NAME=Seu Nome
```

Em dois terminais:

```bash
npm run server
```

```bash
npm run dev
```

Abra http://localhost:5173. O administrador é criado no primeiro boot, quando o banco ainda não tem usuários.

## Produção (Railway)

Projeto `sistemamidia` no Railway, com o serviço `web` (este repositório, deploy a cada push na `main`) e o `Postgres`.

Variáveis do `web`: `DATABASE_URL=${{Postgres.DATABASE_URL}}`, `NODE_ENV=production`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (chaves de notificação; gere com `npx web-push generate-vapid-keys`).

## Stack

- React 19 + TypeScript + Vite, Tailwind CSS v4, dnd-kit, Motion
- Node + Express + PostgreSQL (`server/`)
- Login por e-mail e senha (scrypt), sessão em cookie httpOnly
- Tempo real via Server-Sent Events: o que um muda aparece para todos

## O que já tem

- Quadro com 5 etapas e arrastar entre colunas
- Cartões com capa, mandato (JC / AM / Ambos), formato, prioridade, datas e responsáveis
- Briefing, checklist, conversa e troca de etapa
- Filtros por mandato, pessoa e busca; indicadores no topo
- Equipe: administradores cadastram e removem pessoas; cada um troca a própria senha
- Plano de fundo pessoal (avatar → Plano de fundo): fundos prontos, cor sólida, foto própria, escurecer e desfocar; salvo por usuário
- Atalhos: `/` busca, `N` nova pauta, `Esc` fecha

## App instalável e notificações

- O sistema é um PWA: no Chrome/Edge (computador e Android) aparece **Instalar app**; no iPhone, Safari → Compartilhar → **Adicionar à Tela de Início**.
- O sino no topo ativa as notificações neste aparelho. No iPhone, só funciona com o app instalado (iOS 16.4+).
- Quem é responsável por um cartão é avisado quando ele muda de etapa (ex.: chega em **Executar**), quando é incluído num cartão e quando alguém comenta.
- Ícones gerados por `node scripts/icons.mjs`.

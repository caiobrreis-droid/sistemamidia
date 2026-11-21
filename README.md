# Estúdio Mídia

Quadro de produção da equipe de mídia do **Vereador Julio Cezar** e da **Deputada Aurelina Medeiros**.
Fluxo: Planejar → Executar → Aprovar → Finalizar → Concluído.

## Rodar

```bash
npm install
npm run dev
```

Abra http://localhost:5173.

## Stack

- React 19 + TypeScript + Vite
- Tailwind CSS v4
- dnd-kit (arrastar e soltar, com suporte a teclado)
- Motion (animações), lucide-react (ícones)

## O que já tem

- Quadro com 5 etapas e arrastar entre colunas
- Cartões com capa (gradiente ou imagem enviada), mandato (JC / AM / Ambos), formato, prioridade, datas, responsáveis
- Modal com briefing, checklist com progresso, conversa e troca de etapa
- Filtros por mandato, por pessoa e busca
- Indicadores: em andamento, vencem hoje, atrasadas, publicadas
- Atalhos: `/` busca, `N` nova pauta, `Esc` fecha

## Estado atual

Os dados ficam no `localStorage` do navegador (`src/store.ts`). O próximo passo é um backend
(Node + PostgreSQL) com login para a equipe compartilhar o mesmo quadro.

# Componentização Segura: WhatsNewModal.tsx

> **Para agentes de execução:** Esta tarefa segue estritamente a diretriz de zero alteração de comportamento. Cada subcomponente reproduz exatamente os mesmos nós JSX, classes Tailwind, estilos e dados das versões originais.

## Checklist de Execução Incremental

- [x] **Step 2.1:** Criar diretório `src/web/components/whats-new/`
- [x] **Step 2.2:** Extrair `whatsNewData.ts`
  - Estrutura de dados tipada com todas as versões (`3.5.0`, `3.0.0`, `2.5.3`, `2.5.2`, `2.5.1`, `2.5.0`).
  - Mapeamento idêntico de ícones Lucide, títulos, badges, descrições e itens destacados de cada versão.
  - Gate de validação: `tsc --noEmit` [Passou]
- [x] **Step 2.3:** Extrair `WhatsNewVersionContent.tsx`
  - Renderizador declarativo e fiel que reproduz exatamente a mesma grade de cards e itens com suporte a `isLight` e temas.
  - Preservação de tags inline (`<code>.zip</code>` e `(<i>pro-rata die</i>)`).
  - Gate de validação: `tsc --noEmit` [Passou]
- [x] **Step 2.4:** Atualizar `WhatsNewModal.tsx` (Orquestrador)
  - Reduzido de 738 linhas para 197 linhas (-73.3%), delegando o corpo de versão para `WhatsNewVersionContent.tsx`.
  - Preservado integralmente: verificação de versão vista via SQLite e localStorage, animação `AnimatePresence` + `motion.div`, navegação entre abas de versão e botão fechar.
  - Gate de validação: `tsc --noEmit` [Passou]
- [x] **Step 2.5:** Validação Geral contra a Baseline
  - `npx vitest run`: 25 suítes, 168 testes passando, 1 ignorado, 0 falhas (inclui 5 novos testes de integridade em `whatsNewData.test.ts`).
  - `npm run lint`: 0 erros no typecheck Web e Electron.
  - `npm run build`: código 0 (Vite web + Electron compilados).

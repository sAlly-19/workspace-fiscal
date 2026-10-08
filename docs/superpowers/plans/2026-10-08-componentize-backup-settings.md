# Plano de Componentização Segura: BackupSettingsTab.tsx

> **Regra Principal:** Zero alteração de comportamento. Preservação estrita de toda a lógica de negócio, chamadas de API (`/api/backup/*`), inspeção de manifestos, backups de emergência, seleção de módulos, classes Tailwind, estilos e acessibilidade.

## 1. Diagnóstico Arquitetural
- **Arquivo:** `src/web/components/settings/BackupSettingsTab.tsx` (659 linhas)
- **Papel:** Painel central de gerenciamento e restauração de cópias de segurança (.wfb e legadas).
- **Problema Estrutural:** Concentra em um único arquivo a criação de backup com seleção de módulos e stats, a inspeção/restauração com aviso de segurança e seleção seletiva de módulos, e a configuração de agendamento automático e retenção.

## 2. Estratégia de Decomposição Segura (4 Etapas Incrementais)

### Etapa 1: Extrair `BackupCreateSection.tsx` [CONCLUÍDO]
- **Arquivo:** `src/web/components/settings/backup/BackupCreateSection.tsx` (139 linhas)
- **Responsabilidade:** Seção 1 — Criar Backup Estruturado (.wfb)
  - Cards de seleção dos 3 módulos: NF View, Depreciação e Configurações com contadores em tempo real.
  - Botão com spinner de compactação e acionamento de `handleCreateBackup`.
- **Gate de Validação:** `tsc --noEmit` aprovado.

### Etapa 2: Extrair `BackupRestoreSection.tsx` [CONCLUÍDO]
- **Arquivo:** `src/web/components/settings/backup/BackupRestoreSection.tsx` (168 linhas)
- **Responsabilidade:** Seção 2 — Restaurar Backup Seguro
  - Botão de seleção de arquivo (`window.api.openBackupDialog`).
  - Painel de inspeção de manifesto (versão, data de criação, arquivo, aviso legado).
  - Checkboxes dos módulos a restaurar.
  - Alerta de proteção e backup de emergência com `ShieldCheck`.
  - Botão "Restaurar Dados Selecionados" e indicador de status durante restauração.
- **Gate de Validação:** `tsc --noEmit` aprovado.

### Etapa 3: Extrair `BackupAutoScheduleSection.tsx` [CONCLUÍDO]
- **Arquivo:** `src/web/components/settings/backup/BackupAutoScheduleSection.tsx` (116 linhas)
- **Responsabilidade:** Seção 3 — Rotina de Backup Automático
  - Switch de habilitação do backup automático.
  - Inputs numéricos de intervalo (dias) e retenção máxima com autosave (`onBlur`).
  - Input de pasta de destino com autosave (`onBlur`).
  - Resumo de backups salvos e data do último backup.
- **Gate de Validação:** `tsc --noEmit` aprovado.

### Etapa 4: Refatorar `BackupSettingsTab.tsx` e Validação Geral contra a Baseline [CONCLUÍDO]
- **Arquivo:** `src/web/components/settings/BackupSettingsTab.tsx`
- Integrar os 3 componentes extraídos, mantendo estado central e `ConfirmModal`.
- Criar suíte de testes unitários `src/web/components/settings/backup/backup-sections.test.ts` (5 testes passando).
- Redução: de 659 linhas para 248 linhas (-411 linhas, -62.4% no arquivo raiz).
- **Gate de Validação contra a Baseline:**
  - `npx vitest run`: 32 suítes, 214 testes passando, 1 ignorado, 0 falhas (+5 novos testes unitários).
  - `npm run lint`: 0 erros (typecheck Web e Electron com código 0).
  - `npm run build`: código 0 (Vite web + Electron empacotados com sucesso).
  - Commit local seguro (sem git push).


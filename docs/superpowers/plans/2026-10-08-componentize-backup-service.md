# Plano de Componentização: backup.service.ts

> **Meta:** Reduzir a complexidade de `src/api/services/backup.service.ts` (1.080 linhas) através de separação em submódulos coesos, com **zero alteração de comportamento, integridade transacional, rotinas de compactação ou logs de auditoria**.

---

## 1. Diagnóstico Estrutural

O arquivo `backup.service.ts` concentra:
1. **Contratos e Tipos:** `BackupModule`, `BackupSettings`, `BackupManifest`, `BackupInspectionResult`, `DatabaseStats`.
2. **Inspeção de Integridade (`inspectBackup`):** Suporte a `.wfb` e SQLite legado com `PRAGMA integrity_check`.
3. **Criação de Backups (`createBackup`, `createSafetyBackup`):** Coleta seletiva por módulo, compactação com `AdmZip`, flush de WAL e backup de emergência.
4. **Restauração Transacional (`restoreBackup`):** Transação atômica (`BEGIN IMMEDIATE TRANSACTION`), deleção reversa de tabelas, inserção ordenada, extração de XMLs para storage, verificação de chaves estrangeiras (`foreign_key_check`) e rollback automático.
5. **Agendamento e Retenção (`maybeRunIfDue`, `applyRetention`, `listBackups`):** Gerenciamento de arquivos e temporizador.
6. **Estatísticas do Banco (`getDatabaseStats`):** Contadores agregados por módulo fiscal.

---

## 2. Divisão de Submódulos

Diretório alvo: `src/api/services/backup/`

1. `backup.types.ts`: Tipos, interfaces e funções de resolução de caminhos (`getDefaultDestination`).
2. `backup-stats.ts`: Contagem de registros e estatísticas das tabelas do banco.
3. `backup-inspector.ts`: Validação de integridade para pacotes `.wfb` e arquivos `.db` legados.
4. `backup-creator.ts`: Rotinas de criação de pacotes `.wfb` e safety backups.
5. `backup-restorer.ts`: Restauração atômica transacional de módulos e bancos legados.
6. `backup-scheduler.ts`: Políticas de retenção, agendamento e listagem de backups no disco.
7. `index.ts`: Barrel export para os submódulos de backup.
8. `backup.service.ts` (refatorado): Orquestrador central reduzido para ~130 linhas.
9. `backup-modules.test.ts`: Testes unitários para inspeção e utilitários.

---

## 3. Protocolo de Validação
- Executar `backup.service.test.ts` e suíte completa Vitest.
- Executar `npm run lint` (0 erros).
- Executar `npm run build` (código 0).
- Auditoria do Agente 5 e commit local (sem `git push`).


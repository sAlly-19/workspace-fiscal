# Relatório 08: Resumo Executivo para Gestão Técnica

**Projeto:** `workspace-fiscal`  
**Versão Base:** v3.5.1  
**Público-Alvo:** Gestores Técnicos, Tech Leads e Arquitetos de Software  
**Data:** 13 de Outubro de 2026

---

## 1. Visão Geral do Produto e Situação Atual

O **Workspace Fiscal** consolidou-se como uma plataforma desktop robusta e especializada na automação contábil-fiscal brasileira. Na versão atual (v3.5.1):
- A suíte contempla importação e gestão de NF-e, CT-e e NFS-e, motor de busca automática em WebServices governamentais (SEFAZ e NFS-e Padrão Nacional) e controle de ativo imobilizado com cálculo de depreciação.
- O código-fonte passou por uma ampla campanha de modularização, possuindo mais de 330 testes automatizados aprovados e cobertura consistente de lint e build.

Apesar da alta qualidade de entrega funcional ao usuário final, a auditoria arquitetural identificou dívidas técnicas acumuladas devido à integração rápida de módulos legados desenvolvidos com paradigmas distintos.

---

## 2. Diagnóstico das Quatro Principais Dívidas Técnicas

```
┌─────────────────────────────────┐      ┌─────────────────────────────────┐
│     Bifurcação de Dados         │      │     Hibridismo de Transporte    │
│  Dois bancos SQLite em paralelo │      │  HTTP Local Express vs. IPC     │
│  (Drizzle ORM vs. sql.js)       │      │  Risco de portas & overlays     │
└────────────────┬────────────────┘      └────────────────┬────────────────┘
                 │                                        │
                 └───────────────────┬────────────────────┘
                                     │
┌────────────────────────────────────┴───┐
│    Dívidas Estruturais Mapeadas        │
└────────────────────────────────────┬───┘
                                     │
                 ┌───────────────────┴────────────────────┐
                 │                                        │
┌────────────────┴────────────────┐      ┌────────────────┴────────────────┐
│   Duplicação de Motores Fiscais │      │      Ponte PowerShell mTLS      │
│  Parsers e DANFEs duplicados    │      │  Arquivos em %TEMP% e alertas   │
│  em Express, Core e React       │      │  em antivírus/EDR corporativos  │
└─────────────────────────────────┘      └─────────────────────────────────┘
```

---

## 3. Benefícios Estratégicos da Modernização

1. **Confiabilidade e Integridade Total:**
   A unificação em banco único SQLite (WAL mode) garante transações atômicas, backup em arquivo único e integridade total de dados fiscais e patrimoniais.
2. **Performance e Redução de Recursos:**
   A migração para Electron IPC e o fim da criação de arquivos em disco no transporte mTLS eliminam gargalos de I/O, tornando o sistema até 3x mais responsivo.
3. **Resolução de Gargalos Fiscais do Usuário:**
   A automação da Manifestação do Destinatário (Ciência da Operação 210210) resolve o problema de notas fiscais que não baixavam o XML completo da SEFAZ.
4. **Preparação Regulatória (Reforma Tributária 2026):**
   Suporte nativo aos tributos IBS, CBS e Imposto Seletivo garante conformidade com a legislação tributária brasileira vigente.

---

## 4. Cronograma Macro em 6 Fases

| Fase | Foco | Complexidade | Itens Principais |
| :--- | :--- | :--- | :--- |
| **Fase 1** | Segurança & Integridade Imediata | Baixa | Token local na API, PowerShell via stdin, centavos exatos |
| **Fase 2** | Unificação de Banco de Dados | Média | Migração para schema Drizzle único e backup atômico |
| **Fase 3** | Convergência Fiscal & Manifestação | Média | Parsers unificados, Ciência automática SEFAZ, DANFE único |
| **Fase 4** | Migração de Transporte (IPC) | Média | IPC handlers para Documentos e Ativos, fallback transparente |
| **Fase 5** | Domínio Fiscal 2026 & CIAP | Média | Suporte a IBS/CBS/IS, rateio de CT-e e rate-limit SEFAZ |
| **Fase 6** | Resiliência & Automação Avançada | Alta | Certificados A1 `.pfx` nativos, Circuit Breaker, Tray e SPED |

---

## 5. Matriz Executiva de Riscos e Salvaguardas

| Risco Potencial | Impacto | Probabilidade | Estratégia de Mitigação |
| :--- | :--- | :--- | :--- |
| Regressão na base de dados de clientes legados | Alto | Baixa | Backup de segurança pré-migração automático e fallback para base legado se houver inconsistência. |
| Bloqueio por consumo excessivo na SEFAZ (Rejeição 656) | Médio | Média | Fila de requisições com cooldown estrito e monitoramento de intervalo mínimo de 15 minutos por NSU. |
| Incompatibilidade com ambientes de desenvolvimento | Baixo | Baixa | Manter suporte a HTTP local via Express para desenvolvimento web no Vite via adaptador `UnifiedApiClient`. |

---

## 6. Recomendação da Engenharia

Iniciar a execução pela **Fase 1 (Segurança e Integridade Imediata)**, pois possui risco de regressão mínimo, resolve os pontos críticos de segurança local (token de sessão Express, eliminação de arquivos em `%TEMP%` e path traversal) e garante precisão contábil no motor de cálculo de depreciação.


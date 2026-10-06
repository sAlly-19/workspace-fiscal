# Artefatos do Contrato Wire da NFS-e Nacional (ADN / SEFIN)

Este documento orienta os desenvolvedores e mantenedores sobre como fornecer e homologar os artefatos oficiais da API REST da NFS-e Nacional no módulo Buscador NF do **Workspace Fiscal**.

---

## 1. Contexto e Política do Gate de Contrato

A integração da NFS-e Nacional no Buscador NF foi construída de forma completa, cobrindo:
- Tipos de domínio, validação e formatação de chaves de 50 dígitos;
- Migração de banco de dados SQLite (v3) com suporte a ambientes (`homologation`, `production`), origens (`NFSE_ADN_DISTRIBUTION`, `NFSE_SEFIN_DIRECT`), hashes de integridade SHA-256 e tabela `nfse_events`;
- Armazenamento atômico de XMLs com proteção contra sobrescrita e rollback automático;
- Transporte HTTP mTLS autenticado via Windows Certificate Store (`CurrentUser\My`) ou mock para testes;
- Sincronização incremental por NSU com cursor isolado e consulta direta por chave de acesso;
- Camada IPC segura exposta ao frontend Desktop;
- Workspace dedicado no Buscador NF com filtros, exibição de eventos e sem dependência de PDF/DANFSE.

Por segurança e conformidade, a camada de comunicação HTTP oficial esteve anteriormente protegida por um gate deliberado (`UnavailableNfseWireContract`). Com o fornecimento das especificações oficiais OpenAPI / Swagger da NFS-e Nacional (ADN e SEFIN), o contrato oficial foi implementado via `OfficialNfseWireContract` e ativado na inicialização dos serviços do Buscador NF.

---

## 2. Como fornecer os artefatos para homologação

Para ativar a comunicação de rede oficial sem necessidade de refatorar repositórios, serviços, IPC ou telas, foram fornecidos:

1. **Especificação OpenAPI / Swagger Oficial** (localizada em `NFSe JSONs/`):
   - `swagger(ADN Prod).json` e `swagger(ADN Prod Estrita).json` para distribuição e eventos (`/DFe/{NSU}` e `/NFSe/{ChaveAcesso}/Eventos`).
   - `Sefin prod.json` e `Sefin prod estr.json` para consulta direta de NFS-e (`/nfse/{chaveAcesso}`).
2. **Payloads reais ou de sandbox anonimizados**:
   - Exemplos de respostas HTTP (cabeçalhos e corpos XML/JSON) gerados no ambiente de **Produção Restrita**.
   - **Regra de Segurança Estrita**: Todos os dados sensíveis (CNPJs, nomes de empresas, valores e assinaturas) devem ser anonimizados antes de serem incorporados como fixtures de teste. **Nunca comitar chaves privadas, certificados ou dados fiscais reais.**

---

## 3. Status de Homologação do Contrato Oficial

- [x] Criar `OfficialNfseWireContract` implementando a interface `NfseWireContract` (`src/core/buscador/nfse/clients/NfseWireContract.ts`).
- [x] Cobrir `OfficialNfseWireContract` com testes unitários TDD (`src/core/buscador/nfse/clients/OfficialNfseWireContract.test.ts`).
- [x] Substituir a injeção em `electron/buscador/services.ts` de `UnavailableNfseWireContract` para `OfficialNfseWireContract` (ativo).
- [x] Ajustar URL base de homologação da SEFIN em `src/core/buscador/nfse/config/endpoints.ts` para conformidade com o Swagger oficial (`https://sefin.producaorestrita.nfse.gov.br/SefinNacional`).
- [x] Executar a suíte de testes de regressão (`npm test`).
- [ ] Realizar teste de fumaça em ambiente de Produção Restrita com certificado digital A1 válido instalado em runtime.

---

## 4. Escopo e Limitações Deliberadas

- **Sem PDF / DANFSE**: O módulo NFS-e Nacional opera exclusivamente sobre XMLs autorizados. Não há geração de DANFSE nem visualização em PDF nesta versão.
- **Sem Emissão**: O Workspace Fiscal apenas localiza, armazena e consulta documentos emitidos ou recebidos.
- **Isolamento em relação ao NF View**: Os dados da NFS-e pertencem exclusivamente ao subsistema do Buscador NF (`fiscal_storage.db`) e não impactam as bases ou rotinas do módulo NF View.


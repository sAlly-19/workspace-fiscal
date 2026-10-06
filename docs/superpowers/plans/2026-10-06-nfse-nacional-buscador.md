# NFS-e Nacional no Buscador NF Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar ao Buscador NF a base completa e segura para NFS-e Nacional — domínio, persistência, transporte mTLS, sincronização, consulta direta, eventos, IPC e workspace — mantendo o contrato wire oficial atrás de um gate explícito até que o OpenAPI ou respostas reais anonimizadas estejam disponíveis.

**Architecture:** O modelo genérico do Buscador passa a aceitar `NFSE`, mas o protocolo permanece isolado em `src/core/buscador/nfse`. `NfseAdnClient` e `NfseSefinClient` usam o mesmo certificado do Windows Store por um novo transporte REST; `NfseSynchronizer` coordena parsing, storage e banco sem alterar o `DistributionEngine` SEFAZ. O renderer acessa tudo por IPC tipado e oferece um workspace NFS-e sem PDF/DANFSE.

**Tech Stack:** TypeScript 5.8, Electron 33, React 19, sql.js, fast-xml-parser, Zod, Pino e Vitest 4; nenhuma dependência nova prevista.

**Spec:** [docs/superpowers/specs/2026-10-06-nfse-nacional-buscador-design.md](../specs/2026-10-06-nfse-nacional-buscador-design.md)

## Global Constraints

- NFS-e existe somente no Buscador NF nesta entrega. Não integrar com banco, árvore, importação ou visualizador do NF View.
- Não implementar emissão, assinatura para emissão/eventos, scraping, DANFSE ou PDF.
- Preservar integralmente o comportamento existente de NF-e/CT-e e o método SOAP atual.
- Reutilizar empresa, thumbprint do certificado, banco `fiscal_storage.db`, storage, feedback e progresso existentes; não criar sistemas paralelos.
- Aceitar somente HTTPS, manter validação TLS do sistema operacional e nunca expor PFX, senha, chave privada, XML integral ou headers sensíveis em logs/IPC.
- Validar chave NFS-e como 50 dígitos sem prefixo `NFS`; NF-e/CT-e continuam com 44 dígitos.
- Manter ambiente NFS-e independente de `sefaz_environment`.
- Não adivinhar query parameters, headers, envelopes JSON ou schemas de erro ausentes dos artefatos oficiais. Até receber OpenAPI/Swagger ou resposta real anonimizada, `UnavailableNfseWireContract` deve lançar `NfseContractError` antes da rede.
- O plano entrega e testa toda a integração até esse gate. A validação live em produção restrita e o adapter wire concreto ficam bloqueados pela pendência externa descrita na especificação.
- Usar TDD em cada tarefa: teste falhando, implementação mínima, teste passando, regressão relacionada e commit pequeno.
- Usar `npm.cmd` nos comandos Windows deste repositório.

## Review Focus

1. A validação e os caminhos de NFS-e usam 50 dígitos e nunca reutilizam silenciosamente as regras de 44 dígitos ou o prefixo XML `NFS`.
2. Um evento pode chegar antes da nota, ser deduplicado e ser vinculado posteriormente sem perda.
3. Distribuição ADN e consulta direta SEFIN convergem para o mesmo documento por empresa, tipo, ambiente e chave.
4. Falhas de contrato, parsing, disco ou banco não avançam NSU nem deixam arquivos pendentes/órfãos.
5. A migration v2 → v3 preserva NF-e/CT-e e mantém cursores/ambientes SEFAZ e NFS-e isolados.

---

## Task 1: Introduzir os primitivos de domínio NFS-e

**Files:**

- Modify: `src/core/buscador/domain/types.ts`
- Create: `src/core/buscador/nfse/domain/types.ts`
- Create: `src/core/buscador/nfse/domain/errors.ts`
- Create: `src/core/buscador/nfse/domain/access-key.ts`
- Create: `src/core/buscador/nfse/domain/nsu.ts`
- Create: `src/core/buscador/nfse/config/endpoints.ts`
- Test: `src/core/buscador/nfse/domain/nfse-domain.test.ts`

- [ ] **Step 1: Escrever testes dos invariantes**

Cobrir:

- chave com exatamente 50 dígitos é aceita;
- espaços e pontuação permitida são removidos, mas `NFS` não é incorporado ao valor persistido;
- 44 ou 51 dígitos, letras internas e entrada vazia são rejeitados;
- NSU aceita inteiro decimal arbitrariamente grande, normaliza zeros à esquerda e compara via `BigInt`;
- bases ADN/SEFIN são selecionadas corretamente em `production` e `homologation`.

- [ ] **Step 2: Rodar o teste e confirmar falha por módulos ausentes**

Run: `npm.cmd test -- src/core/buscador/nfse/domain/nfse-domain.test.ts`

Expected: FAIL com imports/métodos ainda inexistentes.

- [ ] **Step 3: Implementar tipos e assinaturas mínimas**

Adicionar `NFSE` a `DocumentType` e definir, sem tipos `any`:

```ts
export type NfseEnvironment = 'homologation' | 'production';
export type NfsePayloadKind = 'NFSE' | 'EVENT';
export type DocumentOrigin =
  | 'SEFAZ_DISTRIBUTION'
  | 'NFSE_ADN_DISTRIBUTION'
  | 'NFSE_SEFIN_DIRECT';

export interface NfseDistributedPayload {
  nsu?: string;
  kind: NfsePayloadKind;
  schemaType: string;
  xml: string;
  accessKey?: string;
  generatedAt?: string;
}

export interface NfseDistributionBatch {
  status: 'DOCUMENTS_FOUND' | 'NO_DOCUMENTS' | 'REJECTED';
  lastNsu: string;
  maxNsu: string;
  documents: NfseDistributedPayload[];
  retryAfter?: string;
  message?: string;
}
```

Expor `normalizeNfseAccessKey`, `normalizeNfseNsu`, `compareNfseNsu` e `getNfseEndpoints`.

- [ ] **Step 4: Rodar teste focal e tipagem**

Run: `npm.cmd test -- src/core/buscador/nfse/domain/nfse-domain.test.ts`

Expected: PASS.

Run: `npm.cmd run lint`

Expected: PASS sem quebrar consumidores atuais de `DocumentType`.

- [ ] **Step 5: Commit**

```bash
git add src/core/buscador/domain/types.ts src/core/buscador/nfse
git commit -m "feat(buscador): add nfse domain primitives"
```

## Task 2: Migrar o banco do Buscador para a versão 3

**Files:**

- Modify: `src/core/buscador/database/schema.ts`
- Modify: `src/core/buscador/database/connection.ts`
- Modify: `src/core/buscador/database/repositories/DistributionStateRepository.ts`
- Modify: `src/core/buscador/database/repositories/DocumentRepository.ts`
- Modify: `src/core/buscador/database/repositories/SettingsRepository.ts`
- Create: `src/core/buscador/database/repositories/NfseEventRepository.ts`
- Test: `src/core/buscador/database/migration-v3.test.ts`
- Test: `src/core/buscador/database/repositories/nfse-repositories.test.ts`

- [ ] **Step 1: Escrever o teste de migration v2 → v3**

Montar um banco temporário na versão 2 com empresa, certificado, NF-e, CT-e, estados de distribuição e settings. Após abrir com `getDatabase`, afirmar:

- `PRAGMA user_version = 3`;
- registros legados e seus caminhos permanecem intactos;
- `documents` e `distribution_state` aceitam `NFSE`;
- `documents` contém `environment`, `origin` e `content_hash`;
- a unicidade é `(company_id, document_type, environment, access_key)`;
- existe `nfse_events` com os índices definidos na especificação;
- `nfse_environment` tem default `homologation` sem alterar `sefaz_environment`.

- [ ] **Step 2: Rodar o teste e confirmar falha na versão/schema**

Run: `npm.cmd test -- src/core/buscador/database/migration-v3.test.ts`

Expected: FAIL porque o schema atual permanece em v2.

- [ ] **Step 3: Implementar a migration transacional**

Reconstruir apenas as tabelas que possuem `CHECK` incompatível, copiar os dados legados e registrar o ambiente SEFAZ atual nos documentos antigos. Não apagar registros e não reutilizar o ambiente NFS-e como fallback de documentos legados.

- [ ] **Step 4: Escrever testes dos repositórios**

Cobrir:

- estado distinto para `NFE`, `CTE` e `NFSE` por ambiente;
- upsert do mesmo documento NFS-e não duplica;
- mesma chave em ambientes diferentes não colide;
- evento sem documento é salvo;
- evento repetido por identificador ou hash não duplica;
- persistir a nota vincula eventos pendentes da mesma empresa/ambiente/chave.

- [ ] **Step 5: Implementar os contratos dos repositórios**

Adicionar aos tipos persistidos `environment`, `origin` e `content_hash`. Criar `NfseEventRepository` com `upsert`, `linkPendingToDocument` e `findByDocument`. Garantir que `DocumentRepository.upsert` retorne o documento final para permitir vínculo de eventos.

- [ ] **Step 6: Rodar testes focais e regressão do banco**

Run: `npm.cmd test -- src/core/buscador/database/migration-v3.test.ts src/core/buscador/database/repositories/nfse-repositories.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/core/buscador/database src/core/buscador/domain/types.ts
git commit -m "feat(buscador): migrate storage schema for nfse"
```

## Task 3: Estender o storage com atomicidade e chaves de 50 dígitos

**Files:**

- Modify: `src/core/buscador/storage/StorageService.ts`
- Modify: `src/core/buscador/storage/ReconciliationService.ts`
- Create: `src/core/buscador/storage/StorageService.nfse.test.ts`

- [ ] **Step 1: Escrever testes em diretório temporário**

Cobrir caminhos separados por empresa/tipo/ambiente, 44 dígitos para NF-e/CT-e, 50 para NFS-e, preservação byte a byte, rollback da gravação pendente e rejeição de traversal/caracteres não permitidos.

- [ ] **Step 2: Rodar e confirmar falha para `NFSE`**

Run: `npm.cmd test -- src/core/buscador/storage/StorageService.nfse.test.ts`

Expected: FAIL porque `StorageService` aceita somente `NFe | CTe` e 44 dígitos.

- [ ] **Step 3: Implementar API de storage por `DocumentType` e ambiente**

Usar o validador adequado ao tipo e manter `saveXmlTransactional` como única rota de escrita do sincronizador. Calcular SHA-256 sobre o XML original em helper compartilhado e retornar `contentHash` junto ao caminho pendente/final.

- [ ] **Step 4: Atualizar reconciliação sem tratar PDF de NFS-e**

Reconhecer XMLs NFS-e, mas nunca gerar, procurar ou anunciar PDF/DANFSE. Não mudar o comportamento de reconciliação para NFE/CTE.

- [ ] **Step 5: Rodar testes focal e storage existente**

Run: `npm.cmd test -- src/core/buscador/storage/StorageService.nfse.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/core/buscador/storage
git commit -m "feat(buscador): store nfse xml atomically"
```

## Task 4: Adicionar transporte HTTPS mTLS ao provider de certificado

**Files:**

- Modify: `src/core/buscador/certificates/ICertificateProvider.ts`
- Modify: `src/core/buscador/certificates/WindowsStoreCertificateProvider.ts`
- Modify: `src/core/buscador/certificates/MockCertificateProvider.ts`
- Modify: `src/core/buscador/certificates/windows-bridge.ps1`
- Test: `src/core/buscador/certificates/http-transport.test.ts`

- [ ] **Step 1: Escrever testes do contrato e da validação**

Testar URL não HTTPS, host fora das bases permitidas, método diferente de `GET`, timeout, cancelamento, certificado ausente/expirado e sanitização de erro. O mock deve capturar a requisição sem rede.

- [ ] **Step 2: Rodar e confirmar ausência do método REST**

Run: `npm.cmd test -- src/core/buscador/certificates/http-transport.test.ts`

Expected: FAIL porque `executeHttpRequest` ainda não existe.

- [ ] **Step 3: Adicionar as assinaturas sem remover SOAP**

```ts
export interface HttpExecutionOptions {
  url: string;
  method: 'GET';
  thumbprint: string;
  headers?: Record<string, string>;
  timeoutSec?: number;
  signal?: AbortSignal;
}

export interface HttpExecutionResult {
  statusCode: number;
  responseBody: string;
  responseHeaders: Record<string, string>;
}
```

Adicionar `executeHttpRequest(options)` a `ICertificateProvider`, preservando `executeSoapRequest` sem alteração de assinatura.

- [ ] **Step 4: Implementar a ação REST no bridge**

Resolver o certificado pelo thumbprint no store já usado, aplicar timeout, aceitar somente GET/HTTPS e devolver JSON estruturado com status/body/headers permitidos. Não adicionar bypass de validação TLS nem serializar material privado. Mapear cancelamento do processo filho para `AbortSignal` no provider TypeScript.

- [ ] **Step 5: Rodar testes focal, SEFAZ e lint**

Run: `npm.cmd test -- src/core/buscador/certificates/http-transport.test.ts`

Expected: PASS.

Run: `npm.cmd run lint`

Expected: PASS e provider SOAP ainda tipado.

- [ ] **Step 6: Commit**

```bash
git add src/core/buscador/certificates
git commit -m "feat(buscador): add certificate-backed https transport"
```

## Task 5: Criar clientes oficiais com gate do wire contract

**Files:**

- Create: `src/core/buscador/nfse/clients/NfseGateway.ts`
- Create: `src/core/buscador/nfse/clients/NfseWireContract.ts`
- Create: `src/core/buscador/nfse/clients/UnavailableNfseWireContract.ts`
- Create: `src/core/buscador/nfse/clients/NfseAdnClient.ts`
- Create: `src/core/buscador/nfse/clients/NfseSefinClient.ts`
- Create: `src/core/buscador/nfse/clients/NfseRetryPolicy.ts`
- Test: `src/core/buscador/nfse/clients/nfse-clients.test.ts`
- Test: `src/core/buscador/nfse/clients/nfse-retry-policy.test.ts`

- [ ] **Step 1: Escrever testes dos endpoints e do gate**

Verificar que os clientes escolhem somente as bases oficiais e os caminhos confirmados:

- ADN `GET /DFe/{NSU}`;
- ADN `GET /NFSe/{ChaveAcesso}/Eventos`;
- SEFIN `GET /nfse/{chaveAcesso}`.

Com `UnavailableNfseWireContract`, afirmar que cada operação lança `NfseContractError` com a mensagem orientativa antes de `executeHttpRequest` ser chamado.

- [ ] **Step 2: Definir o contrato estável do gateway**

```ts
export interface NfseGateway {
  distribute(input: NfseDistributionInput): Promise<NfseDistributionBatch>;
  consultByKey(input: NfseKeyQueryInput): Promise<NfseDistributedPayload>;
  consultEvents(input: NfseKeyQueryInput): Promise<NfseDistributedPayload[]>;
}

export interface NfseWireContract {
  assertDistributionRequestSupported(input: NfseDistributionInput): void;
  assertKeyQuerySupported(input: NfseKeyQueryInput): void;
  decodeDistribution(body: string, headers: Readonly<Record<string, string>>): NfseDistributionBatch;
  decodeDocument(body: string, headers: Readonly<Record<string, string>>): NfseDistributedPayload;
  decodeEvents(body: string, headers: Readonly<Record<string, string>>): NfseDistributedPayload[];
}
```

O gate deve ocorrer antes de construir qualquer query/header não confirmado. A mensagem deve pedir OpenAPI oficial ou resposta real anonimizada.

- [ ] **Step 3: Implementar mapeamento HTTP e retry isolado**

Mapear 400/401/403/404/409 sem retry; 429 respeitando `Retry-After`; timeout/rede/502/503/504 com uma repetição; demais falhas como `NfseHttpError`. Nunca registrar corpo completo. Manter o retry testável por relógio/sleeper injetado, sem espera real.

- [ ] **Step 4: Rodar testes dos clientes**

Run: `npm.cmd test -- src/core/buscador/nfse/clients/nfse-clients.test.ts src/core/buscador/nfse/clients/nfse-retry-policy.test.ts`

Expected: PASS, inclusive a asserção de zero chamadas de rede no contrato indisponível.

- [ ] **Step 5: Documentar a fronteira de conclusão do contrato**

Adicionar comentário de módulo em `NfseWireContract.ts` referenciando a seção 4.3 da especificação. Não criar `OfficialNfseWireContract` sem um artefato primário.

- [ ] **Step 6: Commit**

```bash
git add src/core/buscador/nfse/clients
git commit -m "feat(buscador): add contract-gated nfse clients"
```

## Task 6: Adaptar documentos NFS-e e interpretar eventos com segurança

**Files:**

- Modify: `src/core/parsers/nfse.parser.ts`
- Modify: `src/core/parsers/parsers.test.ts`
- Create: `src/core/buscador/nfse/parsers/NfseDocumentAdapter.ts`
- Create: `src/core/buscador/nfse/parsers/NfseEventParser.ts`
- Create: `src/core/buscador/nfse/parsers/fixtures/nfse-nacional-v1.01.xml`
- Create: `src/core/buscador/nfse/parsers/fixtures/nfse-event-unknown.xml`
- Test: `src/core/buscador/nfse/parsers/nfse-parsers.test.ts`

- [ ] **Step 1: Adicionar fixture de conformidade identificada**

Usar somente fixture oficial ou anonimizada validada contra XSD v1.01. Se ela ainda não estiver disponível durante a execução, manter o teste `it.skip` com motivo e link da pendência; não fabricar um envelope atribuído ao padrão oficial.

- [ ] **Step 2: Escrever testes do adapter e do evento desconhecido**

Cobrir preservação do XML original, chave de 50 dígitos, prestador, tomador, número, data, valor e situação quando presentes. Para evento desconhecido, exigir persistência como genérico sem alterar a situação fiscal. Manter o teste ABRASF atual como regressão.

- [ ] **Step 3: Rodar e confirmar falha dos adapters**

Run: `npm.cmd test -- src/core/buscador/nfse/parsers/nfse-parsers.test.ts src/core/parsers/parsers.test.ts`

Expected: FAIL apenas para os novos módulos/casos ainda não implementados; ABRASF existente continua PASS.

- [ ] **Step 4: Implementar adapters mínimos**

`NfseDocumentAdapter` delega a nota principal ao `NFSeParser` e converte para o DTO do Buscador. `NfseEventParser` extrai somente chave, identificador, tipo, sequência e data comprováveis no XML recebido; tipos não reconhecidos retornam efeito fiscal `NONE`.

- [ ] **Step 5: Rodar testes focal e regressão de parsers**

Run: `npm.cmd test -- src/core/buscador/nfse/parsers/nfse-parsers.test.ts src/core/parsers/parsers.test.ts`

Expected: PASS, salvo o teste explicitamente pulado por fixture externa ausente.

- [ ] **Step 6: Commit**

```bash
git add src/core/parsers src/core/buscador/nfse/parsers
git commit -m "feat(buscador): adapt nfse documents and events"
```

## Task 7: Implementar persistência atômica e sincronização por NSU

**Files:**

- Create: `src/core/buscador/nfse/services/NfsePersistenceService.ts`
- Create: `src/core/buscador/nfse/services/NfseSynchronizer.ts`
- Create: `src/core/buscador/nfse/services/NfseDirectQueryService.ts`
- Test: `src/core/buscador/nfse/services/NfsePersistenceService.test.ts`
- Test: `src/core/buscador/nfse/services/NfseSynchronizer.test.ts`
- Test: `src/core/buscador/nfse/services/NfseDirectQueryService.test.ts`

- [ ] **Step 1: Escrever testes da unidade atômica**

Com banco e filesystem temporários, verificar documento, evento, hash, vínculo posterior e rollback em cada ponto: parsing, preparação do arquivo, upsert, vínculo de evento, persistência do banco e commit do arquivo. Em toda falha, o NSU anterior e a ausência de arquivos órfãos devem ser afirmados explicitamente.

- [ ] **Step 2: Rodar teste e confirmar serviços ausentes**

Run: `npm.cmd test -- src/core/buscador/nfse/services/NfsePersistenceService.test.ts`

Expected: FAIL por módulo ausente.

- [ ] **Step 3: Implementar `NfsePersistenceService`**

Preparar todos os XMLs do lote antes da transaction; dentro dela, fazer upserts, vínculos e atualizar o cursor; persistir o snapshot; somente então confirmar os arquivos. Em erro, reverter snapshot e pendências. A API deve receber `origin` para permitir convergência entre ADN e SEFIN.

- [ ] **Step 4: Escrever testes do sincronizador**

Usar `NfseGateway` fake para cobrir:

- loop enquanto `lastNsu < maxNsu` e existem documentos;
- resposta vazia;
- progresso monotônico;
- cancelamento antes da próxima chamada;
- certificado ausente/expirado;
- retry apenas para casos transitórios;
- evento anterior à nota;
- falha do lote não avança cursor;
- estado de NFS-e não altera cursores NFE/CTE.

- [ ] **Step 5: Implementar `NfseSynchronizer`**

Injetar repositórios, settings, gateway e persistence service. Não importar ou modificar `DistributionEngine`. Expor `sync`, `getStatus`, `cancel` e `resetNsu`, com um `AbortController` por empresa/ambiente e mensagens sanitizadas.

- [ ] **Step 6: Escrever e implementar testes da consulta direta**

Consultar chave de 50 dígitos pela SEFIN, opcionalmente consultar eventos pelo ADN e persistir pelo mesmo `NfsePersistenceService` com origem `NFSE_SEFIN_DIRECT`. Afirmar que uma consulta após distribuição atualiza o mesmo registro, sem duplicar nota/eventos e sem alterar NSU.

- [ ] **Step 7: Rodar a suíte dos serviços**

Run: `npm.cmd test -- src/core/buscador/nfse/services`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/core/buscador/nfse/services
git commit -m "feat(buscador): synchronize and persist nfse atomically"
```

## Task 8: Integrar serviços ao processo principal e IPC seguro

**Files:**

- Modify: `electron/buscador/services.ts`
- Modify: `electron/buscador/ipc/index.ts`
- Create: `electron/buscador/ipc/nfseHandlers.ts`
- Modify: `electron/preload.ts`
- Modify: `src/types/fiscal-api.d.ts`
- Test: `electron/buscador/ipc/nfseHandlers.test.ts`

- [ ] **Step 1: Escrever testes de validação dos handlers**

Cobrir empresa inválida/inativa, chave fora de 50 dígitos, ambiente inválido, reset sem confirmação interna, filtros/tamanhos excessivos, sanitização do erro e encaminhamento correto de progresso para a janela principal.

- [ ] **Step 2: Rodar e confirmar canais ausentes**

Run: `npm.cmd test -- electron/buscador/ipc/nfseHandlers.test.ts`

Expected: FAIL por handlers/API inexistentes.

- [ ] **Step 3: Montar os serviços com gate padrão**

Adicionar `NfseEventRepository`, clientes, `UnavailableNfseWireContract`, persistence service, synchronizer e direct query ao `ApplicationContext`. A aplicação deve iniciar normalmente; apenas operações de rede NFS-e devem apresentar o erro orientativo do contrato.

- [ ] **Step 4: Registrar e expor IPC tipado**

Implementar `nfse:sync`, `nfse:getStatus`, `nfse:cancelSync`, `nfse:resetNSU`, `nfse:consultByKey`, `nfse:getEvents` e `nfse:progress` por `registerSecureHandler`. Expor no preload apenas DTOs serializáveis, nunca provider, certificado completo ou erro técnico bruto.

- [ ] **Step 5: Rodar testes e lint dos dois projetos TypeScript**

Run: `npm.cmd test -- electron/buscador/ipc/nfseHandlers.test.ts`

Expected: PASS.

Run: `npm.cmd run lint`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add electron/buscador electron/preload.ts src/types/fiscal-api.d.ts
git commit -m "feat(buscador): expose nfse services through secure ipc"
```

## Task 9: Adicionar controles de workspace e ambiente NFS-e

**Files:**

- Modify: `src/web/features/buscador/BuscadorApp.tsx`
- Modify: `src/web/features/buscador/components/layout/AppHeader.tsx`
- Modify: `src/web/components/settings/BuscadorSettingsTab.tsx`
- Create: `src/web/features/buscador/features/workspace/workspace-controller.ts`
- Create: `src/web/features/buscador/features/workspace/workspace-controller.test.ts`
- Create: `src/web/features/buscador/components/NfseWorkspaceSelector.tsx`

- [ ] **Step 1: Escrever testes do controlador sem DOM**

Cobrir default `SEFAZ`, alternância para `NFSE`, preservação da empresa selecionada, limpeza somente dos filtros incompatíveis e leitura independente de `sefaz_environment`/`nfse_environment`.

- [ ] **Step 2: Rodar e confirmar controlador ausente**

Run: `npm.cmd test -- src/web/features/buscador/features/workspace/workspace-controller.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implementar o controlador e o seletor aprovado**

Usar o seletor central `SEFAZ · NF-e / CT-e` / `NFS-e Nacional`. Manter sidebar, empresa, certificado, tema e feedback compartilhados. Em settings, mostrar `homologation` como “Produção restrita” e deixar claro que o ajuste é exclusivo da NFS-e.

- [ ] **Step 4: Integrar no shell sem ativar ainda ações de PDF**

O modo `SEFAZ` deve renderizar o fluxo atual sem mudança funcional. O modo `NFSE` encaminha para o workspace da tarefa seguinte.

- [ ] **Step 5: Rodar teste e lint**

Run: `npm.cmd test -- src/web/features/buscador/features/workspace/workspace-controller.test.ts`

Expected: PASS.

Run: `npm.cmd run lint`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/web/features/buscador src/web/components/settings/BuscadorSettingsTab.tsx
git commit -m "feat(buscador): add nfse workspace selection"
```

## Task 10: Construir o workspace NFS-e sem PDF

**Files:**

- Create: `src/web/features/buscador/features/nfse/nfse-view-model.ts`
- Create: `src/web/features/buscador/features/nfse/nfse-view-model.test.ts`
- Create: `src/web/features/buscador/components/nfse/NfseWorkspace.tsx`
- Create: `src/web/features/buscador/components/nfse/NfseStatusCard.tsx`
- Create: `src/web/features/buscador/components/nfse/NfseDirectQuery.tsx`
- Create: `src/web/features/buscador/components/nfse/NfseFilters.tsx`
- Create: `src/web/features/buscador/components/nfse/NfseDetailsModal.tsx`
- Modify: `src/web/features/buscador/components/documents/DocumentWorkspace.tsx`
- Modify: `src/web/features/buscador/components/DocumentTable/DocumentTable.tsx`
- Modify: `src/web/features/buscador/components/DocumentTable/DocumentRow.tsx`
- Modify: `src/web/features/buscador/stores/ui.store.ts`

- [ ] **Step 1: Escrever testes do view model**

Cobrir filtros de período/situação/prestador/tomador/número/chave, estado de sincronização, cancelamento, consulta direta, paginação, contagem de documentos/eventos, estado vazio, erro de contrato orientativo e ausência de qualquer ação PDF.

- [ ] **Step 2: Rodar e confirmar view model ausente**

Run: `npm.cmd test -- src/web/features/buscador/features/nfse/nfse-view-model.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implementar workspace e tabela reutilizável**

Exibir ambiente, último NSU, última sincronização, resultado/erro, contagens, “Sincronizar NFS-e”, consulta por chave, filtros e tabela paginada. Reutilizar modal de progresso e feedback existentes; extrair variações de colunas/labels em vez de duplicar a tabela inteira.

- [ ] **Step 4: Implementar detalhes e eventos**

Mostrar metadados da nota, XML, pasta e timeline/lista de eventos. Permitir download/abertura do XML e pasta pelos canais existentes validados. Não renderizar botão ativo de PDF, download DANFSE ou atalho para o NF View; usar somente texto “PDF indisponível nesta etapa” quando necessário.

- [ ] **Step 5: Tratar o gate sem mascarar sua causa**

Ao receber `NfseContractError`, mostrar que a integração oficial ainda precisa do OpenAPI ou resposta anonimizada, sem sugerir falha de certificado e sem fazer retry automático.

- [ ] **Step 6: Rodar testes focais e lint**

Run: `npm.cmd test -- src/web/features/buscador/features/nfse/nfse-view-model.test.ts`

Expected: PASS.

Run: `npm.cmd run lint`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/web/features/buscador
git commit -m "feat(buscador): add nfse search workspace"
```

## Task 11: Fechar regressão, segurança e documentação operacional

**Files:**

- Modify: `README.md`
- Modify: `docs/superpowers/specs/2026-10-06-nfse-nacional-buscador-design.md` somente se a implementação revelar uma correção factual
- Create: `docs/nfse-contract-artifacts.md`
- Test: todas as suítes

- [ ] **Step 1: Documentar o uso e a pendência externa**

Explicar onde selecionar o workspace/ambiente, como associar certificado, onde ficam XMLs e como fornecer com segurança OpenAPI ou respostas anonimizadas. Registrar que PDF, DANFSE, emissão e NF View permanecem fora do escopo.

- [ ] **Step 2: Auditar segurança por busca estática**

Run: `Get-ChildItem src,electron -Recurse -File | Select-String -Pattern 'rejectUnauthorized|ServerCertificateValidationCallback|Authorization|private.?key|BEGIN PRIVATE KEY'`

Expected: nenhuma nova desativação TLS, segredo ou log sensível. Ocorrências legítimas pré-existentes devem ser avaliadas, não removidas sem relação com o escopo.

- [ ] **Step 3: Rodar suíte completa**

Run: `npm.cmd test`

Expected: PASS, com skip apenas da fixture Nacional oficial se a pendência externa continuar documentada.

- [ ] **Step 4: Rodar validação estática e build**

Run: `npm.cmd run lint`

Expected: PASS.

Run: `npm.cmd run build`

Expected: PASS para web, main e preload.

- [ ] **Step 5: Fazer smoke test manual do Buscador**

Confirmar:

- fluxo SEFAZ atual abre, pesquisa e sincroniza como antes;
- alternância de workspace preserva empresa/certificado;
- NFS-e mostra ambiente/NSU/filtros/consulta direta;
- gate do contrato aparece antes de rede e com mensagem útil;
- não existe ação ativa de PDF/DANFSE no workspace NFS-e;
- cancelamento e feedback não vazam detalhes técnicos.

- [ ] **Step 6: Revisar os cinco focos críticos**

Reexecutar ou inspecionar explicitamente os testes correspondentes a chave 50×44, evento antes da nota, convergência ADN/SEFIN, rollback/NSU e migration/ambiente. Não declarar integração live validada sem certificado e contrato oficiais.

- [ ] **Step 7: Commit final**

```bash
git add README.md docs/nfse-contract-artifacts.md
git commit -m "docs: describe nfse buscador operation and contract gate"
```

## External Completion Gate

Quando um OpenAPI/Swagger oficial ou respostas reais anonimizadas forem fornecidos, criar um plano curto complementar para:

1. implementar `OfficialNfseWireContract` sem alterar gateway, serviços, IPC ou UI;
2. adicionar fixtures de distribuição, consulta direta, eventos e erros;
3. remover o `skip` da fixture Nacional, se existir;
4. executar smoke test em produção restrita com certificado/CNPJ autorizados;
5. registrar headers, rate limits e intervalos confirmados sem armazenar dados fiscais sensíveis.

Esse gate é parte deliberada do aceite: detalhes do protocolo ausentes não podem ser substituídos por aproximações.

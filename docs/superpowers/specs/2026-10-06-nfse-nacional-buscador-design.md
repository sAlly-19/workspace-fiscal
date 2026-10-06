# NFS-e Nacional no Buscador NF — Especificação de Design

**Data:** 6 de outubro de 2026  
**Status:** aprovado para planejamento  
**Escopo:** consulta, distribuição e pesquisa de NFS-e Nacional no Buscador NF

## 1. Objetivo

Adicionar ao Buscador NF um fluxo completo de consulta e distribuição de NFS-e do Sistema Nacional, usando exclusivamente as APIs oficiais do ADN e da SEFIN Nacional e o certificado digital já associado à empresa.

A entrega deve permitir sincronização incremental por NSU, consulta direta por chave, persistência idempotente do XML original, pesquisa local e vínculo de eventos. NF-e e CT-e devem continuar funcionando sem alterações de comportamento.

Nesta etapa, a NFS-e permanecerá exclusivamente no Buscador NF. Não haverá inserção automática no banco ou na árvore do NF View, emissão de NFS-e, geração de PDF ou visualização DANFSE.

## 2. Decisões aprovadas

- Estender o modelo genérico do Buscador para aceitar `NFSE`.
- Manter clientes e sincronizador próprios para o protocolo NFS-e.
- Reutilizar empresa, certificado, banco, storage, busca, paginação, progresso, feedback e parser existentes.
- Não refatorar NF-e e CT-e para um motor universal.
- Não criar banco, storage ou cadastro de certificado paralelo.
- Manter documentos principais e eventos de NFS-e em estruturas relacionadas, mas distintas.
- Configurar o ambiente de NFS-e separadamente do ambiente SEFAZ.
- Mostrar HTML remoto somente para decisões de UI/UX; documentação e planejamento técnico permanecem em Markdown.

## 3. Arquitetura existente e pontos de extensão

### 3.1 Certificado e transporte atual

- `ICertificateProvider` lista e resolve certificados por thumbprint.
- `WindowsStoreCertificateProvider` acessa `CurrentUser/My` e `LocalMachine/My` por meio de `windows-bridge.ps1`.
- A chave privada permanece no Windows Certificate Store.
- O bridge atual executa apenas requisições SOAP POST para NF-e e CT-e.
- O banco armazena somente metadados públicos e o thumbprint do certificado associado à empresa.

O transporte NFS-e ampliará esse mesmo provider/bridge para requisições HTTPS REST autenticadas. Nenhum PFX, senha, certificado integral ou chave privada será enviado ao renderer.

### 3.2 Distribuição e NSU atuais

- `DistributionEngine` coordena NF-e e CT-e.
- `DistributionStateRepository` persiste o cursor por empresa, tipo e ambiente.
- `SefazDistributionProvider` contém a integração SOAP.
- A gravação do XML e a atualização do NSU ocorrem dentro de uma unidade recuperável usando `DatabaseManager.transaction()` e `StorageService.saveXmlTransactional()`.

NFS-e terá um `NfseSynchronizer` próprio, preservando o `DistributionEngine` existente.

### 3.3 Persistência e pesquisa atuais

- O Buscador usa `fiscal_storage.db`, separado do banco do NF View.
- `documents` armazena metadados e caminhos dos XMLs.
- `DocumentRepository` fornece upsert, busca e paginação.
- `StorageService` grava arquivos de modo atômico no diretório da empresa.
- A unicidade atual é `company_id + access_key`.

A NFS-e será persistida nesse mesmo banco e storage do Buscador. Não será copiada para o banco principal do NF View.

### 3.4 Parser e apresentação atuais

- `NFSeParser` já reconhece XML Nacional, ABRASF e um formato municipal simplificado.
- O teste atual cobre ABRASF, mas não contém uma fixture oficial Nacional v1.01.
- O modelo fiscal compartilhado já representa prestador, tomador, serviço, ISS e retenções.
- O DANFSE existente pertence ao NF View e não será ativado no Buscador nesta etapa.

O parser existente será ampliado quando a fixture Nacional oficial demonstrar lacunas. Um adapter converterá seu resultado para os metadados do Buscador. Eventos usarão um parser específico porque não são NFS-e principais.

### 3.5 Electron e frontend atuais

- O renderer acessa o core apenas por métodos expostos no preload.
- Handlers IPC validam empresa ativa, IDs, filtros e caminhos.
- `BuscadorApp` concentra seleção de empresa, busca local, sincronização, progresso e feedback.
- O frontend já oferece sidebar de empresas/certificado, modal de progresso, filtros, tabela, paginação e detalhes.

A NFS-e será adicionada como um workspace dentro do Buscador, não como uma aplicação separada.

## 4. Fontes oficiais e contratos

### 4.1 Referências

- [Documentação atual de produção](https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/documentacao-atual)
- [Manual de Contribuintes — APIs do ADN, versão 1.0 de 12/02/2026](https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/documentacao-atual/manual-contribuintes-apis-adn-sistema-nacional-nfse.pdf)
- [Manual de Contribuintes — Emissor Público Nacional](https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/documentacao-atual/manual-contribuintes-emissor-publico-api-sistema-nacional-nfs-e-v1-2-out2025.pdf)
- [Endereços oficiais das APIs em produção e produção restrita](https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/apis-prod-restrita-e-producao)
- [Esquemas NFS-e v1.01 de 09/02/2026](https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/documentacao-atual)
- [Especificações técnicas do DANFSe de 05/05/2026](https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/rtc/nt-008-se-cgnfse-danfse-20260505.pdf)

### 4.2 Endpoints confirmados

ADN de contribuintes:

- produção: `https://adn.nfse.gov.br/contribuintes`
- produção restrita: `https://adn.producaorestrita.nfse.gov.br/contribuintes`
- distribuição: `GET /DFe/{NSU}`
- eventos: `GET /NFSe/{ChaveAcesso}/Eventos`

SEFIN Nacional:

- produção: `https://sefin.nfse.gov.br/SefinNacional`
- produção restrita: `https://sefin.producaorestrita.nfse.gov.br/API/SefinNacional`
- consulta direta: `GET /nfse/{chaveAcesso}`

As URLs-base ficarão centralizadas em um único módulo de configuração.

### 4.3 Gate do contrato oficial

O Swagger interativo não pôde ser obtido neste ambiente porque o servidor encerrou a negociação TLS antes de entregar a documentação. Os manuais confirmam os caminhos e informam que a distribuição pode consultar outro CNPJ do mesmo CNPJ-base do certificado, porém não fornecem todo o envelope de resposta, nomes exatos de query parameters, headers específicos ou schema de erros.

Esses detalhes não serão inferidos. O wire contract ficará concentrado em um adapter com validação em runtime. A implementação concreta desse adapter exige uma das seguintes fontes primárias:

1. OpenAPI/Swagger oficial exportado;
2. resposta real anonimizada do ambiente de produção restrita;
3. documentação oficial adicional fornecida pelo usuário.

Enquanto o contrato obrigatório não estiver disponível, a operação afetada falhará com `NfseContractError` antes de enviar uma chamada aproximada. Os clientes, interfaces, transporte, persistência e testes com fixtures poderão ser implementados sem acoplar o restante do sistema ao formato wire.

### 4.4 Chave de acesso

A documentação técnica atual define a chave da NFS-e Nacional com 50 dígitos. Os utilitários de chave de 44 dígitos usados por NF-e/CT-e não serão reutilizados para validação da NFS-e.

Será criado um validador específico para NFS-e que:

- remove apenas formatação permitida;
- exige exatamente 50 dígitos;
- preserva a chave sem o prefixo XML `NFS`;
- não aplica a decomposição de chave NF-e/CT-e;
- aplica dígito verificador somente se a regra oficial estiver disponível nos artefatos técnicos selecionados.

`StorageService` passará a validar o tamanho conforme o tipo do documento: 44 dígitos para NF-e/CT-e e 50 para NFS-e.

## 5. Componentes

### 5.1 Transporte HTTPS autenticado

`ICertificateProvider` receberá uma operação genérica `executeHttpRequest` sem remover `executeSoapRequest`.

Responsabilidades:

- aceitar somente HTTPS;
- resolver o certificado pelo thumbprint já associado;
- suportar `GET`, timeout e `AbortSignal`;
- aplicar TLS validado pelo sistema operacional;
- retornar status, headers permitidos e corpo;
- sanitizar erros do bridge;
- nunca permitir `rejectUnauthorized: false` ou equivalente.

O `windows-bridge.ps1` ganhará uma ação REST separada da ação SOAP existente. A implementação SOAP continuará intacta.

### 5.2 `NfseAdnClient`

Responsabilidades:

- selecionar a URL-base do ADN pelo ambiente;
- montar somente requests confirmados pelo contrato oficial;
- consultar distribuição por NSU;
- consultar eventos por chave;
- interpretar status HTTP e o wire contract;
- retornar tipos de domínio independentes do JSON da API.

O cliente não gravará arquivos, atualizará NSU nem aplicará regras de sincronização.

### 5.3 `NfseSefinClient`

Responsabilidades:

- selecionar a URL-base da SEFIN pelo ambiente;
- consultar NFS-e por chave de 50 dígitos;
- interpretar status e resposta;
- devolver o XML e metadados de transporte ao serviço chamador.

Emissão (`POST /nfse`) não será exposta.

### 5.4 `NfseDocumentAdapter`

Responsabilidades:

- reconhecer e decodificar o documento retornado pelo contrato oficial;
- preservar os bytes/texto XML originais;
- chamar `NFSeParser` para a NFS-e principal;
- mapear o modelo fiscal compartilhado para os campos pesquisáveis do Buscador;
- rejeitar conteúdo desconhecido sem avançar o lote.

### 5.5 `NfseEventParser`

Responsabilidades:

- identificar eventos oficiais pelo XML;
- extrair chave da NFS-e, identificador, tipo, sequência e data quando presentes;
- preservar o XML original;
- indicar se o evento altera a situação da nota somente para tipos confirmados pela documentação oficial;
- manter eventos desconhecidos como eventos genéricos, sem inventar efeito fiscal.

### 5.6 `NfseSynchronizer`

Responsabilidades:

- validar empresa, certificado e ambiente;
- carregar o estado `company + NFSE + environment`;
- consultar o ADN a partir do último NSU confirmado;
- decodificar e validar todo o lote;
- persistir documentos e eventos de forma idempotente;
- atualizar situações afetadas por eventos reconhecidos;
- atualizar o NSU somente após a persistência integral;
- continuar enquanto o contrato indicar documentos pendentes;
- reportar progresso;
- interromper e preservar o cursor diante de cancelamento ou falha.

O sincronizador será independente do `DistributionEngine` para evitar alterações no fluxo estável de NF-e/CT-e.

## 6. Modelo de dados e migration

### 6.1 Versão

A migration elevará `PRAGMA user_version` de 2 para 3. Ela será transacional e manterá foreign keys desativadas somente durante a reconstrução controlada das tabelas com `CHECK` incompatível.

### 6.2 `distribution_state`

Alterações:

- permitir `document_type IN ('NFE', 'CTE', 'NFSE')`;
- manter a chave única `(company_id, document_type, environment)`;
- reutilizar `last_nsu`, `max_nsu`, `last_query_at`, `status`, `last_error`, `last_cstat` e `next_query_at`;
- tratar o cursor de NFS-e como inteiro decimal serializado em texto, sem impor a semântica de 15 dígitos da SEFAZ.

NF-e e CT-e continuarão usando o formatador atual de 15 dígitos. NFS-e usará normalização e comparação próprias baseadas em `BigInt`.

### 6.3 `documents`

Alterações:

- permitir `document_type = 'NFSE'`;
- adicionar `environment`;
- adicionar `origin`, com valores de domínio para distribuição SEFAZ, distribuição ADN e consulta direta SEFIN;
- adicionar `content_hash` para idempotência de conteúdo;
- substituir o índice único atual por `(company_id, document_type, environment, access_key)`;
- manter XML original, NSU, recebimento e metadados pesquisáveis.

Os documentos legados serão marcados com o ambiente SEFAZ configurado no instante da migration, pois o schema atual não preserva o ambiente histórico. Essa limitação será registrada no log de migration. Novos documentos sempre receberão ambiente explícito.

### 6.4 `nfse_events`

Nova tabela:

- `id`;
- `company_id`;
- `document_id` anulável, com vínculo posterior;
- `environment`;
- `access_key` de 50 dígitos;
- `nsu` anulável para eventos vindos de consulta direta;
- `event_identifier` anulável;
- `event_type`;
- `event_sequence` anulável;
- `event_date` anulável;
- `schema_type`;
- `xml_path`;
- `content_hash`;
- timestamps.

Índices:

- busca por documento;
- busca por empresa, ambiente e chave;
- unicidade por empresa, ambiente e `content_hash`;
- unicidade por identificador oficial quando ele estiver disponível.

Um evento pode ser salvo antes da NFS-e principal. Quando a nota for persistida, eventos pendentes com a mesma empresa, ambiente e chave serão vinculados.

### 6.5 Configurações

Adicionar `nfse_environment`, com valores `homologation` e `production`. No frontend, `homologation` será apresentado como “Produção restrita”. `sefaz_environment` continuará controlando apenas NF-e/CT-e.

## 7. Idempotência e atomicidade

### 7.1 Documento principal

- Distribuição e consulta direta convergem para o mesmo registro.
- A chave lógica é empresa, tipo, ambiente e chave de acesso.
- `content_hash` evita regravação do mesmo XML.
- Um XML mais completo pode atualizar metadados e caminho sem criar outra nota.
- O XML recebido será gravado sem normalização ou reserialização.

### 7.2 Eventos

- O identificador oficial é usado quando disponível.
- O hash do XML é a proteção complementar e obrigatória.
- Repetir distribuição ou consulta de eventos não cria duplicatas.
- Eventos não substituem o XML principal.

### 7.3 Ordem de commit

Para cada lote:

1. receber a resposta;
2. validar e decodificar todos os itens;
3. criar gravações transacionais pendentes dos XMLs;
4. inserir ou atualizar documentos e eventos dentro da transação do banco;
5. atualizar o NSU dentro da mesma transação;
6. persistir o banco;
7. confirmar as gravações de arquivos.

Se qualquer etapa falhar, arquivos pendentes e snapshot do banco serão revertidos. O NSU anterior continuará sendo o ponto de retomada.

## 8. Erros, retry e recuperação

Erros de domínio:

- `NfseCertificateError`;
- `NfseTlsError`;
- `NfseHttpError`;
- `NfseContractError`;
- `NfseDocumentError`;
- `NfsePersistenceError`.

Política:

- 400, 401, 403, 404 e 409 não recebem retry automático;
- 429 respeita `Retry-After` quando fornecido;
- timeout, falha transitória de rede, 502, 503 e 504 podem repetir uma vez por serem operações GET idempotentes;
- resposta vazia ou ausência de novos documentos atualiza `next_query_at` somente conforme regra ou header oficial;
- cancelamento encerra antes da próxima chamada e preserva o cursor confirmado;
- XML inválido, schema inesperado, falha de disco e erro de banco interrompem o lote;
- o status de sincronização e o histórico registram mensagem sanitizada e duração.

## 9. Segurança e logs

- Todas as chamadas autenticadas ocorrerão no processo principal.
- O renderer receberá apenas dados fiscais necessários à interface.
- URLs devem ser HTTPS e pertencer às bases oficiais configuradas.
- A validação TLS nunca será desativada.
- Timeout e cancelamento serão obrigatórios.
- O logger Pino já existente será reutilizado.
- Logs poderão conter empresa por ID/CNPJ mascarado, ambiente, NSU inicial/final, contagens, duração, status HTTP e erro sanitizado.
- Logs não poderão conter senha, private key, PFX/P12, certificado completo, Authorization, headers sensíveis ou XML integral.
- Erros expostos por IPC terão mensagem para o usuário separada dos detalhes técnicos permitidos.

## 10. IPC

Novos canais conceituais:

- `nfse:sync`;
- `nfse:getStatus`;
- `nfse:cancelSync`;
- `nfse:resetNSU`;
- `nfse:consultByKey`;
- `nfse:getEvents`;
- `nfse:progress`.

Todos usarão `registerSecureHandler`, validarão a empresa ativa e limitarão tamanho/formato de chave e filtros. O preload exporá métodos tipados em `FiscalDesktopAPI`. Nenhuma regra de sincronização será duplicada no renderer.

## 11. Frontend

### 11.1 Navegação

O Buscador terá um seletor central:

- `SEFAZ · NF-e / CT-e`;
- `NFS-e Nacional`.

O seletor troca apenas o workspace principal. Sidebar, empresa ativa, certificado, tema e configurações permanecem compartilhados.

### 11.2 Workspace NFS-e

Exibirá:

- ambiente NFS-e;
- último NSU;
- data da última sincronização;
- resultado/erro mais recente;
- contagem de documentos e eventos;
- botão “Sincronizar NFS-e”;
- consulta direta por chave;
- filtros de período, situação, prestador, tomador, número e chave;
- tabela paginada;
- detalhes e eventos;
- download do XML e abertura da pasta.

O modal de progresso e o sistema de feedback atuais serão reutilizados.

### 11.3 PDF e DANFSE

Não haverá botão ativo de PDF, geração de PDF, download DANFSE ou abertura do visualizador DANFSE. A interface poderá informar “PDF indisponível nesta etapa” sem oferecer uma ação executável.

## 12. Testes

### 12.1 Unidade

- seleção de endpoint por ambiente;
- validação de chave NFS-e de 50 dígitos;
- transporte REST mTLS mockado;
- sanitização de erros e logs;
- parsing de XML Nacional v1.01;
- regressão do parser ABRASF;
- parsing e classificação de eventos;
- deduplicação de documentos e eventos;
- consulta direta convergindo para o documento distribuído;
- resposta vazia;
- status HTTP e retry;
- certificado ausente, expirado ou incompatível;
- avanço de NSU após sucesso;
- preservação de NSU e rollback após cada classe de falha.

### 12.2 Integração local

- migration v2 → v3 com documentos NF-e/CT-e existentes;
- persistência e busca de NFS-e;
- evento antes e depois da nota;
- atomicidade entre SQLite e filesystem temporário;
- handlers IPC e validação de entradas;
- controladores de estado do frontend para aba, filtros, progresso e feedback.

Não será adicionada uma biblioteca de UI apenas para esses testes. Funções de controle serão extraídas e testadas com Vitest quando o DOM não for necessário.

### 12.3 Regressão

- `npm test`;
- `npm run lint`;
- `npm run build`;
- testes existentes de NF-e, CT-e, ABRASF, importação, storage e backup;
- smoke test manual do Buscador SEFAZ.

### 12.4 Validação externa

A validação em produção restrita não fará parte dos testes unitários. Ela dependerá de:

- certificado válido;
- CNPJ autorizado;
- Swagger/OpenAPI ou resposta oficial anonimizada;
- disponibilidade do ambiente oficial.

## 13. Critérios de aceite

- Empresa e certificado existentes são reutilizados.
- NF-e e CT-e mantêm o comportamento atual.
- NFS-e tem ambiente e NSU próprios.
- Sincronização pode ser iniciada, acompanhada e cancelada.
- Consulta direta por chave usa o mesmo pipeline de persistência.
- XML original é preservado e pesquisável.
- Eventos são idempotentes e vinculados à nota.
- Repetição de chamadas não cria duplicatas.
- Falhas não avançam o NSU nem deixam arquivos órfãos.
- Erros são úteis e não expõem dados sensíveis.
- PDF, DANFSE e emissão permanecem desativados.
- Detalhes ausentes do contrato oficial não são inventados.

## 14. Fora do escopo

- emissão de DPS ou NFS-e;
- assinatura XML para emissão ou eventos;
- registro de eventos;
- scraper ou automação do Emissor Web;
- inserção automática no NF View;
- visualização ou geração de DANFSE/PDF;
- refatoração de NF-e/CT-e para um motor universal;
- novas bibliotecas de UI ou HTTP sem necessidade comprovada.

## 15. Pendências externas conhecidas

1. Obter o OpenAPI/Swagger oficial de contribuintes ou resposta real anonimizada para fechar query parameters, headers, envelope JSON e schema de erros.
2. Obter fixtures XML oficiais ou anonimizadas de NFS-e v1.01 e eventos.
3. Validar o handshake mTLS e os fluxos em produção restrita com certificado/CNPJ autorizado.
4. Confirmar intervalos de consulta e rate limit atuais no contrato oficial antes da validação externa.

Essas pendências não autorizam aproximações. Cada parte dependente ficará isolada atrás dos contratos definidos nesta especificação.

# Plano de Componentização: WorkspaceTree.tsx

> **Meta:** Reduzir a complexidade de `src/web/features/workspace/WorkspaceTree.tsx` (553 linhas) através de componentização modular e limpa, com **zero alteração de comportamento, layout, atalhos, estilos ou regras de negócio**.

---

## 1. Diagnóstico e Arquitetura

O arquivo `WorkspaceTree.tsx` concentra atualmente:
1. **Cabeçalho & Breadcrumbs:** Barra superior "Pastas", botão "+ Nova Pasta" e trilha de navegação (breadcrumb).
2. **Nó Recursivo de Pasta (`WorkspaceTreeNode`):**
   - Recuo dinâmico por profundidade (`depth * 14 + 8`).
   - Chevron de expandir/recolher.
   - Ícones de pasta (aberta/fechada) com distinção temática.
   - Edição inline de nome com suporte a `Enter` e `Escape`.
   - Contador de documentos em badge.
   - Menu contextual flutuante (`MoreVertical`): "Nova Subpasta", "Importar XML aqui", "Renomear", "Excluir Pasta".
   - Input inline de criação de subpasta.
   - Linha guia vertical conectando os nós filhos recursivos.
3. **Área Raiz & Empty State (`WorkspaceTreeRootArea`):**
   - Opção "Todos os Documentos".
   - Formulário inline de criação na raiz.
   - Empty state ilustrado com botão "Criar Primeira Pasta".
4. **Orquestrador Central (`WorkspaceTree.tsx`):**
   - Conexão com `useWorkspaceStore`.
   - Gerenciamento dos estados de criação, edição, menu ativo e arrasto (drag and drop).
   - Modal de confirmação de exclusão (`ConfirmModal`).

---

## 2. Estratégia de Divisão em Módulos

Diretório alvo: `src/web/features/workspace/tree/`

1. **`WorkspaceTreeHeader.tsx`**:
   - Barra superior com título e botão de criar pasta raiz.
   - Breadcrumb horizontal de navegação.

2. **`WorkspaceTreeNode.tsx`**:
   - Renderizador recursivo de cada pasta individual e suas filhas.
   - Drop targets, edição inline, menu de contexto e formulário de subpasta.

3. **`WorkspaceTreeRootArea.tsx`**:
   - Item "Todos os Documentos".
   - Formulário de criação na raiz.
   - Empty state quando a lista de pastas estiver vazia.

4. **`index.ts`**:
   - Ponto de exportação limpo para o submódulo `tree`.

5. **`WorkspaceTree.tsx` (refatorado)**:
   - Orquestrador principal reduzido para ~150 linhas.

6. **`workspace-tree.test.ts`**:
   - Suíte de testes unitários para validar renderização, temas, expansão e interações.

---

## 3. Protocolo de Validação
- Vitest: Executar suíte completa sem falhas.
- Lint/Typecheck: 0 erros em Web e Electron.
- Build: Código de saída 0.
- Auditoria do Agente 5 antes do commit local.
- **NUNCA executar `git push`**.


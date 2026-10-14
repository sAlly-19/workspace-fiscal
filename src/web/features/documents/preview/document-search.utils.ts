export const SEARCH_MARK_DEFAULT_CLASS =
  'wf-search-match bg-yellow-300 dark:bg-yellow-400 text-black rounded-xs px-0.5 transition-colors';

export const SEARCH_MARK_ACTIVE_CLASS =
  'wf-search-match wf-search-active bg-orange-500 text-white font-bold rounded-xs px-0.5 shadow-sm transition-colors ring-2 ring-orange-400';

/**
 * Remove todas as tags <mark> inseridas pela busca e normaliza os nós de texto.
 */
export function clearHighlights(container: HTMLElement | null): void {
  if (!container) return;

  const marks = container.querySelectorAll('mark[data-search-mark="true"]');
  marks.forEach((mark) => {
    const parent = mark.parentNode;
    if (parent) {
      parent.replaceChild(document.createTextNode(mark.textContent || ''), mark);
      parent.normalize();
    }
  });
}

function collectTextNodes(node: Node, textNodes: Text[]): void {
  if (node.nodeType === 3 /* Node.TEXT_NODE */) {
    if (node.nodeValue && node.nodeValue.trim()) {
      textNodes.push(node as Text);
    }
    return;
  }

  const el = node as HTMLElement;
  const tag = el.tagName ? el.tagName.toUpperCase() : '';
  if (
    tag === 'SCRIPT' ||
    tag === 'STYLE' ||
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'BUTTON' ||
    tag === 'MARK'
  ) {
    return;
  }
  if (typeof el.getAttribute === 'function' && el.getAttribute('data-search-ignore') === 'true') {
    return;
  }

  let child = node.firstChild;
  while (child) {
    collectTextNodes(child, textNodes);
    child = child.nextSibling;
  }
}

/**
 * Localiza todas as ocorrências de `query` dentro de `container` e as envolve com tags <mark>.
 */
export function highlightMatches(container: HTMLElement | null, query: string): HTMLElement[] {
  if (!container || typeof document === 'undefined') return [];

  clearHighlights(container);

  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [];

  const lowerQuery = trimmedQuery.toLowerCase();
  const textNodes: Text[] = [];
  collectTextNodes(container, textNodes);

  const createdMarks: HTMLElement[] = [];

  for (const textNode of textNodes) {
    let node: Text | null = textNode;
    let text = node.nodeValue || '';
    let lowerText = text.toLowerCase();
    let matchIndex = lowerText.indexOf(lowerQuery);

    while (matchIndex !== -1 && node) {
      // Divide o nó de texto antes da ocorrência
      const matchNode = node.splitText(matchIndex);
      // Divide após o comprimento do termo buscado
      const restNode = matchNode.splitText(lowerQuery.length);

      const mark = document.createElement('mark');
      mark.setAttribute('data-search-mark', 'true');
      mark.className = SEARCH_MARK_DEFAULT_CLASS;
      mark.textContent = matchNode.nodeValue;

      matchNode.parentNode?.replaceChild(mark, matchNode);
      createdMarks.push(mark);

      node = restNode;
      text = node.nodeValue || '';
      lowerText = text.toLowerCase();
      matchIndex = lowerText.indexOf(lowerQuery);
    }
  }

  return createdMarks;
}

/**
 * Aplica destaque diferenciado na ocorrência ativa e rola até ela suavemente.
 */
export function setActiveMatch(marks: HTMLElement[], activeIndex: number): void {
  if (!marks || marks.length === 0) return;

  marks.forEach((mark, idx) => {
    if (idx === activeIndex) {
      mark.className = SEARCH_MARK_ACTIVE_CLASS;
      if (typeof mark.scrollIntoView === 'function') {
        try {
          mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } catch {
          mark.scrollIntoView();
        }
      }
    } else {
      mark.className = SEARCH_MARK_DEFAULT_CLASS;
    }
  });
}

export interface FormattedInline {
  type: 'text' | 'bold' | 'italic' | 'code' | 'link';
  content: string;
  url?: string;
}

export type ReleaseBlock =
  | { type: 'heading'; level: 1 | 2 | 3 | 4; inlines: FormattedInline[] }
  | { type: 'paragraph'; inlines: FormattedInline[] }
  | { type: 'list'; ordered?: boolean; items: FormattedInline[][] }
  | { type: 'divider' }
  | { type: 'codeblock'; content: string };

/**
 * Decodifica entidades HTML comuns em caracteres legíveis.
 */
export function decodeHtmlEntities(text: string): string {
  if (!text) return '';
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

/**
 * Remove qualquer tag HTML e scripts/estilos perigosos, retornando texto puro limpo.
 */
export function cleanReleaseNotesText(raw: string): string {
  if (!raw) return '';
  let cleaned = raw
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '');

  cleaned = decodeHtmlEntities(cleaned);
  return cleaned.trim();
}

/**
 * Converte trecho de texto com tags inlines (HTML ou Markdown) em tokens formatados.
 */
export function parseInline(raw: string): FormattedInline[] {
  if (!raw) return [];

  // Remove tags de bloco soltas ou tags perigosas
  let text = raw
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  const inlines: FormattedInline[] = [];

  // Regex combinada para suportar:
  // 1. Links HTML: <a href="url">text</a>
  // 2. Links Markdown: [text](url)
  // 3. Negrito HTML: <strong>text</strong> ou <b>text</b>
  // 4. Negrito Markdown: **text**
  // 5. Itálico HTML: <em>text</em> ou <i>text</i>
  // 6. Itálico Markdown: *text* ou _text_
  // 7. Código HTML: <code>text</code>
  // 8. Código Markdown: `text`
  // 9. Tags desconhecidas descartadas: <tag>...</tag> ou <tag/>
  const pattern =
    /(?:<a\s+(?:[^>]*?\s+)?href=["']([^"']+)["'][^>]*>(.*?)<\/a>)|(?:\[(.*?)\]\((.*?)\))|(?:<(?:strong|b)>([\s\S]*?)<\/(?:strong|b)>)|(?:\*\*([^*]+)\*\*)|(?:<(?:em|i)>([\s\S]*?)<\/(?:em|i)>)|(?:\*([^*]+)\*)|(?:<code>([\s\S]*?)<\/code>)|(?:`([^`]+)`)|(?:<[^>]+>)/gi;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const plain = text.slice(lastIndex, match.index);
      if (plain) {
        inlines.push({
          type: 'text',
          content: decodeHtmlEntities(plain.replace(/<[^>]+>/g, '')),
        });
      }
    }

    if (match[1] !== undefined && match[2] !== undefined) {
      // <a href="...">...</a>
      inlines.push({
        type: 'link',
        url: match[1],
        content: decodeHtmlEntities(match[2].replace(/<[^>]+>/g, '')),
      });
    } else if (match[3] !== undefined && match[4] !== undefined) {
      // [text](url)
      inlines.push({
        type: 'link',
        url: match[4],
        content: decodeHtmlEntities(match[3]),
      });
    } else if (match[5] !== undefined) {
      // <strong>...</strong> ou <b>...</b>
      inlines.push({
        type: 'bold',
        content: decodeHtmlEntities(match[5].replace(/<[^>]+>/g, '')),
      });
    } else if (match[6] !== undefined) {
      // **text**
      inlines.push({
        type: 'bold',
        content: decodeHtmlEntities(match[6]),
      });
    } else if (match[7] !== undefined) {
      // <em>...</em> ou <i>...</i>
      inlines.push({
        type: 'italic',
        content: decodeHtmlEntities(match[7].replace(/<[^>]+>/g, '')),
      });
    } else if (match[8] !== undefined) {
      // *text*
      inlines.push({
        type: 'italic',
        content: decodeHtmlEntities(match[8]),
      });
    } else if (match[9] !== undefined) {
      // <code>...</code>
      inlines.push({
        type: 'code',
        content: decodeHtmlEntities(match[9].replace(/<[^>]+>/g, '')),
      });
    } else if (match[10] !== undefined) {
      // `text`
      inlines.push({
        type: 'code',
        content: decodeHtmlEntities(match[10]),
      });
    }
    // Caso contrário, é uma tag desconhecida descartada via (?:<[^>]+>)

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    const trailing = text.slice(lastIndex);
    if (trailing) {
      inlines.push({
        type: 'text',
        content: decodeHtmlEntities(trailing.replace(/<[^>]+>/g, '')),
      });
    }
  }

  return inlines.filter((item) => item.content.length > 0);
}

/**
 * Realiza o parsing estruturado de release notes em blocos formatados.
 * Suporta entradas originadas de HTML (electron-updater) ou Markdown (GitHub Releases).
 */
export function parseReleaseNotes(raw: string): ReleaseBlock[] {
  if (!raw || !raw.trim()) return [];

  // Remove scripts e estilos por completo
  const sanitized = raw
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .trim();

  const isHtml = /<(?:h[1-6]|p|hr|ul|ol|li|div|span|strong|em|br)\b[^>]*>/i.test(sanitized);

  if (isHtml) {
    return parseHtmlBlocks(sanitized);
  } else {
    return parseMarkdownBlocks(sanitized);
  }
}

function parseHtmlBlocks(html: string): ReleaseBlock[] {
  const blocks: ReleaseBlock[] = [];

  // Expressão que localiza elementos principais de bloco
  const blockRegex =
    /(?:<h([1-6])[^>]*>([\s\S]*?)<\/h\1>)|(?:<hr\s*\/?>)|(?:<(ul|ol)[^>]*>([\s\S]*?)<\/\3>)|(?:<p[^>]*>([\s\S]*?)<\/p>)|(?:<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>)/gi;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = blockRegex.exec(html)) !== null) {
    // Verifica se há texto antes do bloco encontrado
    if (match.index > lastIndex) {
      const intermediate = html.slice(lastIndex, match.index).trim();
      const cleaned = cleanReleaseNotesText(intermediate);
      if (cleaned) {
        blocks.push({
          type: 'paragraph',
          inlines: parseInline(intermediate),
        });
      }
    }

    if (match[1] !== undefined && match[2] !== undefined) {
      // Heading: <h1-6>
      const rawLevel = parseInt(match[1], 10);
      const level = (Math.min(Math.max(rawLevel, 1), 4) as 1 | 2 | 3 | 4);
      blocks.push({
        type: 'heading',
        level,
        inlines: parseInline(match[2]),
      });
    } else if (match[0].toLowerCase().startsWith('<hr')) {
      // Horizontal Rule: <hr>
      blocks.push({ type: 'divider' });
    } else if (match[3] !== undefined && match[4] !== undefined) {
      // List: <ul> ou <ol>
      const ordered = match[3].toLowerCase() === 'ol';
      const items: FormattedInline[][] = [];
      const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
      let liMatch: RegExpExecArray | null;

      while ((liMatch = liRegex.exec(match[4])) !== null) {
        const inlines = parseInline(liMatch[1]);
        if (inlines.length > 0) {
          items.push(inlines);
        }
      }

      if (items.length > 0) {
        blocks.push({
          type: 'list',
          ordered,
          items,
        });
      }
    } else if (match[5] !== undefined) {
      // Paragraph: <p>
      const inlines = parseInline(match[5]);
      if (inlines.length > 0) {
        blocks.push({
          type: 'paragraph',
          inlines,
        });
      }
    } else if (match[6] !== undefined) {
      // Pre/Code
      blocks.push({
        type: 'codeblock',
        content: decodeHtmlEntities(match[6]),
      });
    }

    lastIndex = blockRegex.lastIndex;
  }

  if (lastIndex < html.length) {
    const trailing = html.slice(lastIndex).trim();
    const cleaned = cleanReleaseNotesText(trailing);
    if (cleaned) {
      blocks.push({
        type: 'paragraph',
        inlines: parseInline(trailing),
      });
    }
  }

  return blocks;
}

function parseMarkdownBlocks(md: string): ReleaseBlock[] {
  const blocks: ReleaseBlock[] = [];
  const lines = md.split(/\r?\n/);
  let currentList: FormattedInline[][] | null = null;
  let currentListOrdered = false;
  let paragraphBuffer: string[] = [];

  const flushParagraph = () => {
    if (paragraphBuffer.length > 0) {
      const text = paragraphBuffer.join(' ').trim();
      if (text) {
        blocks.push({
          type: 'paragraph',
          inlines: parseInline(text),
        });
      }
      paragraphBuffer = [];
    }
  };

  const flushList = () => {
    if (currentList && currentList.length > 0) {
      blocks.push({
        type: 'list',
        ordered: currentListOrdered,
        items: currentList,
      });
      currentList = null;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    // Dividers: --- ou ***
    if (/^[-*_]{3,}$/.test(line)) {
      flushParagraph();
      flushList();
      blocks.push({ type: 'divider' });
      continue;
    }

    // Headings: #, ##, ###, ####
    const headingMatch = line.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      flushParagraph();
      flushList();
      const level = headingMatch[1].length as 1 | 2 | 3 | 4;
      blocks.push({
        type: 'heading',
        level,
        inlines: parseInline(headingMatch[2]),
      });
      continue;
    }

    // List item: * ou - ou 1.
    const listItemMatch = line.match(/^([*\-+]|\d+\.)\s+(.+)$/);
    if (listItemMatch) {
      flushParagraph();
      const isOrdered = /^\d+\./.test(listItemMatch[1]);
      if (!currentList) {
        currentList = [];
        currentListOrdered = isOrdered;
      }
      currentList.push(parseInline(listItemMatch[2]));
      continue;
    }

    // Linha de texto normal do parágrafo
    flushList();
    paragraphBuffer.push(line);
  }

  flushParagraph();
  flushList();

  return blocks;
}


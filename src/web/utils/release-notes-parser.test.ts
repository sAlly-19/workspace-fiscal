import { describe, it, expect } from 'vitest';
import {
  decodeHtmlEntities,
  cleanReleaseNotesText,
  parseReleaseNotes,
  type ReleaseBlock,
} from './release-notes-parser';

describe('release-notes-parser', () => {
  describe('decodeHtmlEntities', () => {
    it('decodifica entidades comuns em texto puro', () => {
      expect(decodeHtmlEntities('Gestão de Empresas &amp; Filtros')).toBe(
        'Gestão de Empresas & Filtros'
      );
      expect(decodeHtmlEntities('&quot;Workspace&quot; &lt;Fiscal&gt; &#39;v3&#39; &nbsp;')).toBe(
        '"Workspace" <Fiscal> \'v3\'  '
      );
    });
  });

  describe('cleanReleaseNotesText', () => {
    it('remove todas as tags HTML mantendo o texto limpo e entidades decodificadas', () => {
      const html = '<h1>🚀 Workspace Fiscal v3.5.0</h1><p>A versão <strong>v3.5.0</strong> traz melhorias &amp; correções.</p><hr>';
      const cleaned = cleanReleaseNotesText(html);

      expect(cleaned).not.toContain('<h1>');
      expect(cleaned).not.toContain('</h1>');
      expect(cleaned).not.toContain('<p>');
      expect(cleaned).not.toContain('</p>');
      expect(cleaned).not.toContain('<strong>');
      expect(cleaned).not.toContain('</strong>');
      expect(cleaned).not.toContain('<hr>');
      expect(cleaned).not.toContain('&amp;');
      expect(cleaned).toContain('🚀 Workspace Fiscal v3.5.0');
      expect(cleaned).toContain('A versão v3.5.0 traz melhorias & correções.');
    });

    it('elimina scripts e tags perigosas por completo', () => {
      const malicious = '<p>Nota normal</p><script>alert("hack")</script><style>body{color:red}</style>';
      const cleaned = cleanReleaseNotesText(malicious);

      expect(cleaned).toContain('Nota normal');
      expect(cleaned).not.toContain('alert');
      expect(cleaned).not.toContain('hack');
      expect(cleaned).not.toContain('color:red');
    });
  });

  describe('parseReleaseNotes', () => {
    it('deve parsear o snippet real com tags HTML da release v3.5.0', () => {
      const snippet = `
<h1>🚀 Workspace Fiscal v3.5.0</h1>
<p>A versão <strong>v3.5.0</strong> traz melhorias expressivas de usabilidade, padronização visual em todos os módulos e novas funcionalidades focadas no fluxo de consulta e gestão de documentos fiscais, com destaque para a <strong>NFS-e Nacional</strong>, gestão ágil de empresas cadastradas e aprimoramento na seleção de certificados digitais.</p>
<hr>
<h3>✨ Destaques da Versão</h3>
<h4>🏢 Gestão de Empresas &amp; Filtros Rápidos (Buscador NF)</h4>
<ul>
<li><strong>Filtro por Modelo no Card:</strong> Alternância imediata.</li>
<li>Exclusão segura de empresas.</li>
</ul>
      `.trim();

      const blocks: ReleaseBlock[] = parseReleaseNotes(snippet);

      // Bloco 1: h1
      expect(blocks[0]).toMatchObject({
        type: 'heading',
        level: 1,
      });
      expect(blocks[0].type === 'heading' && blocks[0].inlines[0].content).toContain('🚀 Workspace Fiscal v3.5.0');

      // Bloco 2: p com inlines (texto + strong)
      expect(blocks[1].type).toBe('paragraph');
      if (blocks[1].type === 'paragraph') {
        const strongItem = blocks[1].inlines.find((i) => i.type === 'bold');
        expect(strongItem).toBeDefined();
        expect(strongItem?.content).toBe('v3.5.0');
      }

      // Bloco 3: hr
      expect(blocks[2]).toMatchObject({ type: 'divider' });

      // Bloco 4: h3
      expect(blocks[3]).toMatchObject({
        type: 'heading',
        level: 3,
      });
      expect(blocks[3].type === 'heading' && blocks[3].inlines[0].content).toContain('✨ Destaques da Versão');

      // Bloco 5: h4 com &amp; decodificado para &
      expect(blocks[4]).toMatchObject({
        type: 'heading',
        level: 4,
      });
      if (blocks[4].type === 'heading') {
        const fullHeadingText = blocks[4].inlines.map((i) => i.content).join('');
        expect(fullHeadingText).toContain('Gestão de Empresas & Filtros Rápidos');
        expect(fullHeadingText).not.toContain('&amp;');
        expect(fullHeadingText).not.toContain('<h4>');
      }

      // Bloco 6: list
      expect(blocks[5].type).toBe('list');
      if (blocks[5].type === 'list') {
        expect(blocks[5].items.length).toBe(2);
        expect(blocks[5].items[0][0].type).toBe('bold');
        expect(blocks[5].items[0][0].content).toBe('Filtro por Modelo no Card:');
      }
    });

    it('suporta parsing de notas formatadas em Markdown puro', () => {
      const md = `
# Workspace Fiscal v3.5.0

A versão **v3.5.0** traz melhorias importantes.

---

### Destaques

* **Primeiro:** Detalhe 1
* **Segundo:** Detalhe 2
      `.trim();

      const blocks = parseReleaseNotes(md);

      expect(blocks[0]).toMatchObject({ type: 'heading', level: 1 });
      expect(blocks[1]).toMatchObject({ type: 'paragraph' });
      expect(blocks[2]).toMatchObject({ type: 'divider' });
      expect(blocks[3]).toMatchObject({ type: 'heading', level: 3 });
      expect(blocks[4]).toMatchObject({ type: 'list' });
      if (blocks[4].type === 'list') {
        expect(blocks[4].items.length).toBe(2);
      }
    });

    it('retorna array vazio para entradas nulas ou vazias', () => {
      expect(parseReleaseNotes('')).toEqual([]);
      expect(parseReleaseNotes('   ')).toEqual([]);
    });

    it('garante que nenhuma tag HTML desconhecida ou perigosa escape como texto ou tag', () => {
      const input = '<div>Texto dentro de div</div><script>console.log("bad")</script><p>Parágrafo seguro</p>';
      const blocks = parseReleaseNotes(input);

      const allText = JSON.stringify(blocks);
      expect(allText).not.toContain('<script>');
      expect(allText).not.toContain('<div>');
      expect(allText).not.toContain('console.log');
      expect(allText).toContain('Texto dentro de div');
      expect(allText).toContain('Parágrafo seguro');
    });

    it('processa links HTML e Markdown com segurança', () => {
      const input = '<p>Confira o <a href="https://github.com/sAlly-19/workspace-fiscal">repositório</a> e [changelog](https://github.com/releases).</p>';
      const blocks = parseReleaseNotes(input);

      expect(blocks[0].type).toBe('paragraph');
      if (blocks[0].type === 'paragraph') {
        const linkHtml = blocks[0].inlines.find((i) => i.url === 'https://github.com/sAlly-19/workspace-fiscal');
        expect(linkHtml).toBeDefined();
        expect(linkHtml?.content).toBe('repositório');

        const linkMd = blocks[0].inlines.find((i) => i.url === 'https://github.com/releases');
        expect(linkMd).toBeDefined();
        expect(linkMd?.content).toBe('changelog');
      }
    });
  });
});


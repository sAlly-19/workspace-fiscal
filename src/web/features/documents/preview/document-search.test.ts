import { describe, it, expect, beforeEach } from 'vitest';
import {
  clearHighlights,
  highlightMatches,
  setActiveMatch,
  SEARCH_MARK_DEFAULT_CLASS,
  SEARCH_MARK_ACTIVE_CLASS,
} from './document-search.utils';

class MockNode {
  nodeType: number;
  nodeValue: string | null = null;
  parentNode: MockElement | null = null;
  nextSibling: MockNode | null = null;
  previousSibling: MockNode | null = null;

  constructor(nodeType: number, value: string | null = null) {
    this.nodeType = nodeType;
    this.nodeValue = value;
  }
}

class MockTextNode extends MockNode {
  constructor(text: string) {
    super(3, text);
  }

  splitText(offset: number): MockTextNode {
    const full = this.nodeValue || '';
    this.nodeValue = full.slice(0, offset);
    const newText = full.slice(offset);
    const newNode = new MockTextNode(newText);
    if (this.parentNode) {
      this.parentNode.insertAfter(newNode, this);
    }
    return newNode;
  }
}

class MockElement extends MockNode {
  tagName: string;
  attributes: Record<string, string> = {};
  childNodes: MockNode[] = [];
  className: string = '';
  scrollIntoViewCalled = false;

  constructor(tagName: string) {
    super(1);
    this.tagName = tagName.toUpperCase();
  }

  get firstChild(): MockNode | null {
    return this.childNodes[0] || null;
  }

  setAttribute(k: string, v: string) {
    this.attributes[k] = v;
  }

  getAttribute(k: string): string | null {
    return this.attributes[k] || null;
  }

  appendChild(child: MockNode) {
    child.parentNode = this;
    if (this.childNodes.length > 0) {
      const last = this.childNodes[this.childNodes.length - 1];
      last.nextSibling = child;
      child.previousSibling = last;
    }
    this.childNodes.push(child);
  }

  insertAfter(newNode: MockNode, refNode: MockNode) {
    newNode.parentNode = this;
    const idx = this.childNodes.indexOf(refNode);
    if (idx !== -1) {
      this.childNodes.splice(idx + 1, 0, newNode);
      newNode.previousSibling = refNode;
      newNode.nextSibling = refNode.nextSibling;
      if (refNode.nextSibling) {
        refNode.nextSibling.previousSibling = newNode;
      }
      refNode.nextSibling = newNode;
    }
  }

  replaceChild(newChild: MockNode, oldChild: MockNode) {
    newChild.parentNode = this;
    const idx = this.childNodes.indexOf(oldChild);
    if (idx !== -1) {
      this.childNodes[idx] = newChild;
      newChild.previousSibling = oldChild.previousSibling;
      newChild.nextSibling = oldChild.nextSibling;
      if (oldChild.previousSibling) oldChild.previousSibling.nextSibling = newChild;
      if (oldChild.nextSibling) oldChild.nextSibling.previousSibling = newChild;
      oldChild.parentNode = null;
    }
  }

  normalize() {
    for (let i = 0; i < this.childNodes.length - 1; ) {
      const cur = this.childNodes[i];
      const nxt = this.childNodes[i + 1];
      if (cur.nodeType === 3 && nxt.nodeType === 3) {
        cur.nodeValue = (cur.nodeValue || '') + (nxt.nodeValue || '');
        this.childNodes.splice(i + 1, 1);
        cur.nextSibling = nxt.nextSibling;
        if (nxt.nextSibling) nxt.nextSibling.previousSibling = cur;
      } else {
        i++;
      }
    }
  }

  querySelectorAll(sel: string): MockElement[] {
    const res: MockElement[] = [];
    const walk = (el: MockElement) => {
      for (const c of el.childNodes) {
        if (c.nodeType === 1) {
          const cel = c as MockElement;
          if (sel.includes('mark') && cel.tagName === 'MARK') {
            res.push(cel);
          }
          walk(cel);
        }
      }
    };
    walk(this);
    return res;
  }

  get textContent(): string {
    return this.childNodes.map((c) => (c.nodeType === 3 ? c.nodeValue : (c as MockElement).textContent)).join('');
  }

  set textContent(val: string) {
    this.childNodes = [new MockTextNode(val)];
  }

  scrollIntoView() {
    this.scrollIntoViewCalled = true;
  }
}

describe('Document In-Page Search Utilities', () => {
  beforeEach(() => {
    (globalThis as any).document = {
      createElement: (tag: string) => new MockElement(tag),
      createTextNode: (text: string) => new MockTextNode(text),
    };
  });

  it('highlights all occurrences of query case-insensitively with mark tags', () => {
    const container = new MockElement('div');
    const p = new MockElement('p');
    p.appendChild(new MockTextNode('O valor total da nota fiscal de teste é R$ 1.500,00.'));
    const span = new MockElement('span');
    span.appendChild(new MockTextNode('TESTE de busca e outro Teste adicional.'));
    container.appendChild(p);
    container.appendChild(span);

    const marks = highlightMatches(container as unknown as HTMLElement, 'teste');
    expect(marks).toHaveLength(3);
    expect(container.querySelectorAll('mark')).toHaveLength(3);
    expect(marks[0].textContent).toBe('teste');
    expect(marks[1].textContent).toBe('TESTE');
    expect(marks[2].textContent).toBe('Teste');
    expect(marks[0].className).toBe(SEARCH_MARK_DEFAULT_CLASS);
  });

  it('returns empty array when query is empty, whitespace, or no matches found', () => {
    const container = new MockElement('div');
    container.appendChild(new MockTextNode('Texto simples sem correspondências'));

    expect(highlightMatches(container as unknown as HTMLElement, '')).toEqual([]);
    expect(highlightMatches(container as unknown as HTMLElement, '   ')).toEqual([]);
    expect(highlightMatches(container as unknown as HTMLElement, 'inexistente')).toEqual([]);
    expect(container.querySelectorAll('mark')).toHaveLength(0);
  });

  it('clears previous highlights and restores text nodes', () => {
    const container = new MockElement('div');
    const p = new MockElement('p');
    p.appendChild(new MockTextNode('Nota Fiscal 123456 emitida.'));
    container.appendChild(p);

    const marks = highlightMatches(container as unknown as HTMLElement, '123456');
    expect(marks).toHaveLength(1);
    expect(container.querySelectorAll('mark')).toHaveLength(1);

    clearHighlights(container as unknown as HTMLElement);
    expect(container.querySelectorAll('mark')).toHaveLength(0);
    expect(container.textContent).toContain('Nota Fiscal 123456 emitida.');
  });

  it('updates active match class on the target mark and scrolls it into view', () => {
    const container = new MockElement('div');
    container.appendChild(new MockTextNode('Item 1, Item 2, Item 3'));
    const marks = highlightMatches(container as unknown as HTMLElement, 'Item');
    expect(marks).toHaveLength(3);

    setActiveMatch(marks, 1);
    expect(marks[1].className).toBe(SEARCH_MARK_ACTIVE_CLASS);
    expect(marks[0].className).toBe(SEARCH_MARK_DEFAULT_CLASS);
    expect(marks[2].className).toBe(SEARCH_MARK_DEFAULT_CLASS);
    expect((marks[1] as unknown as MockElement).scrollIntoViewCalled).toBe(true);
  });

  it('ignores matches inside script, style, and inputs', () => {
    const container = new MockElement('div');
    const style = new MockElement('style');
    style.appendChild(new MockTextNode('.teste { color: red; }'));
    const input = new MockElement('input');
    input.appendChild(new MockTextNode('teste'));
    const p = new MockElement('p');
    p.appendChild(new MockTextNode('Texto real com teste aqui.'));
    container.appendChild(style);
    container.appendChild(input);
    container.appendChild(p);

    const marks = highlightMatches(container as unknown as HTMLElement, 'teste');
    expect(marks).toHaveLength(1);
    expect((marks[0] as unknown as MockElement).parentNode?.tagName).toBe('P');
  });
});


import { describe, it, expect } from 'vitest';
import { escapeHtml, escapeAttr } from './escapeHtml';

describe('escapeHtml & escapeAttr', () => {
  it('escapes &, <, >, ", and \' in HTML text', () => {
    expect(escapeHtml('Foo & Bar')).toBe('Foo &amp; Bar');
    expect(escapeHtml('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    expect(escapeHtml("O'Reilly & Co")).toBe('O&#39;Reilly &amp; Co');
  });

  it('escapes backticks in attribute values', () => {
    expect(escapeAttr('value`test`')).toBe('value&#96;test&#96;');
    expect(escapeAttr('<div class="box">')).toBe('&lt;div class=&quot;box&quot;&gt;');
  });

  it('safely handles null, undefined and numeric inputs', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
    expect(escapeHtml(1234.56)).toBe('1234.56');
    expect(escapeHtml(0)).toBe('0');
    expect(escapeHtml(false)).toBe('false');
  });
});

import { describe, it, expect } from 'vitest';
import { CURRENT_APP_VERSION, WHATS_NEW_VERSIONS, type AppVersion } from './whatsNewData';

describe('whatsNewData integrity tests', () => {
  it('should define CURRENT_APP_VERSION as 3.5.3', () => {
    expect(CURRENT_APP_VERSION).toBe('3.5.3');
  });

  it('should include all 9 supported application versions in descending order', () => {
    const expectedVersions: AppVersion[] = ['3.5.3', '3.5.2', '3.5.1', '3.5.0', '3.0.0', '2.5.3', '2.5.2', '2.5.1', '2.5.0'];
    const actualVersions = WHATS_NEW_VERSIONS.map((v) => v.id);
    expect(actualVersions).toEqual(expectedVersions);
  });

  it('should mark version 3.5.3 as current with proper label and subtitle', () => {
    const v353 = WHATS_NEW_VERSIONS.find((v) => v.id === '3.5.3');
    expect(v353).toBeDefined();
    expect(v353?.isCurrent).toBe(true);
    expect(v353?.label).toBe('v3.5.3 (Atual)');
    expect(v353?.subtitleText).toBe('Lançamento mais recente');

    const v352 = WHATS_NEW_VERSIONS.find((v) => v.id === '3.5.2');
    expect(v352).toBeDefined();
    expect(v352?.isCurrent).toBe(false);
    expect(v352?.label).toBe('v3.5.2');
  });

  it('should ensure each version contains exactly 3 detailed cards with required visual classes', () => {
    for (const version of WHATS_NEW_VERSIONS) {
      expect(version.cards).toHaveLength(3);
      for (const card of version.cards) {
        expect(card.id).toBeTruthy();
        expect(card.title).toBeTruthy();
        expect(card.badgeText).toBeTruthy();
        expect(card.description).toBeTruthy();
        expect(card.icon).toBeDefined();
        expect(card.iconClasses).toMatch(/bg-(purple|blue|emerald)-500\/10/);
        expect(card.hoverBorderClasses).toMatch(/hover:border-(purple|blue|emerald)-300/);
        expect(card.badgeClasses).toMatch(/text-(purple|blue|emerald)/);
      }
    }
  });

  it('should preserve all bullet points and prefixes when present', () => {
    const v350 = WHATS_NEW_VERSIONS.find((v) => v.id === '3.5.0')!;
    const card1 = v350.cards[0];
    expect(card1.bullets).toBeDefined();
    expect(card1.bullets?.length).toBe(2);
    expect(card1.bullets?.[0].boldPrefix).toBe('Filtro Rápido por Modelo no Card: ');

    const v251 = WHATS_NEW_VERSIONS.find((v) => v.id === '2.5.1')!;
    for (const card of v251.cards) {
      expect(card.bullets).toBeUndefined();
    }

    const v250 = WHATS_NEW_VERSIONS.find((v) => v.id === '2.5.0')!;
    const zipCard = v250.cards.find((c) => c.id === '2.5.0-importacao-massa');
    expect(zipCard?.bullets?.some((b) => b.text.includes('.zip'))).toBe(true);
  });
});


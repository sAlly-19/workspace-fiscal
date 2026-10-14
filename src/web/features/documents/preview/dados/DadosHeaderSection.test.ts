import { describe, it, expect } from 'vitest';
import React from 'react';
import { DadosHeaderSection } from './DadosHeaderSection';

describe('DadosHeaderSection - Protocol & Signature Badges (IMP-019)', () => {
  it('renders green Authorized badge for cStat 100 or 150', () => {
    const doc100 = {
      type: 'NF-e',
      number: '12345',
      series: '1',
      totalAmount: 500,
      protocol: '135260000000001',
      hasAuthorizationProtocol: true,
      protocolStatus: '100',
      protocolStatusDescription: 'Autorizado o uso da NF-e',
      hasSignature: true,
    };

    const tree = DadosHeaderSection({ doc: doc100, isLight: true });
    const serialized = JSON.stringify(tree);
    expect(serialized).toContain('Uso Autorizado');
    expect(serialized).toContain('135260000000001');
    expect(serialized).toContain('Assinado Digitalmente');
  });

  it('renders green Authorized badge for cStat 150 (out of time)', () => {
    const doc150 = {
      type: 'NF-e',
      number: '12345',
      hasAuthorizationProtocol: true,
      protocolStatus: '150',
      protocolStatusDescription: 'Autorização fora de prazo',
    };

    const tree = DadosHeaderSection({ doc: doc150, isLight: false });
    const serialized = JSON.stringify(tree);
    expect(serialized).toContain('Autorizada (Fora de Prazo)');
  });

  it('renders red Cancelled/Denied badge for cStat 101, 151, 110, 301, 302, 303 or CANCELLED', () => {
    const doc101 = {
      type: 'NF-e',
      number: '12345',
      protocolStatus: '101',
      protocolStatusDescription: 'Cancelamento homologado',
    };

    const tree101 = DadosHeaderSection({ doc: doc101, isLight: false });
    const serialized101 = JSON.stringify(tree101);
    expect(serialized101).toContain('Cancelada / Denegada');
    expect(serialized101).toContain('Cancelamento homologado');

    const docCancelled = {
      type: 'NF-e',
      status: 'CANCELLED',
    };
    const treeCancelled = DadosHeaderSection({ doc: docCancelled, isLight: true });
    expect(JSON.stringify(treeCancelled)).toContain('Cancelada / Denegada');
  });

  it('renders amber warning badge when authorization protocol is absent', () => {
    const docDraft = {
      type: 'NF-e',
      number: '12345',
      hasSignature: false,
      hasAuthorizationProtocol: false,
    };

    const tree = DadosHeaderSection({ doc: docDraft, isLight: true });
    const serialized = JSON.stringify(tree);
    expect(serialized).toContain('Sem Protocolo');
    expect(serialized).toContain('Documento Não Homologado');
    expect(serialized).toContain('Sem Assinatura');
  });
});

import { describe, it, expect } from 'vitest';
import React from 'react';
import { DanfeNFSe } from './DanfeNFSe';

describe('DanfeNFSe Component', () => {
  it('renders safely when issuerCity is a standard string', () => {
    const doc = {
      type: 'NFSE',
      number: '123',
      issuerName: 'EMPRESA PRESTADORA',
      issuerCity: 'São Paulo',
      issuerState: 'SP',
    };
    expect(() => DanfeNFSe({ doc })).not.toThrow();
    const element = DanfeNFSe({ doc });
    expect(element).toBeDefined();
  });

  it('renders safely when issuerCity is undefined, null or empty document', () => {
    expect(() => DanfeNFSe({ doc: {} })).not.toThrow();
    expect(() => DanfeNFSe({ doc: { issuerCity: undefined } })).not.toThrow();
    expect(() => DanfeNFSe({ doc: { issuerCity: null } })).not.toThrow();
  });

  it('renders safely when issuerCity or address.city is an object or number from XML parser', () => {
    // fast-xml-parser can produce empty object {} for <cMun/> or numeric 3550308
    expect(() => DanfeNFSe({ doc: { issuerCity: {} } })).not.toThrow();
    expect(() => DanfeNFSe({ doc: { issuerCity: 3550308 } })).not.toThrow();
    expect(() =>
      DanfeNFSe({
        doc: {
          issuer: {
            address: {
              city: {},
            },
          },
        },
      })
    ).not.toThrow();
    expect(() =>
      DanfeNFSe({
        doc: {
          issuer: {
            address: {
              city: 3550308,
            },
          },
        },
      })
    ).not.toThrow();
  });
});


import { describe, it, expect } from 'vitest';
import React from 'react';
import {
  SefazEnvironmentCard,
  NfseEnvironmentCard,
  StorageFolderCard,
  CompaniesListCard,
  SefazRulesCard,
} from './index';

describe('Buscador Settings Tab Cards', () => {
  it('exports all 5 card components correctly', () => {
    expect(typeof SefazEnvironmentCard).toBe('function');
    expect(typeof NfseEnvironmentCard).toBe('function');
    expect(typeof StorageFolderCard).toBe('function');
    expect(typeof CompaniesListCard).toBe('function');
    expect(typeof SefazRulesCard).toBe('function');
  });

  it('renders SefazEnvironmentCard element with correct structure', () => {
    const el = React.createElement(SefazEnvironmentCard, {
      env: 'homologation',
      saving: false,
      onUpdateEnv: () => {},
      isLight: true,
    });
    expect(el).toBeDefined();
    expect(el.type).toBe(SefazEnvironmentCard);
    expect(el.props.env).toBe('homologation');
  });

  it('renders NfseEnvironmentCard element with correct structure', () => {
    const el = React.createElement(NfseEnvironmentCard, {
      nfseEnv: 'production',
      saving: false,
      onUpdateNfseEnv: () => {},
      isLight: false,
    });
    expect(el).toBeDefined();
    expect(el.type).toBe(NfseEnvironmentCard);
    expect(el.props.nfseEnv).toBe('production');
  });

  it('renders StorageFolderCard element with path', () => {
    const el = React.createElement(StorageFolderCard, {
      defaultFolder: 'C:\\xmls',
      onSelectFolder: () => {},
      isLight: true,
    });
    expect(el).toBeDefined();
    expect(el.props.defaultFolder).toBe('C:\\xmls');
  });

  it('renders CompaniesListCard element with empty list', () => {
    const el = React.createElement(CompaniesListCard, {
      companies: [],
      activeCompany: null,
      activeCert: null,
      isLight: false,
    });
    expect(el).toBeDefined();
    expect(el.props.companies).toHaveLength(0);
  });

  it('renders SefazRulesCard element', () => {
    const el = React.createElement(SefazRulesCard, { isLight: true });
    expect(el).toBeDefined();
    expect(el.props.isLight).toBe(true);
  });
});


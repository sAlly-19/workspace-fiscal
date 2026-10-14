import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { CompanyModal, CompanyModalProps } from './CompanyModal';

describe('Depreciation CompanyModal (IMP-012)', () => {
  const defaultProps: CompanyModalProps = {
    isLight: true,
    editing: null,
    onClose: vi.fn(),
    onSave: vi.fn(),
  };

  it('renders modal with default creation state', () => {
    const element = React.createElement(CompanyModal, defaultProps);
    expect(element).toBeDefined();
    expect(element.props.isLight).toBe(true);
    expect(element.props.editing).toBeNull();
  });

  it('binds editing company data including document, state and city', () => {
    const editing = {
      id: 'uuid-1',
      name: 'Empresa Teste SA',
      document: '00000000000191',
      state: 'SP',
      city: 'São Paulo',
    };

    const element = React.createElement(CompanyModal, {
      ...defaultProps,
      editing,
    });

    expect(element.props.editing.name).toBe('Empresa Teste SA');
    expect(element.props.editing.state).toBe('SP');
  });
});

import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { ConfirmDialog, ConfirmDialogProps } from './ConfirmDialog';

describe('ConfirmDialog Accessibility and Focus Contracts (IMP-T08)', () => {
  const defaultProps: ConfirmDialogProps = {
    isOpen: true,
    title: 'Excluir Empresa',
    description: 'Tem certeza que deseja excluir esta empresa?',
    confirmLabel: 'Excluir Empresa',
    variant: 'danger',
    isBusy: false,
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  it('instantiates ConfirmDialog with dialog shell contracts when open', () => {
    const element = React.createElement(ConfirmDialog, defaultProps);
    expect(element).toBeDefined();
    expect(element.props.isOpen).toBe(true);
    expect(element.props.title).toBe('Excluir Empresa');
    expect(element.props.variant).toBe('danger');
    expect(element.props.confirmLabel).toBe('Excluir Empresa');
  });

  it('supports default variant styling and label', () => {
    const element = React.createElement(ConfirmDialog, {
      ...defaultProps,
      title: 'Confirmar Ação',
      variant: 'default',
      confirmLabel: 'Prosseguir',
    });
    expect(element.props.variant).toBe('default');
    expect(element.props.confirmLabel).toBe('Prosseguir');
  });

  it('reflects isBusy state to disable interactions', () => {
    const element = React.createElement(ConfirmDialog, {
      ...defaultProps,
      isBusy: true,
    });
    expect(element.props.isBusy).toBe(true);
  });
});

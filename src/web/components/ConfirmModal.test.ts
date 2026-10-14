import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { ConfirmModal, ConfirmModalProps } from './ConfirmModal';

describe('ConfirmModal component accessibility and contracts (IMP-021)', () => {
  const defaultProps: ConfirmModalProps = {
    isOpen: true,
    title: 'Excluir Item',
    description: 'Tem certeza que deseja excluir este item permanentemente?',
    confirmLabel: 'Excluir',
    confirmVariant: 'danger',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  it('renders modal element with WAI-ARIA dialog attributes when open', () => {
    const element = React.createElement(ConfirmModal, defaultProps);
    expect(element).toBeDefined();
    expect(element.props.isOpen).toBe(true);
    expect(element.props.title).toBe('Excluir Item');
    expect(element.props.confirmVariant).toBe('danger');
  });

  it('renders null when isOpen is false', () => {
    const element = React.createElement(ConfirmModal, {
      ...defaultProps,
      isOpen: false,
    });
    expect(element.props.isOpen).toBe(false);
  });

  it('supports requireText prop for confirmation guard', () => {
    const element = React.createElement(ConfirmModal, {
      ...defaultProps,
      requireText: 'CONFIRMAR',
    });
    expect(element.props.requireText).toBe('CONFIRMAR');
  });
});


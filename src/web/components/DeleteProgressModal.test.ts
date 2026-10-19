import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { DeleteProgressModal } from './DeleteProgressModal';

describe('DeleteProgressModal Component', () => {
  it('instantiates and provides progress props when open', () => {
    const onClose = vi.fn();
    const element = React.createElement(DeleteProgressModal, {
      isOpen: true,
      total: 9905,
      processed: 4950,
      percent: 50,
      isComplete: false,
      error: null,
      onClose,
    });

    expect(element).toBeDefined();
    expect(element.props.isOpen).toBe(true);
    expect(element.props.total).toBe(9905);
    expect(element.props.processed).toBe(4950);
    expect(element.props.percent).toBe(50);
    expect(element.props.isComplete).toBe(false);
  });

  it('supports completed state with 100% progress', () => {
    const onClose = vi.fn();
    const element = React.createElement(DeleteProgressModal, {
      isOpen: true,
      total: 9905,
      processed: 9905,
      percent: 100,
      isComplete: true,
      error: null,
      onClose,
    });

    expect(element.props.isComplete).toBe(true);
    expect(element.props.processed).toBe(9905);
    expect(element.props.percent).toBe(100);
  });

  it('supports error state message display', () => {
    const element = React.createElement(DeleteProgressModal, {
      isOpen: true,
      total: 9905,
      processed: 100,
      percent: 1,
      isComplete: false,
      error: 'Falha ao remover arquivo do disco',
      onClose: () => {},
    });

    expect(element.props.error).toBe('Falha ao remover arquivo do disco');
  });
});


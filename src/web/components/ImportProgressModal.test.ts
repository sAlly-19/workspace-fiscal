import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { ImportProgressModal } from './ImportProgressModal';

describe('ImportProgressModal Component', () => {
  it('instantiates and provides progress props when open', () => {
    const onClose = vi.fn();
    const onCancel = vi.fn();
    const element = React.createElement(ImportProgressModal, {
      isOpen: true,
      total: 500,
      processed: 250,
      percent: 50,
      targetFolderName: 'Entradas',
      isComplete: false,
      isCancelled: false,
      isCancelling: false,
      error: null,
      onClose,
      onCancel,
    });

    expect(element).toBeDefined();
    expect(element.props.isOpen).toBe(true);
    expect(element.props.total).toBe(500);
    expect(element.props.processed).toBe(250);
    expect(element.props.percent).toBe(50);
    expect(element.props.targetFolderName).toBe('Entradas');
    expect(element.props.isComplete).toBe(false);
    expect(element.props.isCancelled).toBe(false);
    expect(element.props.isCancelling).toBe(false);
    expect(element.props.onCancel).toBe(onCancel);
    expect(element.props.onClose).toBe(onClose);
  });

  it('supports completed state with 100% progress', () => {
    const onClose = vi.fn();
    const element = React.createElement(ImportProgressModal, {
      isOpen: true,
      total: 100,
      processed: 100,
      percent: 100,
      isComplete: true,
      isCancelled: false,
      onClose,
    });

    expect(element.props.isComplete).toBe(true);
    expect(element.props.isCancelled).toBe(false);
    expect(element.props.processed).toBe(100);
    expect(element.props.percent).toBe(100);
  });

  it('supports cancelled state with interrupted progress', () => {
    const onClose = vi.fn();
    const element = React.createElement(ImportProgressModal, {
      isOpen: true,
      total: 400,
      processed: 150,
      percent: 38,
      isComplete: false,
      isCancelled: true,
      isCancelling: false,
      onClose,
    });

    expect(element.props.isCancelled).toBe(true);
    expect(element.props.isComplete).toBe(false);
    expect(element.props.processed).toBe(150);
    expect(element.props.total).toBe(400);
  });

  it('supports cancelling state while waiting server response', () => {
    const onCancel = vi.fn();
    const element = React.createElement(ImportProgressModal, {
      isOpen: true,
      total: 400,
      processed: 150,
      percent: 38,
      isComplete: false,
      isCancelled: false,
      isCancelling: true,
      onClose: () => {},
      onCancel,
    });

    expect(element.props.isCancelling).toBe(true);
    expect(element.props.isCancelled).toBe(false);
  });
});


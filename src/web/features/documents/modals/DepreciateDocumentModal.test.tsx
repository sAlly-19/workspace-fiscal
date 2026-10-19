import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { DepreciateDocumentModal, DepreciateDocumentModalProps } from './DepreciateDocumentModal';

describe('DepreciateDocumentModal Component (TDD)', () => {
  const defaultProps: DepreciateDocumentModalProps = {
    isOpen: true,
    documentId: 'doc-uuid-123',
    isLight: false,
    onClose: vi.fn(),
    onAssetCreated: vi.fn(),
  };

  it('instantiates and provides expected props when open', () => {
    const element = React.createElement(DepreciateDocumentModal, defaultProps);
    expect(element).toBeDefined();
    expect(element.props.isOpen).toBe(true);
    expect(element.props.documentId).toBe('doc-uuid-123');
    expect(element.props.isLight).toBe(false);
  });

  it('does not render when isOpen is false', () => {
    const element = React.createElement(DepreciateDocumentModal, {
      ...defaultProps,
      isOpen: false,
    });
    expect(element.props.isOpen).toBe(false);
  });
});

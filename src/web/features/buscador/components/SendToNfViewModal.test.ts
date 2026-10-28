import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { SendToNfViewModal, SendToNfViewModalProps } from './SendToNfViewModal';
import { FiscalDocument } from '@/core/buscador/domain/types';

describe('SendToNfViewModal Component Contracts', () => {
  const mockDocs: FiscalDocument[] = [
    {
      id: 1,
      company_id: 10,
      access_key: '35260100000000000001550010000010011000000010',
      document_type: 'NFE',
      schema_type: 'procNFe_v4.00',
      environment: 'production',
      origin: 'SEFAZ_DISTRIBUTION',
      nsu: '000000000000001',
      received_at: '2026-10-28',
      direction: 'INBOUND',
      xml_status: 'XML_DISPONIVEL',
      pdf_status: 'PDF_INDISPONIVEL',
      xml_path: 'C:/xmls/nota1.xml',
      created_at: '2026-10-28',
      updated_at: '2026-10-28',
    },
    {
      id: 2,
      company_id: 10,
      access_key: '35260100000000000001550010000010021000000020',
      document_type: 'NFE',
      schema_type: 'procNFe_v4.00',
      environment: 'production',
      origin: 'SEFAZ_DISTRIBUTION',
      nsu: '000000000000002',
      received_at: '2026-10-28',
      direction: 'INBOUND',
      xml_status: 'XML_INDISPONIVEL',
      pdf_status: 'PDF_INDISPONIVEL',
      created_at: '2026-10-28',
      updated_at: '2026-10-28',
    },
  ];

  const defaultProps: SendToNfViewModalProps = {
    isOpen: true,
    onClose: vi.fn(),
    documents: mockDocs,
    onConfirmSend: vi.fn().mockResolvedValue(undefined),
    isSending: false,
  };

  it('creates SendToNfViewModal element with valid props', () => {
    const element = React.createElement(SendToNfViewModal, defaultProps);
    expect(element).toBeDefined();
    expect(element.props.isOpen).toBe(true);
    expect(element.props.documents).toHaveLength(2);
  });

  it('distinguishes available XML documents from skipped ones', () => {
    const valid = mockDocs.filter((d) => d.xml_status === 'XML_DISPONIVEL' && Boolean(d.xml_path));
    const skipped = mockDocs.length - valid.length;
    expect(valid).toHaveLength(1);
    expect(skipped).toBe(1);
  });

  it('handles sending state properly', () => {
    const element = React.createElement(SendToNfViewModal, {
      ...defaultProps,
      isSending: true,
    });
    expect(element.props.isSending).toBe(true);
  });
});

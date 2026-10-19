import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import express from 'express';
import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
import assetsRoutes from './assets.routes';
import { db } from '../../db';
import { documents, batches, folders, assets, companies } from '../../db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

describe('Asset Document Parse and Immobilized Identifiers', () => {
  let server: http.Server;
  let baseUrl: string;
  let tmpDir: string;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/assets', assetsRoutes);

    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        if (addr && typeof addr === 'object') {
          baseUrl = `http://127.0.0.1:${addr.port}`;
        }
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'parse-doc-test-'));
  });

  afterEach(async () => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  });

  it('GET /api/assets/immobilized-identifiers should return list of immobilized document numbers and pairs', async () => {
    // 1. Create a company
    const companyId = crypto.randomUUID();
    const uniqueCnpj = `${Math.floor(10000000000000 + Math.random() * 89999999999999)}`;
    await db.insert(companies).values({
      id: companyId,
      name: 'Empresa Teste Imobilizado',
      cnpj: uniqueCnpj,
      document: uniqueCnpj,
    });

    // 2. Create an asset
    const assetId = crypto.randomUUID();
    const docNum = '998877';
    const supplierName = 'Fornecedor XYZ Equipamentos';
    await db.insert(assets).values({
      id: assetId,
      companyId,
      supplier: supplierName,
      documentNumber: docNum,
      description: 'Notebook Dell Latitude 5520',
      acquisitionDate: new Date('2026-03-10'),
      acquisitionValue: 450000,
      annualRate: 20,
    });

    const res = await fetch(`${baseUrl}/api/assets/immobilized-identifiers`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('documentNumbers');
    expect(body.documentNumbers).toContain(docNum);
    expect(body.pairs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          documentNumber: docNum,
          supplier: supplierName,
        }),
      ])
    );

    // Clean up
    await db.delete(assets).where(eq(assets.id, assetId));
    await db.delete(companies).where(eq(companies.id, companyId));
  });

  it('POST /api/assets/parse-from-document/:documentId should extract Destinatário (P1), Emitente (P2) and items', async () => {
    // Create folder
    const folderId = crypto.randomUUID();
    await db.insert(folders).values({ id: folderId, name: 'Pasta Teste' });

    // Mock NFe XML with Destinatário, Emitente and 2 items
    const sampleXml = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <NFe>
    <infNFe Id="NFe35260111222333000199550010000123451000123456" versao="4.00">
      <ide>
        <nNF>12345</nNF>
        <serie>1</serie>
        <dhEmi>2026-02-15T10:00:00-03:00</dhEmi>
        <tpNF>1</tpNF>
      </ide>
      <emit>
        <CNPJ>11222333000199</CNPJ>
        <xNome>DISTRIBUIDORA DE HARDWARE LTDA</xNome>
        <enderEmit>
          <UF>SP</UF>
          <xMun>São Paulo</xMun>
        </enderEmit>
      </emit>
      <dest>
        <CNPJ>44555666000188</CNPJ>
        <xNome>CLIENTE FINAL INDUSTRIA E COMERCIO SA</xNome>
        <enderDest>
          <UF>RJ</UF>
          <xMun>Rio de Janeiro</xMun>
        </enderDest>
      </dest>
      <det nItem="1">
        <prod>
          <cProd>NOTE-01</cProd>
          <xProd>NOTEBOOK CORPORATIVO CORE I7 16GB 512GB SSD</xProd>
          <NCM>84713012</NCM>
          <qCom>2.0000</qCom>
          <vUnCom>4500.00</vUnCom>
          <vProd>9000.00</vProd>
        </prod>
      </det>
      <det nItem="2">
        <prod>
          <cProd>MON-02</cProd>
          <xProd>MONITOR PROFISSIONAL 27 POL 4K</xProd>
          <NCM>85285220</NCM>
          <qCom>1.0000</qCom>
          <vUnCom>2200.00</vUnCom>
          <vProd>2200.00</vProd>
        </prod>
      </det>
      <total>
        <ICMSTot>
          <vProd>11200.00</vProd>
          <vNF>11200.00</vNF>
        </ICMSTot>
      </total>
    </infNFe>
  </NFe>
</nfeProc>`;

    const xmlPath = path.join(tmpDir, 'test-nfe.xml');
    fs.writeFileSync(xmlPath, sampleXml, 'utf-8');

    const docId = crypto.randomUUID();
    await db.insert(documents).values({
      id: docId,
      type: 'NFE',
      accessKey: '35260111222333000199550010000123451000123456',
      number: '12345',
      series: '1',
      issuerName: 'DISTRIBUIDORA DE HARDWARE LTDA',
      issuerDocument: '11222333000199',
      recipientName: 'CLIENTE FINAL INDUSTRIA E COMERCIO SA',
      recipientDocument: '44555666000188',
      totalAmount: 11200,
      rawXmlPath: xmlPath,
      batchId: folderId,
      status: 'VALID',
    });

    const res = await fetch(`${baseUrl}/api/assets/parse-from-document/${docId}`, {
      method: 'POST',
    });

    expect(res.status).toBe(200);
    const body = await res.json();

    // Prioridade 1: Destinatário deve ser sugerido como primário quando possui CNPJ
    expect(body.companySuggestion).toBeDefined();
    expect(body.companySuggestion.primary).toBe('DESTINATARIO');
    expect(body.companySuggestion.destinatario.cleanDocument).toBe('44555666000188');
    expect(body.companySuggestion.destinatario.name).toBe('CLIENTE FINAL INDUSTRIA E COMERCIO SA');

    // Prioridade 2: Emitente também retornado
    expect(body.companySuggestion.emitente.cleanDocument).toBe('11222333000199');
    expect(body.companySuggestion.emitente.name).toBe('DISTRIBUIDORA DE HARDWARE LTDA');

    // Itens
    expect(body.items).toHaveLength(2);
    expect(body.items[0]).toMatchObject({
      itemIndex: 1,
      code: 'NOTE-01',
      description: 'NOTEBOOK CORPORATIVO CORE I7 16GB 512GB SSD',
      ncm: '84713012',
      quantity: 2,
      totalPrice: 9000,
    });
    expect(body.items[1]).toMatchObject({
      itemIndex: 2,
      code: 'MON-02',
      description: 'MONITOR PROFISSIONAL 27 POL 4K',
      ncm: '85285220',
      quantity: 1,
      totalPrice: 2200,
    });

    // Metadados da nota
    expect(body.invoice).toMatchObject({
      number: '12345',
      series: '1',
      accessKey: '35260111222333000199550010000123451000123456',
      supplier: 'DISTRIBUIDORA DE HARDWARE LTDA',
    });

    // Cleanup
    await db.delete(documents).where(eq(documents.id, docId));
    await db.delete(folders).where(eq(folders.id, folderId));
  });

  it('POST /api/assets/parse-from-document/:documentId should return 404 for non-existent document', async () => {
    const res = await fetch(`${baseUrl}/api/assets/parse-from-document/non-existent-id`, {
      method: 'POST',
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });
});

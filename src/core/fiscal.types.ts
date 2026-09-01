export type DocumentType = 'NFE' | 'NFCE' | 'NFSE' | 'CTE' | 'UNKNOWN';
export type DocumentStatus = 'VALID' | 'WARNING' | 'INVALID' | 'UNKNOWN' | 'UNSUPPORTED';

export interface Address {
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
}

export interface Party {
  name: string;
  document: string; // CPF/CNPJ
  address?: Address;
}

export interface FiscalItem {
  code?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  ncm?: string;
}

export interface FiscalTaxes {
  icms?: number;
  ipi?: number;
  pis?: number;
  cofins?: number;
  iss?: number;
}

export interface FiscalTotals {
  products: number;
  freight?: number;
  insurance?: number;
  discount?: number;
  taxes?: FiscalTaxes;
  total: number;
}

export interface FiscalDuplicate {
  number: string;
  dueDate: string;
  amount: number;
}

export interface FiscalInvoice {
  number?: string;
  originalAmount?: number;
  discountAmount?: number;
  netAmount?: number;
}

export interface FiscalPayment {
  paymentType?: string;
  indicator?: string;
  amount: number;
}

export interface FiscalBilling {
  invoice?: FiscalInvoice;
  duplicates?: FiscalDuplicate[];
  payments?: FiscalPayment[];
}

export interface FiscalDocument {
  id: string;
  type: DocumentType;
  accessKey?: string;
  number?: string;
  series?: string;
  issueDate?: Date;
  status: DocumentStatus;
  issuer?: Party;
  recipient?: Party;
  items: FiscalItem[];
  totals?: FiscalTotals;
  billing?: FiscalBilling;
  rawXmlPath: string;
  batchId?: string;
  createdAt: Date;
}

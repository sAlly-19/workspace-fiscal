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
  ie?: string;
  im?: string;
  phone?: string;
  email?: string;
  address?: Address;
}

export interface FiscalItem {
  code?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  ncm?: string;
  cst?: string;
  cfop?: string;
  unit?: string;
  discount?: number;
  icmsBase?: number;
  icmsValue?: number;
  icmsAliq?: number;
  ipiValue?: number;
  ipiAliq?: number;
}

export interface FiscalTaxes {
  icms?: number;
  icmsBase?: number;
  icmsSt?: number;
  icmsStBase?: number;
  ipi?: number;
  pis?: number;
  cofins?: number;
  iss?: number;
  issBase?: number;
  issAliquot?: number;
  issRetained?: number | boolean;
  inss?: number;
  ir?: number;
  csll?: number;
  deductions?: number;
  ii?: number;
  fcp?: number;
  icmsUfDest?: number;
  icmsUfRemet?: number;
  fcpUfDest?: number;
  outrasRetencoes?: number;
  totalTaxes?: number;
  [key: string]: number | boolean | undefined;
}

export interface FiscalTotals {
  products: number;
  freight?: number;
  insurance?: number;
  discount?: number;
  conditionalDiscount?: number;
  unconditionalDiscount?: number;
  deductions?: number;
  otherExpenses?: number;
  icmsBase?: number;
  icmsStBase?: number;
  totalTaxes?: number;
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

export interface FiscalTransport {
  modFrete?: string | number;
  name?: string;
  document?: string;
  ie?: string;
  address?: string;
  city?: string;
  state?: string;
  vehiclePlate?: string;
  vehicleUf?: string;
  anttCode?: string;
  volumeQuantity?: number | string;
  volumeSpecies?: string;
  volumeBrand?: string;
  volumeNumber?: string;
  grossWeight?: number;
  netWeight?: number;
}

export interface FiscalCteCargoQuantity {
  unit: string;
  measureType: string;
  quantity: number;
}

export interface FiscalCteCargo {
  cargoValue?: number;
  predominantProduct?: string;
  otherCharacteristics?: string;
  averbationValue?: number;
  quantities: FiscalCteCargoQuantity[];
}

export interface FiscalCteComponent {
  name: string;
  amount: number;
}

export interface FiscalCteDoc {
  type: 'NFE' | 'NF' | 'OUTROS';
  key?: string;
  number?: string;
  series?: string;
  issueDate?: string;
  amount?: number;
}

export interface FiscalCteModal {
  rntrc?: string;
  ciot?: string;
  vehiclePlate?: string;
  vehicleUf?: string;
  renavam?: string;
  driverName?: string;
  driverCpf?: string;
}

export interface FiscalCteRoute {
  startCity?: string;
  startState?: string;
  endCity?: string;
  endState?: string;
}

export interface FiscalCteTomador {
  role: string; // 0-Remetente, 1-Expedidor, 2-Recebedor, 3-Destinatário, 4-Outros
  name?: string;
  document?: string;
  ie?: string;
  phone?: string;
  address?: Address;
}

export interface FiscalDocument {
  id: string;
  type: DocumentType;
  accessKey?: string;
  number?: string;
  series?: string;
  issueDate?: Date;
  exitDate?: Date;
  exitTime?: string;
  operationNature?: string;
  protocol?: string;
  status: DocumentStatus;
  issuer?: Party;
  recipient?: Party;
  sender?: Party;
  shipper?: Party;
  receiver?: Party;
  transport?: FiscalTransport;
  rpsNumber?: string;
  rpsSeries?: string;
  verificationCode?: string;
  serviceCode?: string;
  cnaeCode?: string;
  cityServiceCode?: string;
  serviceDescription?: string;
  serviceCity?: string;
  optanteSimplesNacional?: boolean;
  regimeEspecialTributacao?: string;
  exigibilidadeISS?: string;
  cteTomador?: FiscalCteTomador;
  cteRoute?: FiscalCteRoute;
  cteCargo?: FiscalCteCargo;
  cteComponents?: FiscalCteComponent[];
  cteDocs?: FiscalCteDoc[];
  cteModal?: FiscalCteModal;
  cteServiceType?: string;
  cteType?: string;
  cteCst?: string;
  cteIcmsAliq?: number;
  cteIcmsValue?: number;
  cteIcmsBase?: number;
  cteIcmsReduction?: number;
  additionalInfo?: string;
  fiscoInfo?: string;
  items: FiscalItem[];
  totals?: FiscalTotals;
  billing?: FiscalBilling;
  rawXmlPath: string;
  batchId?: string;
  createdAt: Date;
}

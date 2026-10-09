import { Party, Address, FiscalCteTomador } from '../../fiscal.types';

export function parseParty(partyData: any): Party {
  const rawDoc = partyData.CNPJ ?? partyData.CPF;
  const document = rawDoc !== undefined && rawDoc !== null ? String(rawDoc) : 'NÃO INFORMADO';
  const name = partyData.xNome ? String(partyData.xNome) : (partyData.xFant ? String(partyData.xFant) : 'NÃO INFORMADO');
  const ie = partyData.IE ? String(partyData.IE) : undefined;
  const im = partyData.IM ? String(partyData.IM) : undefined;
  const phone = partyData.fone ? String(partyData.fone) : undefined;
  const email = partyData.email ? String(partyData.email) : undefined;
  
  let address: Address | undefined;
  const end = partyData.enderEmit || partyData.enderDest || partyData.enderReme || partyData.enderExped || partyData.enderReceb || partyData.enderToma;
  
  if (end) {
    address = {
      street: end.xLgr,
      number: end.nro ? String(end.nro) : undefined,
      complement: end.xCpl,
      neighborhood: end.xBairro,
      city: end.xMun,
      state: end.UF,
      zipCode: end.CEP ? String(end.CEP) : undefined,
      country: end.xPais,
    };
  }

  return { name, document, ie, im, phone, email, address };
}

export function parseTomador(
  ide: any, 
  toma3: any, 
  toma4: any, 
  rem?: Party, 
  dest?: Party, 
  exped?: Party, 
  receb?: Party
): FiscalCteTomador {
  let role = '0';
  if (toma3 && toma3.toma !== undefined) {
    role = String(toma3.toma);
  } else if (toma4 && toma4.toma !== undefined) {
    role = String(toma4.toma);
  } else if (ide.toma !== undefined) {
    role = String(ide.toma);
  }

  if (toma4 && (toma4.CNPJ || toma4.CPF || toma4.xNome)) {
    const rawDoc = toma4.CNPJ ?? toma4.CPF;
    const docStr = rawDoc ? String(rawDoc) : undefined;
    const end = toma4.enderToma || {};
    return {
      role: '4',
      name: toma4.xNome ? String(toma4.xNome) : undefined,
      document: docStr,
      ie: toma4.IE ? String(toma4.IE) : undefined,
      phone: toma4.fone ? String(toma4.fone) : undefined,
      address: end.xLgr ? {
        street: end.xLgr,
        number: end.nro ? String(end.nro) : undefined,
        complement: end.xCpl,
        neighborhood: end.xBairro,
        city: end.xMun,
        state: end.UF,
        zipCode: end.CEP ? String(end.CEP) : undefined,
      } : undefined,
    };
  }

  // Map role
  if (role === '0' && rem) {
    return { role: '0', name: rem.name, document: rem.document, ie: rem.ie, phone: rem.phone, address: rem.address };
  }
  if (role === '1' && exped) {
    return { role: '1', name: exped.name, document: exped.document, ie: exped.ie, phone: exped.phone, address: exped.address };
  }
  if (role === '2' && receb) {
    return { role: '2', name: receb.name, document: receb.document, ie: receb.ie, phone: receb.phone, address: receb.address };
  }
  if (role === '3' && dest) {
    return { role: '3', name: dest.name, document: dest.document, ie: dest.ie, phone: dest.phone, address: dest.address };
  }

  return {
    role,
    name: rem?.name || dest?.name || 'NÃO INFORMADO',
    document: rem?.document || dest?.document || 'NÃO INFORMADO',
    ie: rem?.ie || dest?.ie,
    phone: rem?.phone || dest?.phone,
    address: rem?.address || dest?.address,
  };
}


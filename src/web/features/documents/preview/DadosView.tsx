import {
  DadosHeaderSection,
  DadosPartiesSection,
  DadosBillingSection,
  DadosTaxesSection,
  DadosItemsTable,
} from './dados';

export interface DadosViewProps {
  doc: any;
  theme: string;
}

export function DadosView({ doc, theme }: DadosViewProps) {
  const isLight = theme === 'light';

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <DadosHeaderSection doc={doc} isLight={isLight} />
      <DadosPartiesSection doc={doc} isLight={isLight} />
      <DadosBillingSection doc={doc} isLight={isLight} />
      <DadosTaxesSection doc={doc} isLight={isLight} />
      <DadosItemsTable items={doc.items} isLight={isLight} />
    </div>
  );
}

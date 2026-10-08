import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface XmlPreviewPaneProps {
  xml: string;
  loadingXml: boolean;
  currentTheme: string;
}

export function XmlPreviewPane({ xml, loadingXml, currentTheme }: XmlPreviewPaneProps) {
  return (
    <div className="absolute inset-0 p-4">
      {loadingXml ? (
        <div className="flex items-center justify-center h-full text-[#a1a1aa] text-sm">
          Carregando código XML...
        </div>
      ) : (
        <div
          className={`h-full rounded-xl border overflow-hidden ${
            currentTheme === 'light' ? 'bg-[#1e1e1e] border-[#cbd5e1]' : 'bg-[#1e1e1e] border-[#27272a]'
          }`}
        >
          <SyntaxHighlighter
            language="xml"
            style={vscDarkPlus}
            customStyle={{
              margin: 0,
              height: '100%',
              background: 'transparent',
              fontSize: '12px',
              padding: '16px',
            }}
          >
            {xml}
          </SyntaxHighlighter>
        </div>
      )}
    </div>
  );
}


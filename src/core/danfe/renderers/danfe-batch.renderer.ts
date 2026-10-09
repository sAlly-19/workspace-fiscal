import { renderDanfeCardHtml } from './danfe-card.dispatcher';
import { DANFE_BATCH_STYLES } from './danfe-batch.styles';
import { DANFE_BATCH_CLIENT_SCRIPT } from './danfe-batch.script';

export function generateDanfeBatchHtml(docsList: any[]): string {
  const renderedPages = docsList.map((doc, idx) => renderDanfeCardHtml(doc, idx, docsList.length)).join('');
  const totalAmount = docsList.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DANFE em Lote (${docsList.length} Documentos) - NFView</title>
  <style>${DANFE_BATCH_STYLES}  </style>
</head>
<body>
  <div class="no-print top-toolbar">
    <div style="display: flex; align-items: center; gap: 14px;">
      <div style="background: #2563eb; width: 34px; height: 34px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 18px;">
        📄
      </div>
      <div>
        <div style="font-weight: bold; font-size: 14px;">Exportação de Documentos Fiscais (${docsList.length} notas)</div>
        <div style="font-size: 11px; color: #94a3b8; display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
          <span>Valor Total: <b>R$ ${totalAmount.toFixed(2)}</b></span>
          <span>•</span>
          ${(() => {
            const counts: Record<string, number> = {};
            docsList.forEach(d => {
              const t = String(d.type || 'NFE').toUpperCase();
              counts[t] = (counts[t] || 0) + 1;
            });
            const colors: Record<string, string> = {
              NFE: '#60a5fa', NFCE: '#10b981', CTE: '#f59e0b', NFSE: '#a78bfa',
            };
            return Object.entries(counts)
              .map(([t, c]) => `<span style="background:${colors[t] || '#94a3b8'};color:#fff;padding:1px 6px;border-radius:8px;font-size:9.5px;font-weight:bold;">${c}× ${t}</span>`)
              .join(' ');
          })()}
        </div>
      </div>
    </div>

    <div style="display: flex; align-items: center; gap: 10px;">
      <div class="zoom-toolbar">
        <button class="zoom-btn" id="btnZoomOut" title="Diminuir Zoom (Ctrl -)">−</button>
        <span class="zoom-label" id="zoomLabel" title="Resetar para 100% (Ctrl 0)">100%</span>
        <button class="zoom-btn" id="btnZoomIn" title="Aumentar Zoom (Ctrl +)">+</button>
        <button class="zoom-btn-text" id="btnZoomFit" title="Ajustar à largura">↔ Ajustar</button>
      </div>

      <button class="top-toolbar-btn" onclick="window.print()">
        🖨️ Imprimir / Salvar Todas em PDF
      </button>
      <button onclick="window.close()" style="padding: 9px 14px; background: #334155; color: #fff; border: none; border-radius: 6px; font-size: 12px; cursor: pointer;">
        Fechar
      </button>
    </div>
  </div>

  <div id="danfe-pages-container" style="max-width: 860px; margin: 0 auto; transition: transform 0.05s ease-out; transform-origin: top center;">
    ${renderedPages}
  </div>

  <script>${DANFE_BATCH_CLIENT_SCRIPT}  </script>
</body>
</html>`;
}


export const DANFE_BATCH_STYLES = `
    @page {
      size: A4 portrait;
      margin: 8mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: Arial, sans-serif;
      color: #000;
      background: #e2e8f0;
      font-size: 9px;
      padding: 0;
      margin: 0;
    }
    .danfe-page {
      page-break-after: always;
      break-after: page;
      padding: 16px 8px;
      display: flex;
      justify-content: center;
      background: #e2e8f0;
    }
    .danfe-page:last-child {
      page-break-after: auto;
      break-after: auto;
    }
    .danfe-box {
      border: 1.5px solid #000;
      padding: 8px;
      background: #fff;
      width: 100%;
      max-width: 800px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    .header-stub {
      border-bottom: 1px dashed #000;
      padding-bottom: 8px;
      margin-bottom: 8px;
    }
    .grid { display: flex; }
    .border-b { border-bottom: 1px solid #000; }
    .border-r { border-right: 1px solid #000; }
    .border-all { border: 1px solid #000; }
    .p-1 { padding: 4px; }
    .p-2 { padding: 8px; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .font-bold { font-weight: bold; }
    .font-black { font-weight: 900; }
    .uppercase { text-transform: uppercase; }
    .title-sec {
      font-size: 8px;
      font-weight: bold;
      margin-top: 6px;
      margin-bottom: 2px;
      text-transform: uppercase;
    }
    .barcode-line {
      height: 36px;
      background: repeating-linear-gradient(90deg, #000 0, #000 2px, #fff 2px, #fff 4px, #000 4px, #000 7px, #fff 7px, #fff 8px);
      margin: 4px 0;
      user-select: none;
      -webkit-user-select: none;
    }
    .top-toolbar {
      position: sticky;
      top: 0;
      z-index: 1000;
      background: #0f172a;
      color: #fff;
      padding: 10px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2px solid #2563eb;
      box-shadow: 0 4px 15px rgba(0,0,0,0.3);
    }
    .top-toolbar-btn {
      padding: 9px 20px;
      background: #2563eb;
      color: #fff;
      border: none;
      border-radius: 6px;
      font-weight: bold;
      font-size: 13px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
    }
    .top-toolbar-btn:hover {
      background: #1d4ed8;
      transform: translateY(-1px);
    }
    .zoom-toolbar {
      display: flex;
      align-items: center;
      gap: 4px;
      background: #1e293b;
      padding: 3px 6px;
      border-radius: 6px;
      border: 1px solid #334155;
    }
    .zoom-btn {
      background: #334155;
      color: #fff;
      border: none;
      border-radius: 4px;
      width: 26px;
      height: 26px;
      font-size: 15px;
      font-weight: bold;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s;
    }
    .zoom-btn:hover {
      background: #475569;
    }
    .zoom-label {
      font-family: monospace;
      font-size: 12px;
      font-weight: bold;
      color: #38bdf8;
      min-width: 44px;
      text-align: center;
      cursor: pointer;
      padding: 2px 4px;
      border-radius: 4px;
      user-select: none;
    }
    .zoom-label:hover {
      background: #334155;
    }
    .zoom-btn-text {
      background: #334155;
      color: #e2e8f0;
      border: none;
      border-radius: 4px;
      padding: 0 8px;
      height: 26px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s;
      user-select: none;
    }
    .zoom-btn-text:hover {
      background: #475569;
    }

    /* === NFC-e (cupom fiscal verde) === */
    .danfe-nfce {
      max-width: 380px !important;
      font-family: 'Courier New', monospace;
      background: #fff;
      color: #000;
      padding: 0 !important;
    }
    .nfce-header {
      text-align: center;
      border-bottom: 2px dashed #047857;
      padding: 8px 6px 6px;
    }
    .nfce-icon { font-size: 22px; margin-bottom: 2px; }
    .nfce-title {
      font-weight: 900;
      font-size: 14px;
      letter-spacing: 0.5px;
      color: #065f46;
    }
    .nfce-subtitle {
      font-size: 7.5px;
      color: #047857;
      text-transform: uppercase;
      margin-top: 1px;
    }
    .nfce-issuer { font-weight: bold; font-size: 9px; margin-top: 3px; }
    .nfce-issuer-doc { font-size: 8px; color: #555; }
    .nfce-docinfo {
      display: flex; justify-content: space-between;
      padding: 4px 6px; font-size: 8px;
      border-bottom: 1px dashed #047857;
    }
    .nfce-docinfo > div { text-align: center; }
    .nfce-docinfo > div:first-child { text-align: left; }
    .nfce-docinfo > div:last-child { text-align: right; }
    .nfce-label { color: #555; }
    .nfce-value-lg { font-weight: bold; font-size: 12px; }
    .nfce-tiny { font-size: 7.5px; color: #555; }
    .nfce-section {
      padding: 4px 6px;
      border-bottom: 1px dashed #047857;
    }
    .nfce-section-title {
      font-size: 8px;
      font-weight: bold;
      color: #047857;
      text-transform: uppercase;
      margin-bottom: 3px;
    }
    .nfce-total-row {
      display: flex; justify-content: space-between;
      font-size: 13px; font-weight: 900;
      color: #064e3b;
      margin-top: 4px; padding-top: 4px;
      border-top: 1px solid #047857;
    }
    .nfce-key {
      font-family: 'Courier New', monospace;
      font-size: 8px;
      font-weight: bold;
      text-align: center;
      margin-top: 4px;
      word-break: break-all;
    }
    .nfce-footer {
      text-align: center;
      font-size: 8px;
      color: #065f46;
      padding: 6px;
      line-height: 1.5;
    }

    /* === CT-e (DACTE âmbar) === */
    .danfe-dacte {
      max-width: 1100px !important;
      border: 2px solid #d97706 !important;
      background: #fff;
      padding: 0 !important;
    }
    .dacte-header {
      background: linear-gradient(180deg, #f59e0b 0%, #d97706 100%);
      color: #fff;
      padding: 6px 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .dacte-icon {
      width: 30px; height: 30px;
      background: #fff; color: #d97706;
      border-radius: 6px;
      display: flex; align-items: center; justify-content: center;
      font-size: 18px;
    }
    .dacte-title {
      font-weight: 900;
      font-size: 16px;
      letter-spacing: 1px;
      line-height: 1;
    }
    .dacte-subtitle {
      font-size: 8px;
      opacity: 0.95;
      margin-top: 2px;
    }
    .dacte-tipo-row {
      display: flex;
      border-bottom: 2px solid #d97706;
    }
    .dacte-emitente {
      display: flex; align-items: center; gap: 8px;
      background: #fef3c7;
      padding: 6px 10px;
      border-bottom: 1px solid #fde68a;
    }
    .dacte-section-title {
      background: #fef3c7;
      padding: 4px 8px;
      font-size: 8px;
      font-weight: bold;
      color: #92400e;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .dacte-partes {
      display: flex;
      border-bottom: 1px solid #fde68a;
    }
    .dacte-key {
      font-family: 'Courier New', monospace;
      font-size: 10px;
      font-weight: bold;
      text-align: center;
      letter-spacing: 1px;
      background: #fef3c7;
      padding: 4px;
      border: 1px solid #fde68a;
      border-radius: 2px;
    }

    /* === NFS-e (DANFSE violeta) === */
    .danfe-nfse {
      max-width: 800px !important;
      border: 2px solid #6d28d9 !important;
      background: #fff;
      padding: 0 !important;
    }
    .nfse-header {
      background: linear-gradient(180deg, #7c3aed 0%, #5b21b6 100%);
      color: #fff;
      padding: 6px 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .nfse-icon {
      width: 34px; height: 34px;
      background: #fff; color: #6d28d9;
      border-radius: 6px;
      display: flex; align-items: center; justify-content: center;
      font-size: 18px;
    }
    .nfse-title {
      font-weight: 900;
      font-size: 16px;
      letter-spacing: 1px;
      line-height: 1;
    }
    .nfse-subtitle {
      font-size: 8px;
      opacity: 0.95;
      margin-top: 2px;
    }
    .nfse-ident {
      display: flex;
      border-bottom: 2px solid #6d28d9;
    }
    .nfse-section {
      border-bottom: 1px solid #ddd6fe;
    }
    .nfse-section-title {
      background: #ede9fe;
      padding: 4px 8px;
      font-size: 8px;
      font-weight: bold;
      color: #5b21b6;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .nfse-block {
      display: flex; flex-wrap: wrap;
      padding: 4px 0;
    }
    .nfse-desc {
      padding: 6px 8px;
      border: 1px solid #ddd6fe;
      background: #faf5ff;
      font-size: 9.5px;
      line-height: 1.4;
      min-height: 50px;
      white-space: pre-wrap;
    }
    .nfse-key {
      font-family: 'Courier New', monospace;
      font-size: 11px;
      font-weight: bold;
      text-align: center;
      letter-spacing: 1px;
      background: #ede9fe;
      padding: 6px;
      border: 1px solid #c4b5fd;
      border-radius: 2px;
    }

    @media print {
      body {
        background: #fff !important;
        padding: 0 !important;
      }
      .no-print {
        display: none !important;
      }
      #danfe-pages-container {
        zoom: 1 !important;
        transform: none !important;
        max-width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      .danfe-page {
        padding: 0 !important;
        background: #fff !important;
      }
      .danfe-box {
        box-shadow: none !important;
        max-width: 100% !important;
        margin: 0 !important;
      }
      .danfe-nfce { border: 2px dashed #047857 !important; }
      .danfe-dacte { border: 2px solid #d97706 !important; }
      .danfe-nfse { border: 2px solid #6d28d9 !important; }
    }
`;


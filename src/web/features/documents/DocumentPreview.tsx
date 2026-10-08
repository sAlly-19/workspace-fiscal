import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { apiFetch } from '../../lib/api';
import { useWorkspaceStore } from '../../stores/workspace.store';
import { PreviewToolbar, type PreviewMode } from './preview/PreviewToolbar';
import { XmlPreviewPane } from './preview/XmlPreviewPane';
import { DadosView } from './preview/DadosView';
import { DanfeView } from './preview/DanfeView';

export function DocumentPreview({
  docDetails,
  onBackToList,
}: {
  docDetails: any;
  onBackToList?: () => void;
}) {
  const { settings } = useWorkspaceStore();
  const currentTheme = settings.theme || 'dark';

  const [mode, setMode] = useState<PreviewMode>('visualizar');
  const [xml, setXml] = useState<string>('');
  const [loadingXml, setLoadingXml] = useState(false);
  const [copiedXml, setCopiedXml] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  const ZOOM_PRESETS = [50, 65, 75, 85, 100, 115, 130, 150, 175, 200];
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleZoomIn = () => {
    setZoomLevel((prev) => {
      const next = ZOOM_PRESETS.find((z) => z > prev);
      return next !== undefined ? next : Math.min(250, prev + 15);
    });
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => {
      const next = [...ZOOM_PRESETS].reverse().find((z) => z < prev);
      return next !== undefined ? next : Math.max(50, prev - 15);
    });
  };

  const handleZoomReset = () => {
    setZoomLevel(100);
  };

  const handleFitWidth = () => {
    if (scrollContainerRef.current) {
      const availableWidth = scrollContainerRef.current.clientWidth - 48;
      const docBaseWidth = 850;
      if (availableWidth > 0) {
        const calculated = Math.round((availableWidth / docBaseWidth) * 100);
        const clamped = Math.min(200, Math.max(50, calculated));
        setZoomLevel(clamped);
      }
    }
  };

  useEffect(() => {
    if (mode !== 'visualizar') return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === '+' || e.key === '=' || e.code === 'NumpadAdd') {
          e.preventDefault();
          handleZoomIn();
        } else if (e.key === '-' || e.key === '_' || e.code === 'NumpadSubtract') {
          e.preventDefault();
          handleZoomOut();
        } else if (e.key === '0' || e.code === 'Numpad0') {
          e.preventDefault();
          handleZoomReset();
        }
      }
    };

    const container = scrollContainerRef.current;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        if (e.deltaY < 0) {
          handleZoomIn();
        } else if (e.deltaY > 0) {
          handleZoomOut();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    if (container) {
      container.addEventListener('wheel', onWheel, { passive: false });
    }

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      if (container) {
        container.removeEventListener('wheel', onWheel);
      }
    };
  }, [mode]);

  useEffect(() => {
    // Default to visualizar (DANFE / PDF) when document changes
    setMode('visualizar');
    setXml('');
    setZoomLevel(100);
  }, [docDetails.id]);

  useEffect(() => {
    if (mode === 'xml' && !xml && !loadingXml) {
      setLoadingXml(true);
      apiFetch(`/api/documents/${docDetails.id}/xml`)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.text();
        })
        .then((data) => {
          setXml(data);
          setLoadingXml(false);
        })
        .catch((err) => {
          console.warn('[DocumentPreview] Erro ao carregar XML:', err);
          setXml('Não foi possível carregar o arquivo XML deste documento.');
          setLoadingXml(false);
        });
    }
  }, [mode, docDetails.id, xml, loadingXml]);

  const handleCopyXml = () => {
    if (!xml) {
      apiFetch(`/api/documents/${docDetails.id}/xml`)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.text();
        })
        .then((data) => {
          navigator.clipboard.writeText(data);
          setCopiedXml(true);
          setTimeout(() => setCopiedXml(false), 2000);
        })
        .catch((err) => {
          console.warn('[DocumentPreview] Erro ao copiar XML:', err);
        });
    } else {
      navigator.clipboard.writeText(xml);
      setCopiedXml(true);
      setTimeout(() => setCopiedXml(false), 2000);
    }
  };

  const handleCopyKey = () => {
    if (docDetails.accessKey) {
      navigator.clipboard.writeText(docDetails.accessKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const handlePrint = () => {
    setMode('visualizar');
    // Ensure document preview renders cleanly, then trigger print
    setTimeout(() => {
      window.print();
    }, 200);
  };

  const handleDownloadXml = async () => {
    try {
      const res = await apiFetch(`/api/documents/${docDetails.id}/xml`);
      if (!res.ok) throw new Error('Falha no download');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${docDetails.accessKey || docDetails.number || 'documento'}.xml`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (e) {
      console.warn('[DocumentPreview] download failed', e);
      // Fallback relativo
      const link = document.createElement('a');
      link.href = `/api/documents/${docDetails.id}/xml`;
      link.download = `${docDetails.accessKey || docDetails.number || 'documento'}.xml`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div
      className={`flex flex-col h-full overflow-hidden print:bg-white print:overflow-visible ${
        currentTheme === 'light' ? 'bg-[#f8fafc] text-[#0f172a]' : 'bg-[#18181b] text-[#fafafa]'
      }`}
    >
      {/* Action Header */}
      <PreviewToolbar
        currentTheme={currentTheme}
        mode={mode}
        setMode={setMode}
        onBackToList={onBackToList}
        zoomLevel={zoomLevel}
        handleZoomIn={handleZoomIn}
        handleZoomOut={handleZoomOut}
        handleZoomReset={handleZoomReset}
        handleFitWidth={handleFitWidth}
        accessKey={docDetails.accessKey}
        copiedKey={copiedKey}
        handleCopyKey={handleCopyKey}
        copiedXml={copiedXml}
        handleCopyXml={handleCopyXml}
        handleDownloadXml={handleDownloadXml}
        handlePrint={handlePrint}
      />

      {/* Content Area with Fluid Transition */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto overflow-x-auto relative print:overflow-visible select-text danfe-selectable"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="w-full h-full min-h-full select-text danfe-selectable"
          >
            {mode === 'visualizar' && (
              <div
                className="danfe-zoom-content w-full min-h-full flex justify-center origin-top select-text danfe-selectable transition-transform duration-75"
                style={{ zoom: zoomLevel / 100 }}
              >
                <DanfeView doc={docDetails} theme={currentTheme} />
              </div>
            )}
            {mode === 'dados' && <DadosView doc={docDetails} theme={currentTheme} />}
            {mode === 'xml' && (
              <XmlPreviewPane xml={xml} loadingXml={loadingXml} currentTheme={currentTheme} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

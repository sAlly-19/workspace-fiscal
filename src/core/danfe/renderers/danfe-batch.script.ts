export const DANFE_BATCH_CLIENT_SCRIPT = `
    (function() {
      const PRESETS = [50, 65, 75, 85, 100, 115, 130, 150, 175, 200];
      let zoom = 100;
      const container = document.getElementById('danfe-pages-container');
      const label = document.getElementById('zoomLabel');
      const btnIn = document.getElementById('btnZoomIn');
      const btnOut = document.getElementById('btnZoomOut');
      const btnFit = document.getElementById('btnZoomFit');

      function updateZoom(newZoom) {
        zoom = Math.min(250, Math.max(50, newZoom));
        if (container) {
          container.style.zoom = (zoom / 100);
        }
        if (label) {
          label.textContent = zoom + '%';
        }
      }

      function zoomIn() {
        const next = PRESETS.find(function(z) { return z > zoom; });
        updateZoom(next !== undefined ? next : zoom + 15);
      }

      function zoomOut() {
        const next = PRESETS.slice().reverse().find(function(z) { return z < zoom; });
        updateZoom(next !== undefined ? next : zoom - 15);
      }

      function zoomReset() {
        updateZoom(100);
      }

      function zoomFit() {
        const available = window.innerWidth - 40;
        const base = 860;
        if (available > 0) {
          const calculated = Math.round((available / base) * 100);
          updateZoom(calculated);
        }
      }

      if (btnIn) btnIn.addEventListener('click', zoomIn);
      if (btnOut) btnOut.addEventListener('click', zoomOut);
      if (label) label.addEventListener('click', zoomReset);
      if (btnFit) btnFit.addEventListener('click', zoomFit);

      // Keyboard shortcuts: Ctrl +, Ctrl -, Ctrl 0
      window.addEventListener('keydown', function(e) {
        if (e.ctrlKey || e.metaKey) {
          if (e.key === '+' || e.key === '=' || e.code === 'NumpadAdd') {
            e.preventDefault();
            zoomIn();
          } else if (e.key === '-' || e.key === '_' || e.code === 'NumpadSubtract') {
            e.preventDefault();
            zoomOut();
          } else if (e.key === '0' || e.code === 'Numpad0') {
            e.preventDefault();
            zoomReset();
          }
        }
      });

      // Mouse wheel zoom with Ctrl key
      window.addEventListener('wheel', function(e) {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          if (e.deltaY < 0) zoomIn();
          else if (e.deltaY > 0) zoomOut();
        }
      }, { passive: false });

      // Auto trigger print prompt if requested via query param
      if (new URLSearchParams(window.location.search).get('autoprint') === 'true') {
        setTimeout(function() { window.print(); }, 350);
      }
    })();
`;


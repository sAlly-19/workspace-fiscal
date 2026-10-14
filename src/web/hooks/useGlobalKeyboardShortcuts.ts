import { useEffect } from 'react';

export interface GlobalKeyboardShortcutsOptions {
  onNavigateHome?: () => void;
  onNavigateNfView?: () => void;
  onNavigateDepreciation?: () => void;
  onNavigateBuscador?: () => void;
  onOpenSettings?: () => void;
  onOpenHelp?: () => void;
  enabled?: boolean;
}

/**
 * Detecta se o elemento focado é um campo de entrada de texto ou elemento editável
 */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!target || typeof target !== 'object') return false;
  const el = target as HTMLElement;
  const tagName = el.tagName?.toLowerCase();
  if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') return true;
  if (el.isContentEditable || el.getAttribute?.('contenteditable') === 'true') return true;
  return false;
}

/**
 * Detecta se existe algum modal ou diálogo acessível aberto no DOM (Safeguard 3)
 */
export function hasOpenModal(): boolean {
  if (typeof document === 'undefined') return false;
  return Boolean(document.querySelector('[role="dialog"][aria-modal="true"]'));
}

/**
 * Processador central de atalhos globais de teclado
 */
export function handleGlobalShortcutKeyDown(
  event: KeyboardEvent,
  options: GlobalKeyboardShortcutsOptions
): void {
  if (options.enabled === false) return;

  const isModifier = event.ctrlKey || event.metaKey;

  if (isModifier) {
    // Atalhos de navegação entre módulos (Ctrl+1..4)
    if (['1', '2', '3', '4'].includes(event.key)) {
      // Safeguard 3: se houver modal aberto, bloqueia troca de tela para proteger dados não salvos
      if (hasOpenModal()) {
        return;
      }

      event.preventDefault();
      switch (event.key) {
        case '1':
          options.onNavigateHome?.();
          break;
        case '2':
          options.onNavigateNfView?.();
          break;
        case '3':
          options.onNavigateDepreciation?.();
          break;
        case '4':
          options.onNavigateBuscador?.();
          break;
      }
      return;
    }

    // Ctrl+, abre configurações
    if (event.key === ',') {
      event.preventDefault();
      options.onOpenSettings?.();
      return;
    }

    // Ctrl+H abre ajuda
    if (event.key === 'h' || event.key === 'H') {
      event.preventDefault();
      options.onOpenHelp?.();
      return;
    }
  }

  // Tecla F1 abre Ajuda/Novidades, exceto se usuário estiver digitando
  if (event.key === 'F1') {
    if (!isEditableTarget(event.target)) {
      event.preventDefault();
      options.onOpenHelp?.();
    }
  }
}

/**
 * Hook React para registrar atalhos de navegação e produtividade em nível de aplicativo
 */
export function useGlobalKeyboardShortcuts(options: GlobalKeyboardShortcutsOptions): void {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      handleGlobalShortcutKeyDown(e, options);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    options.onNavigateHome,
    options.onNavigateNfView,
    options.onNavigateDepreciation,
    options.onNavigateBuscador,
    options.onOpenSettings,
    options.onOpenHelp,
    options.enabled,
  ]);
}


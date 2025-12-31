'use client';

import { useEffect, useCallback } from 'react';

/**
 * Hook para ejecutar una función cuando se presiona la tecla Escape.
 * Útil para asociar la tecla Escape al botón "Volver" en las vistas.
 * 
 * @param callback - Función a ejecutar cuando se presiona Escape
 * @param enabled - Si el hook está activo (default: true)
 */
export function useEscapeKey(callback: () => void, enabled: boolean = true) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Solo ejecutar si no hay modales/diálogos abiertos
    // Verificar que no estamos en un input o textarea
    const target = event.target as HTMLElement;
    const isInputFocused = target.tagName === 'INPUT' || 
                           target.tagName === 'TEXTAREA' || 
                           target.isContentEditable;
    
    // Verificar que no hay un diálogo abierto (Radix UI usa data-state="open")
    const hasOpenDialog = document.querySelector('[role="dialog"][data-state="open"]');
    
    if (event.key === 'Escape' && !isInputFocused && !hasOpenDialog) {
      event.preventDefault();
      callback();
    }
  }, [callback]);

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, enabled]);
}

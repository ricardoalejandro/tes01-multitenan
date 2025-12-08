'use client';

import * as React from 'react';
import { Maximize2, Minimize2, X } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';

interface ResponsiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  defaultMaximized?: boolean;
}

export function ResponsiveDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  defaultMaximized = false,
}: ResponsiveDialogProps) {
  const [isMaximized, setIsMaximized] = React.useState(defaultMaximized);

  console.log('ResponsiveDialog render:', { open, isMaximized, defaultMaximized, title });

  // Reset maximized state when dialog closes
  React.useEffect(() => {
    if (!open) {
      setIsMaximized(defaultMaximized);
    }
  }, [open, defaultMaximized]);

  // Handle ESC key and body scroll lock
  React.useEffect(() => {
    if (!open) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };

    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={() => !isMaximized && onOpenChange(false)}
      />

      {/* Dialog Content */}
      <div
        className={cn(
          'fixed z-[101] bg-white shadow-2xl overflow-hidden flex flex-col',
          'animate-in fade-in-0 duration-[650ms] ease-out',
          isMaximized
            ? 'inset-4 rounded-none'
            : 'inset-0 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[90vw] md:max-w-4xl md:max-h-[90vh] md:rounded-xl'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b border-neutral-4 flex-shrink-0 bg-white">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg md:text-2xl font-bold text-neutral-12 truncate">{title}</h2>
            {description && <p className="text-xs md:text-sm text-neutral-10 mt-1 truncate">{description}</p>}
          </div>
          <div className="flex items-center gap-2 ml-4">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsMaximized(!isMaximized)}
              type="button"
            >
              {isMaximized ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
              <span className="sr-only">
                {isMaximized ? 'Minimizar' : 'Maximizar'}
              </span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onOpenChange(false)}
              type="button"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Cerrar</span>
            </Button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 md:py-6">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex justify-end gap-2 px-4 md:px-6 py-3 md:py-4 border-t border-neutral-4 flex-shrink-0 bg-neutral-1">
            {footer}
          </div>
        )}
      </div>
    </>
  );
}

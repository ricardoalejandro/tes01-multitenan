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
            : 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-4xl max-h-[90vh] rounded-xl'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-4 flex-shrink-0">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-neutral-12">{title}</h2>
            {description && <p className="text-sm text-neutral-10 mt-1">{description}</p>}
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
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex justify-end gap-2 px-6 py-4 border-t border-neutral-4 flex-shrink-0 bg-neutral-1">
            {footer}
          </div>
        )}
      </div>
    </>
  );
}

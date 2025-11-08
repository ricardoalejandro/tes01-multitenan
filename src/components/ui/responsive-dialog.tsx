'use client';

import * as React from 'react';
import { Maximize2, Minimize2, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './dialog';
import { Button } from './button';
import { cn } from '@/lib/utils';

interface ResponsiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function ResponsiveDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
}: ResponsiveDialogProps) {
  const [isMaximized, setIsMaximized] = React.useState(false);

  // Reset maximized state when dialog closes
  React.useEffect(() => {
    if (!open) {
      setIsMaximized(false);
    }
  }, [open]);

  return (
    <Dialog 
      open={open} 
      onOpenChange={onOpenChange}
      onInteractOutside={(e) => {
        if (isMaximized) {
          e.preventDefault();
        }
      }}
    >
      <DialogContent
        className={cn(
          'transition-all duration-300 ease-in-out',
          isMaximized
            ? 'fixed inset-4 max-w-none h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] p-0'
            : 'max-w-2xl max-h-[90vh] p-0'
        )}
      >
        <DialogHeader
          className={cn(
            'flex flex-row items-center justify-between space-y-0 px-6 py-4',
            isMaximized ? 'border-b border-neutral-4' : 'border-b border-neutral-4'
          )}
        >
          <div className="flex-1">
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </div>
          <div className="flex items-center gap-2">
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
          </div>
        </DialogHeader>

        <div
          className={cn(
            'overflow-y-auto px-6',
            isMaximized ? 'h-[calc(100%-8rem)] py-4' : 'max-h-[calc(90vh-12rem)] py-6'
          )}
        >
          {children}
        </div>

        {footer && (
          <div
            className={cn(
              'flex justify-end gap-2 px-6 py-4',
              isMaximized ? 'border-t border-neutral-4 bg-muted/50' : 'border-t border-neutral-4'
            )}
          >
            {footer}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

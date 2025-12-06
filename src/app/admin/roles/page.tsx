'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import RolesModule from '@/components/modules/RolesModule';

export default function RolesManagementPage() {
  const router = useRouter();
  
  const handleBack = () => router.push('/admin');
  
  // Tecla Escape = botón Volver
  useEscapeKey(handleBack);

  return (
    <div className="space-y-4">
      <Button
        variant="ghost"
        onClick={handleBack}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Volver al Panel de Administración
      </Button>
      <RolesModule />
    </div>
  );
}

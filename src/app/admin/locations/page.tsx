'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import LocationsModule from '@/components/modules/LocationsModule';

export default function LocationsManagementPage() {
  const router = useRouter();
  const handleBack = () => router.push('/admin');
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
      <LocationsModule />
    </div>
  );
}

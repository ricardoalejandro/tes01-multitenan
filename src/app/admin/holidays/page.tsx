'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import HolidaysModule from '@/components/modules/HolidaysModule';

export default function HolidaysManagementPage() {
  const router = useRouter();

  return (
    <div className="space-y-4">
      <Button
        variant="ghost"
        onClick={() => router.push('/admin')}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Volver al Panel de Administración
      </Button>
      <HolidaysModule />
    </div>
  );
}

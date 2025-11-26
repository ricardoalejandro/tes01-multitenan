'use client';

import CounselingModule from '@/components/modules/CounselingModule';

interface PhilosophicalCounselingTabProps {
  studentId: string;
}

export function PhilosophicalCounselingTab({ studentId }: PhilosophicalCounselingTabProps) {
  return <CounselingModule studentId={studentId} />;
}

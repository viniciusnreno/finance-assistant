'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

interface DashboardFiltersProps {
  current: string;
  labels: Record<string, string>;
}

export function DashboardFilters({ current, labels }: DashboardFiltersProps) {
  const router = useRouter();

  return (
    <div className="flex flex-wrap gap-1.5">
      {Object.entries(labels).map(([value, label]) => (
        <Button
          key={value}
          size="sm"
          variant={current === value ? 'default' : 'secondary'}
          onClick={() => router.push(`/dashboard?filter=${value}`)}
          className="h-8 text-xs"
        >
          {label}
        </Button>
      ))}
    </div>
  );
}

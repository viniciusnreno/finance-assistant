'use client';

import { useRouter } from 'next/navigation';

interface DashboardFiltersProps {
  current: string;
  labels: Record<string, string>;
}

export function DashboardFilters({ current, labels }: DashboardFiltersProps) {
  const router = useRouter();

  return (
    <div className="flex flex-wrap gap-2">
      {Object.entries(labels).map(([value, label]) => (
        <button
          key={value}
          onClick={() => router.push(`/dashboard?filter=${value}`)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            current === value
              ? 'bg-emerald-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

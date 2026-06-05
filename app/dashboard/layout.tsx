import { ReactNode } from 'react';
import Link from 'next/link';
import { LogoutButton } from '@/components/logout-button';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2 font-bold text-lg">
              <span className="text-emerald-400">💰</span>
              <span>Finance</span>
            </Link>
            <nav className="hidden sm:flex items-center gap-4 text-sm">
              <Link
                href="/dashboard"
                className="text-gray-400 hover:text-white transition-colors"
              >
                Visão Geral
              </Link>
              <Link
                href="/dashboard/transactions"
                className="text-gray-400 hover:text-white transition-colors"
              >
                Transações
              </Link>
            </nav>
          </div>
          <LogoutButton />
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
    </div>
  );
}

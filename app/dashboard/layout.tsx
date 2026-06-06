import { ReactNode } from 'react';
import Link from 'next/link';
import { LogoutButton } from '@/components/logout-button';
import { Separator } from '@/components/ui/separator';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-base">
              <span className="text-primary text-lg">💰</span>
              <span className="text-foreground">Finance</span>
            </Link>
            <Separator orientation="vertical" className="h-5" />
            <nav className="hidden sm:flex items-center gap-1">
              <Link
                href="/dashboard"
                className="px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                Visão Geral
              </Link>
              <Link
                href="/dashboard/transactions"
                className="px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                Transações
              </Link>
            </nav>
          </div>
          <LogoutButton />
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}

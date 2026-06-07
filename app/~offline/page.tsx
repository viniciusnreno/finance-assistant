import Image from "next/image";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4 text-center bg-background">
      <Image src="/logo.png" alt="Reno Finance" width={64} height={64} />
      <div className="space-y-2 max-w-sm">
        <h1 className="text-xl font-semibold">Você está offline</h1>
        <p className="text-muted-foreground text-sm">
          Não foi possível carregar esta página. Verifique sua conexão e tente
          novamente.
        </p>
      </div>
      <Link href="/dashboard" className={cn(buttonVariants())}>
        Tentar novamente
      </Link>
    </div>
  );
}

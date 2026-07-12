import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-2xl items-center px-4 py-8">
        <Link href="/login" aria-label="Retour à Vela">
          <Logo size={32} />
        </Link>
      </header>
      <main className="mx-auto max-w-2xl px-4 pb-24">{children}</main>
    </div>
  );
}

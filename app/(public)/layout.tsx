import type { ReactNode } from "react";
import { Navbar } from "@/components/public/Navbar";
import { Footer } from "@/components/public/Footer";
import { SplashScreen } from "@/components/public/SplashScreen";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col font-[family-name:var(--font-body)]">
      <SplashScreen />
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

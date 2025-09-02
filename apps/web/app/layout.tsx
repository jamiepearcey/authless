import './locales.settings'
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClientProviders } from "../providers/ClientProviders";
import Header from "../components/Header";
import Footer from "@/components/Footer";
import { I18nMount } from "@i18n-core/src/server";

import { ReactNode } from "react";
import { Toaster } from "@ui/base";
import { MicrosoftClarity } from "../components/MicrosoftClarity";
import { ClarityCssConfig } from "../components/ClarityCssConfig";

const inter = Inter({
  subsets: ["latin"],
});
export const metadata: Metadata = {
  title: "Authless",
  description: "A full-stack TypeScript monorepo",
};
type LayoutProps = {
  children: ReactNode;
  params: { locale: string }; // <-- you declare this
};

export default function RootLayout({ children }: LayoutProps) {
  console.log("Root layout where?", typeof window === "undefined" ? "server" : "browser");

  return (
    <html lang="en">
      <body className={inter.className}>
        <MicrosoftClarity />
        <ClarityCssConfig />
        <I18nMount>
          <ClientProviders>
            <div className="min-h-screen bg-background flex flex-col">
              <Toaster />
              <Header />
              {children}
              <Footer />
            </div>
          </ClientProviders>
        </I18nMount>
      </body>
    </html>
  );
}

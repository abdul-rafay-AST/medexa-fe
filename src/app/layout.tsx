import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppHeader } from "@/components/layout/AppHeader";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Medexa - Clinician Portal",
  description: "AI-powered medical scribe and billing intelligence",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-medexa-gray-50 min-h-screen antialiased`}>
        <AppHeader />
        <main className="max-w-[1200px] mx-auto px-4 md:px-6 py-6 md:py-8">
          {children}
        </main>
      </body>
    </html>
  );
}


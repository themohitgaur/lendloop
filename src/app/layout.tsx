
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import UserSync from "@/components/auth/UserSync";
import ConvexClientProvider from "@/components/providers/ConvexClientProvider";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LendLoop | Borrow. Lend. Connect.",
  description:
    "Find the tools you need, lend what you own, and build a more connected neighborhood.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ClerkProvider>
          <ConvexClientProvider>
              <UserSync />
            {children}
          </ConvexClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}

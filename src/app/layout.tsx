import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import NavigationProgress from "@/components/layout/NavigationProgress";
import NavigationProgressBar from "@/components/layout/NavigationProgressBar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ICBM-AttendX",
  description: "QR-Based Attendance Management System by SBTS Group",
  icons: {
    icon: "/icbm-logo.png",
    apple: "/icbm-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Suspense fallback={null}>
          <NavigationProgress />
          <NavigationProgressBar />
        </Suspense>
        {children}
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { StudentProvider } from '@/lib/context/StudentContext';
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/context/AuthContext";
import { MockTestProvider } from "@/lib/context/MockTestContext";
import { GlobalScheduleProvider } from "@/lib/context/GlobalScheduleContext";
import { BottomNav } from "@/components/layout/BottomNav";
import { Sidebar } from "@/components/layout/Sidebar";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "도개인재 ME",
  description: "도개인재 ME - Smart Manager for Students",
  manifest: "/manifest.json",
  icons: {
    icon: "/dgijfavicon.png",
    apple: "/dgijfavicon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "도개인재 ME",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <GlobalScheduleProvider>
            <MockTestProvider>
              <StudentProvider>
                <div className="flex min-h-screen">
                  <Sidebar />
                  <main className="flex-1 md:ml-16 pb-20 md:pb-0 bg-secondary/30 min-h-screen">
                    {children}
                    <Toaster />
                  </main>
                  <BottomNav />
                </div>
              </StudentProvider>
            </MockTestProvider>
          </GlobalScheduleProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

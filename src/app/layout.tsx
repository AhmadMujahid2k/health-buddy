import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Shell } from "@/components/Shell";
import { GoalWidget } from "@/components/GoalWidget";
import { themeBootScript } from "@/components/ThemeToggle";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta" });

export const metadata: Metadata = {
  title: { default: "Health Buddy", template: "%s · Health Buddy" },
  description: "Personal calorie and weight-loss tracker",
  appleWebApp: { capable: true, title: "Health Buddy", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0b1f22",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${jakarta.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="min-h-full">
        <Shell
          widget={
            <Suspense fallback={<div className="h-28 rounded-xl bg-sidebar-line/50" />}>
              <GoalWidget />
            </Suspense>
          }
        >
          {children}
        </Shell>
      </body>
    </html>
  );
}

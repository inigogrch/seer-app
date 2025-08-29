import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google" 
import "./globals.css"
import { AppSidebar } from "@/components/app-sidebar"
import { cn } from "@/lib/utils"

const inter = Inter({ 
  subsets: ["latin"], 
  variable: "--font-inter",
  display: 'swap',
  fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Arial', 'sans-serif'],
  adjustFontFallback: false, // Prevent font adjustment issues
})

export const metadata: Metadata = {
  title: "Seer - Intelligence Feed",
  description: "Get AI-powered insights on the latest tech developments.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={cn(inter.className, "bg-grid-pattern bg-no-repeat bg-cover")}>
        <div className="flex h-screen w-full overflow-hidden">
          <AppSidebar />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </body>
    </html>
  )
}


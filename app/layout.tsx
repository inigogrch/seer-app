import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import { AppSidebar } from "@/components/app-sidebar"
import { cn } from "@/lib/utils"

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
      <head>
        <link rel="preconnect" href="https://rsms.me/" />
        <link rel="stylesheet" href="https://rsms.me/inter/inter.css" />
      </head>
      <body className={cn("bg-grid-pattern bg-no-repeat bg-cover")}>
        <div className="flex h-screen w-full overflow-hidden">
          <AppSidebar />
          <main className="flex-1 overflow-y-auto overflow-x-hidden">{children}</main>
        </div>
      </body>
    </html>
  )
}


"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, MessageSquare, Settings, Sparkles, Eye } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const navItems = [
  { href: "/", label: "Feed", icon: Home },
  { href: "/personalize", label: "Personalize", icon: Sparkles },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/settings", label: "Settings", icon: Settings },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 flex-shrink-0 bg-transparent p-4 flex flex-col">
      <div className="flex items-center gap-2 p-4 mb-4">
        <Eye className="h-8 w-8 text-primary" />
        <h1 className="text-2xl font-bold text-gray-800">seer</h1>
      </div>
      <nav className="flex flex-col gap-2">
        {navItems.map((item) => (
          <Button
            key={item.href}
            variant="ghost"
            asChild
            className={cn(
              "justify-start gap-3 text-muted-foreground hover:text-foreground",
              (pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))) &&
                "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground",
            )}
          >
            <Link href={item.href}>
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          </Button>
        ))}
      </nav>
    </aside>
  )
}

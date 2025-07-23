"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send } from "lucide-react"

const suggestions = [
  "Give me a daily digest of AI breakthroughs",
  "Any new research on AI Agents?",
  "Show me top Computer Vision breakthroughs",
  "What's happening in MLOps this week?",
  "Latest developments in LLMs",
  "Trending in Data Engineering",
]

export default function ChatPage() {
  return (
    <div className="flex flex-col h-full p-8">
      <div className="flex-grow flex flex-col items-center justify-center text-center">
        <h1 className="text-3xl font-bold mb-2">Intelligence Chat</h1>
        <p className="text-muted-foreground mb-12">
          Ask questions about the latest tech developments and get AI-powered insights
        </p>

        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">✨ Try asking about:</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl">
            {suggestions.map((s) => (
              <Button
                key={s}
                variant="outline"
                className="bg-white/80 justify-start text-left h-auto py-3"
                onClick={() => {}}
              >
                {s}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="w-full max-w-4xl mx-auto">
        <form
          className="relative"
          onSubmit={(e) => {
            e.preventDefault()
          }}
        >
          <Input
            placeholder="Ask about the latest in AI, ML, data engineering, or any tech topic..."
            className="bg-white h-12 pr-12"
          />
          <Button type="submit" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}
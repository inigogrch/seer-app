"use client"

import { useState, useEffect, useRef, Suspense, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Send, Bot, User, RefreshCw, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'

const suggestions = [
  "Give me a daily digest of AI breakthroughs",
  "Any new research on AI Agents?",
  "Show me top Computer Vision breakthroughs",
  "What's happening in MLOps this week?",
  "Latest developments in LLMs",
  "Trending in Data Engineering",
]

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface StoryContext {
  id: string
  title: string
  source: string
  url: string
}

// Format message content with markdown-like styling
const formatMessageContent = (content: string) => {
  const lines = content.split('\n')
  const elements: React.ReactElement[] = []
  
  // Function to parse bold text within a line
  const parseBoldText = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/)
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={index} className="font-semibold text-gray-900">
            {part.replace(/\*\*/g, '')}
          </strong>
        )
      }
      return part
    })
  }
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    
    if (line.startsWith('## ') || line.startsWith('### ')) {
      // Main headings (## or ###)
      const headingText = line.replace(/^##+ /, '')
      elements.push(
        <h3 key={i} className="text-lg font-semibold mt-6 mb-3 text-gray-900 first:mt-0">
          {headingText}
        </h3>
      )
    } else if (line.startsWith('- ')) {
      // Bullet points (handle bold text within)
      const bulletContent = line.replace('- ', '')
      elements.push(
        <div key={i} className="flex items-start gap-3 mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0"></span>
          <span className="leading-relaxed">{parseBoldText(bulletContent)}</span>
        </div>
      )
    } else if (line.startsWith('**') && line.endsWith('**')) {
      // Full bold lines
      elements.push(
        <p key={i} className="font-semibold mb-2 text-gray-900">
          {line.replace(/\*\*/g, '')}
        </p>
      )
    } else if (line.length > 0) {
      // Regular paragraphs (handle bold text within)
      elements.push(
        <p key={i} className="mb-3 leading-relaxed text-gray-700">
          {parseBoldText(line)}
        </p>
      )
    } else if (i < lines.length - 1) {
      // Empty lines for spacing (but not at the end)
      elements.push(<div key={i} className="h-2"></div>)
    }
  }
  
  return elements
}

function ChatPageContent() {
  const searchParams = useSearchParams()
  const storyId = searchParams?.get('storyId')
  const [storyContext, setStoryContext] = useState<StoryContext | null>(null)
  const [isLoadingStory, setIsLoadingStory] = useState(!!storyId)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const hasTriggeredAnalysis = useRef<string | null>(null) // Track which story we've analyzed

  // Get user preferences from localStorage
  const getUserContext = () => {
    try {
      const stored = localStorage.getItem('user_preferences')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  }

  const { 
    messages, 
    sendMessage,
    status,
    error,
    setMessages
  } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/news-agent'
    }),
    onError: (error: Error) => {
      console.error('Chat error:', error)
      console.error('Error details:', error.message)
      console.error('Full error:', error)
    },
    onFinish: (message: any) => {
      console.log('Chat finished successfully')
    }
  })

  // Manually manage input state for form handling
  const [input, setInput] = useState('')
  const isLoading = status === 'streaming' || status === 'submitted'

  // Form handlers
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim() && !isLoading) {
      sendMessage(
        { text: input.trim() },
        {
          body: {
            storyId: storyId || undefined,
            userContext: getUserContext()
          }
        }
      )
      setInput('')
    }
  }

  // Auto-trigger story analysis when storyId is provided
  useEffect(() => {
    if (storyId && hasTriggeredAnalysis.current !== storyId && !isLoading) {
      console.log('Auto-triggering story analysis for:', storyId)
      console.log('User context:', getUserContext())
      
      // Mark this story as analyzed to prevent re-triggering
      hasTriggeredAnalysis.current = storyId
      setIsLoadingStory(false)
      
      // Auto-start the analysis
      sendMessage(
        { text: 'AUTO_ANALYZE' },
        {
          body: {
            storyId: storyId || undefined,
            userContext: getUserContext()
          }
        }
      )
    } else if (!storyId) {
      // Reset when no story ID
      hasTriggeredAnalysis.current = null
      setIsLoadingStory(false)
    } else {
      setIsLoadingStory(false)
    }
  }, [storyId, isLoading, sendMessage]) // Include sendMessage but use ref to prevent loops

  // Auto-scroll to bottom when new messages arrive (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
    
    return () => clearTimeout(timeoutId)
  }, [messages])

  const handleSuggestionClick = useCallback((suggestion: string) => {
    if (!isLoading) {
      sendMessage(
        { text: suggestion },
        {
          body: {
            storyId: storyId || undefined,
            userContext: getUserContext()
          }
        }
      )
    }
  }, [isLoading, sendMessage, storyId])

  const showWelcome = messages.length === 0 && !isLoadingStory
  
  // Auto-scroll when messages change
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b bg-white p-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-semibold">
              {storyContext ? 'Story Analysis' : 'Intelligence Chat'}
            </h1>
            {storyContext && (
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-xs">
                  {storyContext.source}
                </Badge>
                <p className="text-sm text-muted-foreground truncate">
                  {storyContext.title}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoadingStory && (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin mr-2" />
            <span>Loading story context...</span>
          </div>
        )}
        
        {showWelcome && (
          <div className="flex flex-col items-center justify-center text-center py-12">
            <Bot className="w-16 h-16 text-primary mb-4" />
            <h2 className="text-2xl font-bold mb-2">
              {storyContext ? 'Let\'s analyze this story!' : 'Intelligence Chat'}
            </h2>
            <p className="text-muted-foreground mb-8 max-w-md">
              {storyContext 
                ? 'I\'ll help you understand this story, why it matters, and key takeaways.'
                : 'Ask questions about the latest tech developments and get AI-powered insights from our knowledge base.'}
            </p>

            {!storyContext && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4">✨ Try asking about:</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-4xl">
                  {suggestions.map((s) => (
                    <Button
                      key={s}
                      variant="outline"
                      className="bg-white/80 justify-start text-left h-auto py-3 px-4"
                      onClick={() => handleSuggestionClick(s)}
                    >
                      {s}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            
            {storyContext && (
              <Button 
                onClick={() => handleSuggestionClick('Please analyze this story for me')}
                className="mb-4"
              >
                <Bot className="w-4 h-4 mr-2" />
                Analyze This Story
              </Button>
            )}
          </div>
        )}

        {messages
          .filter((message: any) => {
            // Extract text from parts array
            const messageText = message.parts?.[0]?.text || message.text || message.content || ''
            return messageText !== 'AUTO_ANALYZE'
          }) // Hide auto-analysis trigger messages
          .map((message: any, index: number) => {
            // Extract content from parts array
            const messageContent = message.parts?.map((part: any) => part.text).join('') || message.text || message.content || ''
            return (
          <div key={`${message.id}-${index}`} className="flex gap-3">
            <div className="flex-shrink-0">
              {message.role === 'user' ? (
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-4 h-4 text-primary" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-green-600" />
                </div>
              )}
            </div>
            <Card className="flex-1 max-w-3xl">
              <CardContent className="px-4 py-3">
                <div className="prose prose-sm max-w-none text-gray-800">
                  {formatMessageContent(messageContent)}
                </div>
              </CardContent>
            </Card>
          </div>
            )
        })}

        {isLoading && messages.filter((m: any) => {
          const messageText = m.parts?.[0]?.text || m.text || m.content || ''
          return messageText !== 'AUTO_ANALYZE'
        }).length === 0 && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
              <Bot className="w-4 h-4 text-green-600" />
            </div>
            <Card className="flex-1 max-w-3xl">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>NewsAgent is analyzing the story...</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t bg-white p-4">
        <form onSubmit={handleSubmit} className="relative max-w-4xl mx-auto">
          <Input
            value={input}
            onChange={handleInputChange}
            placeholder={storyContext 
              ? "Ask me anything about this story..." 
              : "Ask about the latest in AI, ML, data engineering, or any tech topic..."
            }
            className="bg-white h-12 pr-12"
            disabled={isLoading}
          />
          <Button 
            type="submit" 
            size="icon" 
            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
            disabled={isLoading || !input.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-full">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
        <span>Loading chat...</span>
      </div>
    }>
      <ChatPageContent />
    </Suspense>
  )
}
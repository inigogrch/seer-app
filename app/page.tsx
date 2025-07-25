"use client"

import type React from "react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  RefreshCw,
  Plus,
  BookOpen,
  Bot,
  TestTube,
  Building,
  BrainCircuit,
  MessageSquare,
  BarChart,
  Cpu,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabaseClient"

// Define the story interface based on Supabase schema
interface Story {
  id: string // UUID from database
  source_name: string
  sourceIcon?: React.ReactNode
  title: string
  content?: string // Optional for personalized stories that use summary
  tags: string[]
  published_at: string
  url: string
  image_url?: string
  time?: string // computed field for relative time
  // Personalization fields (when available)
  relevance_score?: number
  summary?: string
  explanation?: string // TODO: Will be used to pre-populate chat interface with relevance explanation
}

// User preferences interface
interface UserPreferences {
  role: string
  interests: string[]
  projects: string
  timestamp: string
}

// Helper function to convert published_at to relative time
const getRelativeTime = (publishedAt: string): string => {
  const now = new Date()
  const published = new Date(publishedAt)
  const diffInMs = now.getTime() - published.getTime()
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
  const diffInDays = Math.floor(diffInHours / 24)

  if (diffInDays > 0) {
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`
  } else if (diffInHours > 0) {
    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`
  } else {
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
    return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`
  }
}

// Helper function to get source icon based on source name
const getSourceIcon = (sourceName: string): React.ReactNode => {
  const name = sourceName.toLowerCase()
  if (name.includes('openai')) return <Bot className="w-4 h-4" />
  if (name.includes('google')) return <TestTube className="w-4 h-4" />
  if (name.includes('tesla')) return <Building className="w-4 h-4" />
  if (name.includes('meta')) return <BrainCircuit className="w-4 h-4" />
  if (name.includes('nvidia')) return <Cpu className="w-4 h-4" />
  return <Bot className="w-4 h-4" /> // default icon
}

const StoryCard = ({ story }: { story: Story }) => (
  <Card className="group relative w-[420px] flex-shrink-0 snap-start flex flex-col overflow-hidden transition-shadow duration-300 hover:shadow-xl p-4">
    <CardHeader className="flex items-center justify-between p-0 text-xs text-muted-foreground">
      <div className="flex items-center gap-2">
        {story.sourceIcon}
        <span>{story.source_name}</span>
        {story.relevance_score && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary">
            {story.relevance_score}% match
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span className="whitespace-nowrap">{story.time}</span>
      </div>
    </CardHeader>
    <CardContent className="p-0 flex-grow">
      <div className="h-[150px] mb-1 bg-gray-100 rounded-md flex items-center justify-center text-gray-400 -mt-2.5">
        Story Image
      </div>
      <h3 className="font-semibold text-xl leading-tight mb-1">{story.title}</h3>
      <p className="text-sm text-muted-foreground mb-1 line-clamp-3">
        {story.summary || story.content}
      </p>
      <div className="flex flex-wrap gap-1.5 min-h-[2.5rem] items-start content-start">
        {story.tags && story.tags.map((tag) => (
          <Badge key={tag} variant="secondary" className="text-[10px] px-2 py-0.5">
            {tag}
          </Badge>
        ))}
      </div>
    </CardContent>
    <CardFooter className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-sm opacity-0 transform translate-y-full group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 ease-in-out">
      <div className="flex w-full items-center gap-3 h-12">
        <Button asChild size="default" className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-medium h-12">
          <Link href={`/chat?storyId=${story.id}`}>
            <MessageSquare className="w-4 h-4 mr-2" />
            Chat
          </Link>
        </Button>
        <Button asChild size="default" className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-medium h-12">
          <Link href={story.url} target="_blank" rel="noopener noreferrer">
            <BookOpen className="w-4 h-4 mr-2" />
            Read
          </Link>
        </Button>
      </div>
    </CardFooter>
  </Card>
)

const StorySection = ({
  title,
  icon,
  stories,
  index,
  total,
  onMoveUp,
  onMoveDown,
  loading = false,
}: {
  title: string
  icon: React.ReactNode
  stories: Story[]
  index: number
  total: number
  onMoveUp: (index: number) => void
  onMoveDown: (index: number) => void
  loading?: boolean
}) => (
  <section className="mb-4">
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-xl font-bold flex items-center gap-2">
        {icon} {title}
      </h2>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={() => onMoveUp(index)} disabled={index === 0}>
          <ChevronUp className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onMoveDown(index)} disabled={index === total - 1}>
          <ChevronDown className="w-4 h-4" />
        </Button>
      </div>
    </div>
    <div className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory">
      {loading && stories.length === 0 ? (
        <div className="flex items-center justify-center w-full h-40 text-muted-foreground">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Loading stories...
          </div>
        </div>
      ) : stories.length === 0 ? (
        <div className="flex items-center justify-center w-full h-40 text-muted-foreground">
          No stories available in this section
        </div>
      ) : (
        stories.map((story) => (
          <StoryCard key={story.id} story={story} />
        ))
      )}
    </div>
  </section>
)

const initialSections = [
  { id: "top-picks", title: "Top Picks", icon: <Plus className="w-5 h-5" />, stories: [] as Story[] },
  {
    id: "software-eng",
    title: "Software Engineering",
    icon: <Bot className="w-5 h-5" />,
    stories: [] as Story[],
  },
  { id: "data-science", title: "Data Science", icon: <BarChart className="w-5 h-5" />, stories: [] as Story[] },
]

export default function FeedPage() {
  const [sections, setSections] = useState(initialSections)
  const [loading, setLoading] = useState(true)
  const [totalStories, setTotalStories] = useState(0)
  const [isPersonalized, setIsPersonalized] = useState(false)
  const [userPreferences, setUserPreferences] = useState<UserPreferences | null>(null)
  const [personalizationError, setPersonalizationError] = useState<string | null>(null)

  const fetchStories = async () => {
    try {
      setLoading(true)
      
      // Check for user preferences in localStorage
      const storedPrefs = localStorage.getItem('user_preferences')
      let userPrefs: UserPreferences | null = null
      
      if (storedPrefs) {
        try {
          userPrefs = JSON.parse(storedPrefs)
          setUserPreferences(userPrefs)
        } catch (e) {
          console.error('Failed to parse user preferences:', e)
        }
      }
      
      // If we have user preferences, fetch personalized feed
      if (userPrefs) {
        await fetchPersonalizedStories(userPrefs)
        return
      }
      
      // Otherwise, fetch regular feed
      const { error } = await supabase
        .from("stories")
        .select()
        .order("published_at", { ascending: false })
        .limit(50)

      if (error) {
        console.error("Error fetching stories:", error)
        return
      }

      // Fall back to regular feed
      await fetchRegularStories()
    } catch (error) {
      console.error("Error in fetchStories:", error)
    } finally {
      setLoading(false)
    }
  }
  
  const fetchPersonalizedStories = async (userPrefs: UserPreferences) => {
    try {
      const response = await fetch('/api/retrieve-feed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userPrefs)
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch personalized feed')
      }
      
      const result = await response.json()
      
      if (result.success && result.stories) {
        setIsPersonalized(true)
        const stories: Story[] = result.stories.map((story: Story) => ({
          ...story,
          sourceIcon: getSourceIcon(story.source_name || "")
        }))
        
        setTotalStories(stories.length)
        
        // Distribute 30 stories across 3 rows (10 stories each)
        const storiesPerRow = 10
        const row1Stories = stories.slice(0, storiesPerRow)
        const row2Stories = stories.slice(storiesPerRow, storiesPerRow * 2)
        const row3Stories = stories.slice(storiesPerRow * 2, storiesPerRow * 3)
        
        setSections([
          {
            id: "top-personalized",
            title: "Top Recommendations",
            icon: <Plus className="w-5 h-5" />,
            stories: row1Stories
          },
          {
            id: "relevant-picks",
            title: "Relevant to Your Work",
            icon: <Bot className="w-5 h-5" />,
            stories: row2Stories
          },
          {
            id: "trending-insights",
            title: "Trending in Your Field",
            icon: <BarChart className="w-5 h-5" />,
            stories: row3Stories
          }
        ])
      } else {
        console.error('Personalized feed API returned error:', result.error)
        // Fall back to regular feed
        await fetchRegularStories()
      }
    } catch (error) {
      console.error('Error fetching personalized stories:', error)
      setPersonalizationError(error instanceof Error ? error.message : 'Unknown error')
      
      // Fall back to regular feed after a brief delay
      setTimeout(async () => {
        console.log('Falling back to regular feed due to personalization error')
        await fetchRegularStories()
      }, 1000)
    }
  }
  
  const fetchRegularStories = async () => {
    const { data, error } = await supabase
      .from("stories")
      .select()
      .order("published_at", { ascending: false })
      .limit(50)

    if (error) {
      console.error("Error fetching stories:", error)
      return
    }

    if (!data || data.length === 0) {
      setTotalStories(0)
      return
    }

    const stories: Story[] = data.map((story) => ({
      id: story.id,
      source_name: story.source_name || story.author || "Unknown Source",
      sourceIcon: getSourceIcon(story.source_name || story.author || ""),
      title: story.title || "Untitled",
      content: story.content || "",
      tags: Array.isArray(story.tags) 
        ? story.tags 
        : typeof story.tags === 'string' 
          ? story.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean)
          : [],
      published_at: story.published_at,
      url: story.url || "#",
      image_url: story.image_url,
      time: getRelativeTime(story.published_at),
    }))

    setTotalStories(stories.length)
    
    setSections((prevSections) => {
      const newSections = [...prevSections]
      const usedStoryIds = new Set<string>()
      
      // Top Picks - first 15 stories
      const topPicks = stories.slice(0, 15)
      newSections[0].stories = topPicks
      topPicks.forEach(story => usedStoryIds.add(story.id))
      
      // Software Engineering stories - exclude already used stories
      const softwareStories = stories
        .filter(story => !usedStoryIds.has(story.id))
        .filter(story => 
          story.source_name.toLowerCase().includes('engineering') ||
          story.source_name.toLowerCase().includes('github') ||
          story.source_name.toLowerCase().includes('stack') ||
          story.tags.some(tag => tag.toLowerCase().includes('software') || 
                              tag.toLowerCase().includes('programming') ||
                              tag.toLowerCase().includes('development'))
        )
        .slice(0, 10)
      newSections[1].stories = softwareStories
      softwareStories.forEach(story => usedStoryIds.add(story.id))
      
      // Data Science stories - exclude already used stories
      const dataStories = stories
        .filter(story => !usedStoryIds.has(story.id))
        .filter(story => 
          story.tags.some(tag => tag.toLowerCase().includes('data') || 
                              tag.toLowerCase().includes('analytics') ||
                              tag.toLowerCase().includes('science') ||
                              tag.toLowerCase().includes('ml') ||
                              tag.toLowerCase().includes('ai'))
        )
        .slice(0, 10)
      newSections[2].stories = dataStories
      
      return newSections
    })
  }

  useEffect(() => {
    fetchStories()
    const interval = setInterval(fetchStories, 300000) // Fetch every 5 minutes
    return () => clearInterval(interval)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const moveSection = (index: number, direction: "up" | "down") => {
    const newSections = [...sections]
    const newIndex = direction === "up" ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= newSections.length) return

    const temp = newSections[index]
    newSections[index] = newSections[newIndex]
    newSections[newIndex] = temp

    setSections(newSections)
  }

  return (
    <div className="p-8">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">
            {isPersonalized ? "Your Personalized Feed" : "Latest Intelligence"}
          </h1>
          <p className="text-muted-foreground">
            {loading 
              ? "Loading stories..." 
              : personalizationError
                ? "Showing general feed due to personalization issue"
                : isPersonalized 
                  ? `${totalStories} stories personalized for your ${userPreferences?.role || 'role'} interests`
                  : `${totalStories} stories curated for you`
            }
          </p>
          {personalizationError && (
            <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> Unable to load personalized content. Showing general feed instead.
              </p>
            </div>
          )}
        </div>
        <Button variant="outline" onClick={fetchStories} disabled={loading}>
          <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
          Refresh
        </Button>
      </header>

      <div className="mb-6">
        <Input placeholder="Search intelligence..." className="bg-white" />
      </div>

      <div className="flex items-center gap-2 mb-8 flex-wrap">
        <Button variant="outline" className="bg-white">
          <SlidersHorizontal className="w-4 h-4 mr-2" />
          Filters
        </Button>
        {/* TODO: Populate filter dropdowns with data from an API, e.g., GET /api/filters */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="bg-white">
              All Categories <ChevronDown className="w-4 h-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Category 1</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="bg-white">
              All Impact <ChevronDown className="w-4 h-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Impact 1</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="bg-white">
              All Industries <ChevronDown className="w-4 h-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Industry 1</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="ghost">More Filters</Button>
      </div>

      {sections.map((section, index) => (
        <StorySection
          key={section.id}
          title={section.title}
          icon={section.icon}
          stories={section.stories}
          index={index}
          total={sections.length}
          onMoveUp={() => moveSection(index, "up")}
          onMoveDown={() => moveSection(index, "down")}
          loading={loading}
        />
      ))}
    </div>
  )
}

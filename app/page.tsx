"use client"

import type React from "react"
import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
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
      <div className="h-[150px] mb-1 bg-gray-100 rounded-md flex items-center justify-center -mt-2.5 overflow-hidden">
        {(() => {
          const sourceName = story.source_name.toLowerCase()
          if (sourceName.includes('arxiv')) {
            return (
              <Image 
                src="/arxiv_logo.jpg" 
                alt="arXiv" 
                width={150} 
                height={150} 
                className="w-full h-full object-contain p-4"
              />
            )
          }
          if (sourceName.includes('mit') && (sourceName.includes('data') || sourceName.includes('ai') || sourceName.includes('research'))) {
            return (
              <Image 
                src="/mit_tech_review.png" 
                alt="MIT News" 
                width={150} 
                height={150} 
                className="w-full h-full object-contain p-4"
              />
            )
          }
          if (sourceName.includes('google') && sourceName.includes('research')) {
            return (
              <Image 
                src="/google_research_logo.jpg" 
                alt="Google Research" 
                width={150} 
                height={150} 
                className="w-full h-full object-contain p-4"
              />
            )
          }
          if (sourceName.includes('aws') && (sourceName.includes('machine learning') || sourceName.includes('ml'))) {
            return (
              <Image 
                src="/aws_logo.png" 
                alt="AWS Machine Learning Blog" 
                width={150} 
                height={150} 
                className="w-full h-full object-contain p-4"
              />
            )
          }
          // Default placeholder for other sources
          return <span className="text-gray-400">Story Image</span>
        })()}
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
  <section className="mb-8">
    {/* Show title/controls for regular feed, dashed line for personalized feed */}
    {title ? (
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
    ) : (
      // Dashed line separator for personalized feed
      index > 0 && (
        <div className="mb-6 border-t border-dashed border-gray-300"></div>
      )
    )}
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
  { id: "public-row-1", title: "", icon: <></>, stories: [] as Story[] },
  { id: "public-row-2", title: "", icon: <></>, stories: [] as Story[] },
  { id: "public-row-3", title: "", icon: <></>, stories: [] as Story[] },
]

function FeedPageContent() {
  const [sections, setSections] = useState(initialSections)
  const [loading, setLoading] = useState(true)
  const [totalStories, setTotalStories] = useState(0)
  const [isPersonalized, setIsPersonalized] = useState(false)
  const [userPreferences, setUserPreferences] = useState<UserPreferences | null>(null)
  const [personalizationError, setPersonalizationError] = useState<string | null>(null)
  const [isPersonalizing, setIsPersonalizing] = useState(false)
  const searchParams = useSearchParams()

  const fetchStories = async (forceRefresh = false) => {
    try {
      setLoading(true)
      
      // Check if we're coming from personalization flow
      const isPersonalizingFromUrl = searchParams?.get('personalizing') === 'true'
      if (isPersonalizingFromUrl) {
        setIsPersonalizing(true)
        // Scroll to top so user can see the loading animation
        window.scrollTo({ top: 0, behavior: 'smooth' })
        // Clear the URL parameter
        window.history.replaceState({}, '', '/')
      }
      
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
      
      // If we have user preferences, check for cached stories first
      if (userPrefs) {
        // Check for cached personalized stories
        const cachedStories = localStorage.getItem('personalized_stories')
        const cacheTimestamp = localStorage.getItem('personalized_stories_timestamp')
        
        if (!forceRefresh && cachedStories && cacheTimestamp && !isPersonalizingFromUrl) {
          try {
            const stories = JSON.parse(cachedStories)
            const timestamp = parseInt(cacheTimestamp)
            const cacheAge = Date.now() - timestamp
            const cacheExpiryMs = 30 * 60 * 1000 // 30 minutes
            
            // Use cached stories if they're less than 30 minutes old
            if (cacheAge < cacheExpiryMs && stories.length > 0) {
              console.log('Using cached personalized stories')
              loadCachedPersonalizedStories(stories)
              return
            } else {
              console.log('Cached stories expired, fetching fresh ones')
            }
          } catch (e) {
            console.error('Failed to parse cached stories:', e)
          }
        }
        
        // Fetch fresh personalized stories
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
      setIsPersonalizing(false)
    }
  }
  
  const loadCachedPersonalizedStories = (cachedStories: Story[]) => {
    setIsPersonalized(true)
    setTotalStories(cachedStories.length)
    
    // Regenerate sourceIcon for cached stories (since React elements can't be cached)
    const storiesWithIcons = cachedStories.map(story => ({
      ...story,
      sourceIcon: getSourceIcon(story.source_name || "")
    }))
    
    // Distribute cached stories across 3 rows
    const storiesPerRow = Math.ceil(storiesWithIcons.length / 3)
    const row1Stories = storiesWithIcons.slice(0, storiesPerRow)
    const row2Stories = storiesWithIcons.slice(storiesPerRow, storiesPerRow * 2)
    const row3Stories = storiesWithIcons.slice(storiesPerRow * 2, storiesPerRow * 3)
    
    setSections([
      {
        id: "personalized-row-1",
        title: "",
        icon: <></>,
        stories: row1Stories
      },
      {
        id: "personalized-row-2", 
        title: "",
        icon: <></>,
        stories: row2Stories
      },
      {
        id: "personalized-row-3",
        title: "", 
        icon: <></>,
        stories: row3Stories
      }
    ])
  }
  
  const fetchPersonalizedStories = async (userPrefs: UserPreferences) => {
    try {
      setIsPersonalizing(true)
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
        
        // Deduplicate stories by ID to prevent duplicate keys
        const seenIds = new Set<string>()
        const uniqueStories: Story[] = result.stories
          .filter((story: Story) => {
            if (seenIds.has(story.id)) {
              console.warn(`Duplicate story found: ${story.id} - ${story.title}`)
              return false
            }
            seenIds.add(story.id)
            return true
          })
          .map((story: Story) => ({
            ...story,
            sourceIcon: getSourceIcon(story.source_name || "")
          }))
        
        // Cache the personalized stories in localStorage (exclude sourceIcon as it contains React elements)
        try {
          const storiesToCache = uniqueStories.map(story => {
            const { sourceIcon, ...storyWithoutIcon } = story
            return storyWithoutIcon
          })
          localStorage.setItem('personalized_stories', JSON.stringify(storiesToCache))
          localStorage.setItem('personalized_stories_timestamp', Date.now().toString())
          console.log('Cached personalized stories for future use')
        } catch (e) {
          console.error('Failed to cache personalized stories:', e)
        }
        
        setTotalStories(uniqueStories.length)
        
        // Distribute unique stories across 3 rows with no titles (personalized layout)
        const storiesPerRow = Math.ceil(uniqueStories.length / 3)
        const row1Stories = uniqueStories.slice(0, storiesPerRow)
        const row2Stories = uniqueStories.slice(storiesPerRow, storiesPerRow * 2)
        const row3Stories = uniqueStories.slice(storiesPerRow * 2, storiesPerRow * 3)
        
        setSections([
          {
            id: "personalized-row-1",
            title: "",
            icon: <></>,
            stories: row1Stories
          },
          {
            id: "personalized-row-2", 
            title: "",
            icon: <></>,
            stories: row2Stories
          },
          {
            id: "personalized-row-3",
            title: "", 
            icon: <></>,
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
    } finally {
      setIsPersonalizing(false)
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
      
      // Distribute all stories evenly across 3 rows, filling upper rows first
      const storiesPerRow = Math.ceil(stories.length / 3)
      const row1Stories = stories.slice(0, storiesPerRow)
      const row2Stories = stories.slice(storiesPerRow, storiesPerRow * 2)
      const row3Stories = stories.slice(storiesPerRow * 2, storiesPerRow * 3)
      
      newSections[0].stories = row1Stories
      newSections[1].stories = row2Stories
      newSections[2].stories = row3Stories
      
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
    <div className="p-8 relative min-h-screen">
      {/* Personalization Loading Overlay - Fixed to top of main content area */}
      {isPersonalizing && (
        <div className="absolute inset-x-0 top-0 h-screen bg-white/95 backdrop-blur-sm z-50">
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-md px-6 -mt-20">
              <div className="mb-8">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-full mb-6">
                  <RefreshCw className="w-10 h-10 text-primary animate-spin" />
                </div>
                <h2 className="text-3xl font-bold mb-4">Your personalized news agent is hard at work...</h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Analyzing your preferences, finding the most relevant stories, and ranking them just for you.
                </p>
              </div>
              <div className="flex items-center justify-center space-x-3">
                <div className="w-3 h-3 bg-primary rounded-full animate-pulse"></div>
                <div className="w-3 h-3 bg-primary rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                <div className="w-3 h-3 bg-primary rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
              </div>
            </div>
          </div>
        </div>
      )}
      
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
        <Button variant="outline" onClick={() => fetchStories(true)} disabled={loading}>
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

export default function FeedPage() {
  return (
    <Suspense fallback={<div className="p-8 flex items-center justify-center">
      <RefreshCw className="w-6 h-6 animate-spin mr-2" />
      Loading...
    </div>}>
      <FeedPageContent />
    </Suspense>
  )
}

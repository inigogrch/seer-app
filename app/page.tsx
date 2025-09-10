"use client"

import type React from "react"
import { useState, useEffect, useRef, Suspense } from "react"
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
  X,
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
  <Card className="group relative w-[420px] min-h-[380px] flex-shrink-0 snap-start flex flex-col overflow-hidden transition-all duration-300 ease-out hover:shadow-2xl hover:-translate-y-4 hover:scale-[1.02] p-4">
    <CardHeader className="flex items-center justify-between p-0 text-xs text-muted-foreground flex-shrink-0 mb-2">
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
    <CardContent className="p-0 flex-grow flex flex-col min-h-0">
      <div className="h-[150px] mb-3 bg-gray-100 rounded-md flex items-center justify-center overflow-hidden flex-shrink-0">
        {(() => {
          const sourceName = story.source_name.toLowerCase()
          
          // ArXiv (both Computer Science and Statistics)
          if (sourceName.includes('arxiv')) {
            return (
              <Image 
                src="/ArXiv_logo_2022.png" 
                alt="arXiv" 
                width={150} 
                height={150} 
                className="w-full h-full object-contain p-4"
              />
            )
          }
          
          // OpenAI News
          if (sourceName.includes('openai')) {
            return (
              <Image 
                src="/OpenAI_Logo.svg" 
                alt="OpenAI" 
                width={150} 
                height={150} 
                className="w-full h-full object-contain p-4"
              />
            )
          }
          
          // TLDR Tech Newsletter
          if (sourceName.includes('tldr')) {
            return (
              <Image 
                src="/tldr-logo-jpg.jpg" 
                alt="TLDR" 
                width={150} 
                height={150} 
                className="w-full h-full object-contain p-4"
              />
            )
          }
          
          // Anthropic News
          if (sourceName.includes('anthropic')) {
            return (
              <Image 
                src="/Anthropic_logo.svg" 
                alt="Anthropic" 
                width={150} 
                height={150} 
                className="w-full h-full object-contain p-4"
              />
            )
          }
          
          // MIT (AI News and Tech Review)
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
          
          // MIT Sloan Management Review
          if (sourceName.includes('mit') && sourceName.includes('sloan')) {
            return (
              <Image 
                src="/mit_sloan_review.png" 
                alt="MIT Sloan Management Review" 
                width={150} 
                height={150} 
                className="w-full h-full object-contain p-4"
              />
            )
          }
          
          // TechCrunch
          if (sourceName.includes('techcrunch')) {
            return (
              <Image 
                src="/techchrunch.svg" 
                alt="TechCrunch" 
                width={150} 
                height={150} 
                className="w-full h-full object-contain p-4"
              />
            )
          }
          
          // VentureBeat
          if (sourceName.includes('venturebeat')) {
            return (
              <Image 
                src="/VentureBeat_VB_Logo.png" 
                alt="VentureBeat" 
                width={150} 
                height={150} 
                className="w-full h-full object-contain p-4"
              />
            )
          }
          
          // Google Research Blog
          if (sourceName.includes('google') && sourceName.includes('research')) {
            return (
              <Image 
                src="/Google_2015_logo.svg.webp" 
                alt="Google Research" 
                width={1500} 
                height={1500} 
                className="w-full h-full object-contain p-4"
              />
            )
          }
          
          // AWS Machine Learning Blog
          if (sourceName.includes('aws') && (sourceName.includes('machine learning') || sourceName.includes('ml'))) {
            return (
              <Image 
                src="/Amazon_Web_Services_Logo.svg.webp" 
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
      <div className="flex flex-col flex-grow min-h-0">
        <h3 className="text-xl leading-tight mb-2" style={{fontWeight: 650}}>{story.title}</h3>
        <p className="text-sm text-muted-foreground mb-3 line-clamp-1 flex-grow">
          {story.summary || story.content}
        </p>
        <div className="flex flex-wrap gap-1.5 mt-auto pt-2">
          {story.tags && story.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-[10px] px-2 py-0.5">
              {tag}
            </Badge>
          ))}
        </div>
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
  isPersonalized = false,
}: {
  title: string
  icon: React.ReactNode
  stories: Story[]
  index: number
  total: number
  onMoveUp: (index: number) => void
  onMoveDown: (index: number) => void
  loading?: boolean
  isPersonalized?: boolean
}) => (
  <section className="mb-2 overflow-visible">
    {/* Show title/controls for regular feed, row titles for personalized feed */}
    {title ? (
      <div className="flex items-center mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2 flex-shrink-0">
          {icon} {title}
        </h2>
        {/* For personalized rows: show dashed line extending to the right */}
        {isPersonalized ? (
          <div className="flex-grow border-t border-dashed border-gray-300 ml-4"></div>
        ) : (
          // For regular feed: show move controls on the right
          <div className="flex items-center gap-1 ml-auto">
            <Button variant="ghost" size="icon" onClick={() => onMoveUp(index)} disabled={index === 0}>
              <ChevronUp className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onMoveDown(index)} disabled={index === total - 1}>
              <ChevronDown className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    ) : (
      // Fallback: dashed line separator if no title
      index > 0 && (
        <div className="mb-6 border-t border-dashed border-gray-300"></div>
      )
    )}
    <div className="flex gap-6 overflow-x-auto overflow-y-visible pb-8 snap-x snap-mandatory">
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
  const [isPersonalizationInProgress, setIsPersonalizationInProgress] = useState(false)
  const [lastPersonalizationHash, setLastPersonalizationHash] = useState<string | null>(null)
  const personalizationRequestRef = useRef<Promise<void> | null>(null)
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
      
      // If we have user preferences, ONLY use cached personalized stories
      if (userPrefs) {
        // Check for cached personalized stories
        const cachedStories = localStorage.getItem('personalized_stories')
        
        if (cachedStories && !isPersonalizingFromUrl) {
          try {
            const stories = JSON.parse(cachedStories)
            if (stories.length > 0) {
              console.log('Loading persistent personalized stories')
              loadCachedPersonalizedStories(stories)
              return
            }
          } catch (e) {
            console.error('Failed to parse cached stories:', e)
          }
        }
        
        // If personalizing from onboarding, run the agent
        if (isPersonalizingFromUrl) {
          await fetchPersonalizedStories(userPrefs)
          return
        }
        
        // Otherwise, fall back to general feed (no cached personalized stories found)
        console.log('No personalized stories found, showing general feed')
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
        title: "Top Picks for You 🔥",
        icon: <></>,
        stories: row1Stories
      },
      {
        id: "personalized-row-2", 
        title: "Actionable Highlights 📝",
        icon: <></>,
        stories: row2Stories
      },
      {
        id: "personalized-row-3",
        title: "More Sauce 🧪", 
        icon: <></>,
        stories: row3Stories
      }
    ])
  }
  
  const fetchPersonalizedStories = async (userPrefs: UserPreferences) => {
    // Create hash of user preferences to detect changes
    const prefsHash = JSON.stringify({
      role: userPrefs.role,
      interests: userPrefs.interests.sort(), // Sort for consistent hashing
      projects: userPrefs.projects
    })
    
    // Prevent duplicate requests using ref (synchronous check)
    if (personalizationRequestRef.current) {
      console.log('Personalization already in progress, skipping duplicate request')
      return personalizationRequestRef.current
    }
    
    // If same preferences as last successful personalization, use cache
    if (prefsHash === lastPersonalizationHash && !isPersonalizing) {
      console.log('Using cached personalized stories for same preferences')
      return
    }
    
    // Create the request promise and store it in ref
    const requestPromise = (async () => {
      try {
        setIsPersonalizationInProgress(true)
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
            title: "Top Picks for You 🔥",
            icon: <></>,
            stories: row1Stories
          },
          {
            id: "personalized-row-2", 
            title: "Actionable Highlights 📝",
            icon: <></>,
            stories: row2Stories
          },
          {
            id: "personalized-row-3",
            title: "More Sauce 🧪", 
            icon: <></>,
            stories: row3Stories
          }
        ])
        
        // Mark this personalization as successful
        setLastPersonalizationHash(prefsHash)
      } else {
        console.error('Personalized feed API returned error:', result.error)
        // Fall back to regular feed
        await fetchRegularStories()
      }
    } catch (error) {
      console.error('Error fetching personalized stories:', error)
      setPersonalizationError(error instanceof Error ? error.message : 'Unknown error')
      
      // Fall back to regular feed immediately (no race condition delay)
      console.log('Falling back to regular feed due to personalization error')
      await fetchRegularStories()
    } finally {
      setIsPersonalizing(false)
      setIsPersonalizationInProgress(false)
      personalizationRequestRef.current = null // Clear the ref
    }
    })()
    
    // Store the promise in ref and return it
    personalizationRequestRef.current = requestPromise
    return requestPromise
  }
  
  const clearUserPreferences = () => {
    // Clear all personalization data
    localStorage.removeItem('user_preferences')
    localStorage.removeItem('personalized_stories')
    localStorage.removeItem('personalized_stories_timestamp')
    
    // Reset state
    setUserPreferences(null)
    setIsPersonalized(false)
    setPersonalizationError(null)
    
    // Reset sections to initial state (removes personalized titles)
    setSections(initialSections)
    
    // Fetch general feed
    fetchStories()
    
    console.log('User preferences cleared, returned to general feed')
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
    const interval = setInterval(() => {
      // Don't auto-refresh if personalization is in progress
      if (!isPersonalizationInProgress) {
        fetchStories()
      }
    }, 300000) // Fetch every 5 minutes
    
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
      {/* Personalization Loading Overlay - Covers entire content area */}
      {isPersonalizing && (
        <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-[9999] min-h-screen">
          <div className="flex items-center justify-center h-screen sticky top-0">
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
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => fetchStories(true)} disabled={loading}>
            <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button 
            variant="outline" 
            onClick={clearUserPreferences} 
            disabled={!userPreferences}
            className={cn(
              "transition-colors",
              userPreferences 
                ? "text-red-600 hover:text-red-700 hover:bg-red-50" 
                : "text-gray-400"
            )}
          >
            <X className="w-4 h-4 mr-2" />
            Clear Preferences
          </Button>
        </div>
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
            <DropdownMenuItem>High Impact</DropdownMenuItem>
            <DropdownMenuItem>Medium Impact</DropdownMenuItem>
            <DropdownMenuItem>Low Impact</DropdownMenuItem>
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
          isPersonalized={isPersonalized}
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

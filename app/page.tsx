"use client"

import type React from "react"
import { useState } from "react"
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
import Image from "next/image"
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

// TODO: Replace with API call to fetch stories, e.g., GET /api/stories
const stories = [
  {
    id: 1,
    source: "OpenAI Blog",
    sourceIcon: <Bot className="w-4 h-4" />,
    relevance: 95,
    image: "/OpenAI_Logo.svg",
    title: "OpenAI Releases GPT-5: Revolutionary Breakthrough in AI",
    description:
      "OpenAI announces GPT-5 with unprecedented reasoning abilities, marking a new era for artificial intelligence. The model shows significant improvements in complex problem-solving and creative text generation.",
    tags: ["LLMs", "Machine Learning", "OpenAI", "Generative AI", "AGI", "Neural Networks", "Deep Learning", "AI Research"],
    time: "2 hours ago",
  },
  {
    id: 2,
    source: "Google Research",
    sourceIcon: <TestTube className="w-4 h-4" />,
    relevance: 88,
    image: "/placeholder.svg?width=400&height=150",
    title: "Google's Quantum Computer Achieves Major Milestone",
    description:
      "Google's quantum computing team demonstrates a significant breakthrough in quantum error correction, a critical step towards building a fault-tolerant quantum computer. This could accelerate drug discovery and materials science.",
    tags: ["Quantum Computing", "Google", "Research", "Physics", "Hardware", "Error Correction", "Quantum Algorithms", "Fault-Tolerant"],
    time: "4 hours ago",
  },
  {
    id: 3,
    source: "Tesla Engineering",
    sourceIcon: <Building className="w-4 h-4" />,
    relevance: 82,
    image: "/placeholder.svg?width=400&height=150",
    title: "Tesla's FSD v12 Shows 90% Improvement in Complex Urban Scenarios",
    description:
      "The latest Full Self-Driving update demonstrates significant improvement in navigating complex city environments, reducing disengagements by a large margin according to internal testing data.",
    tags: ["Autonomous Vehicles", "Tesla", "Computer Vision", "Robotics", "Self-Driving", "FSD", "Neural Networks", "Urban Navigation"],
    time: "6 hours ago",
  },
  {
    id: 4,
    source: "Meta AI Research",
    sourceIcon: <BrainCircuit className="w-4 h-4" />,
    relevance: 78,
    image: "/placeholder.svg?width=400&height=150",
    title: "Meta Introduces Advanced AR Glasses with Neural Interface",
    description:
      "Meta's new AR glasses prototype features a direct neural interface for seamless human-computer interaction, paving the way for a new generation of augmented reality experiences.",
    tags: ["AR/VR", "Neural Interface", "Meta", "Wearables", "HCI", "Brain-Computer", "Augmented Reality", "Mixed Reality", "Metaverse"],
    time: "8 hours ago",
  },
  {
    id: 5,
    source: "NVIDIA AI",
    sourceIcon: <Cpu className="w-4 h-4" />,
    relevance: 91,
    image: "/placeholder.svg?width=400&height=150",
    title: "NVIDIA Unveils Blackwell GPU Architecture for Trillion-Parameter AI",
    description:
      "The new Blackwell platform promises orders-of-magnitude performance gains for AI training and inference, making it possible to build and run even larger and more complex models efficiently.",
    tags: ["Hardware", "AI", "NVIDIA", "GPU", "Deep Learning", "Blackwell", "Training", "Inference", "High Performance", "Parallel Computing"],
    time: "1 day ago",
  },
]

const StoryCard = ({ story }: { story: (typeof stories)[0] }) => (
  <Card className="group relative w-[420px] flex-shrink-0 snap-start flex flex-col overflow-hidden transition-shadow duration-300 hover:shadow-xl p-4">
    <CardHeader className="flex items-center justify-between p-0 pb-2 text-xs text-muted-foreground">
      <div className="flex items-center gap-2">
        {story.sourceIcon}
        <span>{story.source}</span>
      </div>
      <div className="flex items-center gap-3">
        <Badge
          variant="outline"
          className={cn(
            "text-xs",
            story.relevance > 90
              ? "bg-red-100 text-red-800 border-red-200"
              : story.relevance > 85
                ? "bg-orange-100 text-orange-800 border-orange-200"
                : "bg-cyan-100 text-cyan-800 border-cyan-200",
          )}
        >
          {story.relevance}% relevance
        </Badge>
        <span className="whitespace-nowrap">{story.time}</span>
      </div>
    </CardHeader>
    <CardContent className="p-0 flex-grow">
      <Image
        src={story.image || "/placeholder.svg"}
        alt={story.title}
        width={400}
        height={150}
        className="rounded-md mb-1 aspect-[16/8] object-cover w-full"
      />
      <h3 className="font-semibold text-lg leading-tight mb-1">{story.title}</h3>
      <p className="text-sm text-muted-foreground mb-1 line-clamp-3">{story.description}</p>
      <div className="flex flex-wrap gap-1.5 min-h-[2.5rem] items-start content-start">
        {story.tags.map((tag) => (
          <Badge key={tag} variant="secondary" className="text-[10px] px-2 py-0.5">
            {tag}
          </Badge>
        ))}
      </div>
    </CardContent>
    <CardFooter className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-sm opacity-0 transform translate-y-full group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 ease-in-out">
      <div className="flex w-full items-center gap-3 h-12">
        <Button asChild size="default" className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-medium h-12">
          <Link href="/chat">
            {/* TODO: Update href to pass story context to chat, e.g., /chat?storyId=${story.id} */}
            <MessageSquare className="w-4 h-4 mr-2" />
            Chat
          </Link>
        </Button>
        <Button asChild size="default" className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-medium h-12">
          <Link href="#">
            {/* TODO: Update href to the actual story URL, e.g., story.url */}
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
}: {
  title: string
  icon: React.ReactNode
  stories: any[]
  index: number
  total: number
  onMoveUp: (index: number) => void
  onMoveDown: (index: number) => void
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
      {stories.map((story) => (
        <StoryCard key={story.id} story={story} />
      ))}
    </div>
  </section>
)

const initialSections = [
  { id: "top-picks", title: "Top Picks", icon: <Plus className="w-5 h-5" />, stories: stories },
  {
    id: "software-eng",
    title: "Software Engineering",
    icon: <Bot className="w-5 h-5" />,
    stories: [...stories].reverse(),
  },
  { id: "data-science", title: "Data Science", icon: <BarChart className="w-5 h-5" />, stories: stories.slice(1, 4) },
]

export default function FeedPage() {
  const [sections, setSections] = useState(initialSections)

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
          <h1 className="text-3xl font-bold">Latest Intelligence</h1>
          <p className="text-muted-foreground">32 stories curated for you</p>
        </div>
        <Button variant="outline" onClick={() => {}}>
          <RefreshCw className="w-4 h-4 mr-2" />
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
        />
      ))}
    </div>
  )
}

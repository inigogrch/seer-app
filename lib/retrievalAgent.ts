// RetrievalAgent: Personalized story ranking and retrieval system
import { embed, generateObject } from 'ai'
import { openai } from '@ai-sdk/openai'
import { supabase } from './supabaseClient'
import { DatabaseStory, UserPreferences } from './supabaseSchema'
import { z } from 'zod'

// Configuration constants - easily adjustable for future changes
const CONFIG = {
  EMBEDDING_MODEL: 'text-embedding-3-small',
  LLM_MODEL: 'gpt-4o-mini',
  MATCH_THRESHOLD: 0.4, // Balanced threshold for good matches
  TOP_K_CANDIDATES: 50, // Smaller pool for better latency
  MAX_PER_SOURCE: 5, // Maximum stories per source for diversity
  FINAL_RESULTS_LIMIT: 30, // Final results for 3-row grid layout
  FRESHNESS_DECAY_DAYS: 14, // Days for freshness bias calculation
  BLOCKLISTED_SOURCES: [] as string[], // Source names to exclude
  // Relative scoring range after LLM reranking
  RELATIVE_SCORE_MIN: 70, // Minimum relative score
  RELATIVE_SCORE_MAX: 100, // Maximum relative score
}

// Enhanced Story interface with personalization fields
export interface PersonalizedStory extends Omit<DatabaseStory, 'embedding'> {
  relevance_score: number
  summary: string
  explanation: string
  time?: string // Relative time string for UI
}

// LLM response schema for structured output
const StoryRankingSchema = z.object({
  rankings: z.array(z.object({
    story_id: z.string(),
    relevance_score: z.number().min(0).max(100),
    summary: z.string().describe('Up to 3 concise sentences summarizing the story\'s relevance'),
    explanation: z.string().describe('2-3 sentences justifying the relevance score'),
  }))
})

/**
 * Generate embedding vector for user preferences
 */
export async function generateUserEmbedding(userPrefs: UserPreferences): Promise<number[]> {
  try {
    // Combine user preferences into a rich text representation
    const preferencesText = [
      `Professional role: ${userPrefs.role}`,
      `Key interests and technologies: ${userPrefs.interests.join(', ')}`,
      `Current projects and priorities: ${userPrefs.projects}`
    ].join('. ')

    console.log('Generating embedding for preferences:', preferencesText.substring(0, 200))

    const { embedding } = await embed({
      model: openai.embedding(CONFIG.EMBEDDING_MODEL),
      value: preferencesText,
    })

    return embedding
  } catch (error) {
    console.error('Error generating user embedding:', error)
    throw new Error('Failed to generate user embedding')
  }
}

/**
 * Retrieve candidate stories using Supabase hybrid search function
 */
export async function retrieveCandidateStories(
  userEmbedding: number[],
  limit: number = CONFIG.TOP_K_CANDIDATES
): Promise<DatabaseStory[]> {
  try {
    const { data, error } = await supabase.rpc('hybrid_story_search', {
      query_embedding: userEmbedding,
      match_threshold: CONFIG.MATCH_THRESHOLD,
      match_count: limit,
    })

    if (error) {
      console.error('Hybrid search error:', error)
      throw error
    }

    console.log(`Retrieved ${data?.length || 0} candidate stories from hybrid search`)
    return data || []
  } catch (error) {
    console.error('Candidate retrieval failed:', error)
    throw new Error('Failed to retrieve candidate stories')
  }
}

/**
 * Apply business logic constraints: source limits, deduplication, freshness bias
 */
export function applyBusinessConstraints(stories: DatabaseStory[]): DatabaseStory[] {
  const seenIds = new Set<string>()
  const seenTitles = new Set<string>()
  const sourceCount = new Map<string, number>()
  const now = new Date()
  
  // Filter and deduplicate
  const filteredStories = stories.filter(story => {
    // Deduplication by ID first (most important)
    if (seenIds.has(story.id)) {
      console.warn(`Duplicate story ID filtered: ${story.id}`)
      return false
    }
    seenIds.add(story.id)
    
    // Deduplication by normalized title (catch similar stories)
    const normalizedTitle = story.title.toLowerCase().trim()
    if (seenTitles.has(normalizedTitle)) {
      return false
    }
    seenTitles.add(normalizedTitle)

    // Source diversity limits
    const sourceName = story.source_name || 'unknown'
    const currentCount = sourceCount.get(sourceName) || 0
    if (currentCount >= CONFIG.MAX_PER_SOURCE) {
      return false
    }
    sourceCount.set(sourceName, currentCount + 1)

    // Blocklist filtering
    if (CONFIG.BLOCKLISTED_SOURCES.includes(sourceName.toLowerCase())) {
      return false
    }

    return true
  })

  // Apply freshness bias - balance recency with vector similarity
  return filteredStories.sort((a, b) => {
    const aDate = new Date(a.published_at)
    const bDate = new Date(b.published_at)
    
    // Freshness score (0-1, where 1 is most recent)
    const aFreshness = Math.max(0, 1 - (now.getTime() - aDate.getTime()) / (CONFIG.FRESHNESS_DECAY_DAYS * 24 * 60 * 60 * 1000))
    const bFreshness = Math.max(0, 1 - (now.getTime() - bDate.getTime()) / (CONFIG.FRESHNESS_DECAY_DAYS * 24 * 60 * 60 * 1000))
    
    // Prefer fresher content with moderate bias
    return (bFreshness - aFreshness) * 0.3 // 30% weight to freshness, 70% to vector similarity
  })
}

/**
 * Use LLM to rerank and annotate stories with structured output
 */
export async function rerank(
  userPrefs: UserPreferences,
  stories: DatabaseStory[]
): Promise<{ story: DatabaseStory; relevance_score: number; summary: string; explanation: string }[]> {
  try {
    // Prepare stories context for LLM
    const storiesContext = stories.map((story, index) => 
      `Story ${index + 1} (ID: ${story.id}):
Title: ${story.title}
Content: ${(story.content || '').substring(0, 400)}...
Tags: ${story.tags.join(', ')}
Source: ${story.source_name}
Published: ${new Date(story.published_at).toLocaleDateString()}`
    ).join('\n\n')

    const prompt = `You are a personal news assistant. Analyze the following stories for a ${userPrefs.role} with these preferences:

INTERESTS: ${userPrefs.interests.join(', ')}
CURRENT PROJECTS: ${userPrefs.projects}

For each relevant story, provide:
1. relevance_score (0-100): How well this story matches their interests, role, and projects
2. summary (up to 3 sentences): Concise explanation of the story's relevance and key insights
3. explanation (2-3 sentences): Detailed justification for the relevance score

Prioritize stories that:
- Directly relate to their stated interests and current projects
- Provide actionable insights for their professional role
- Offer new developments, tools, or techniques in their field
- Could impact their current work or career development

Rank ALL provided stories by relevance. We will select the top 30 for the final feed.

STORIES:
${storiesContext}`

    console.log('Sending stories to LLM for reranking...')

    const { object } = await generateObject({
      model: openai(CONFIG.LLM_MODEL),
      schema: StoryRankingSchema,
      prompt,
      temperature: 0.1, // Low temperature for consistent rankings
    })
    
    // LOG: Raw LLM reasoning output for debugging
    console.log('=== LLM REASONING OUTPUT ===')
    object.rankings.slice(0, 5).forEach((ranking, i) => {
      console.log(`${i + 1}. Story: ${ranking.story_id}`)
      console.log(`   Score: ${ranking.relevance_score}`)
      console.log(`   Summary: ${ranking.summary}`)
      console.log(`   Explanation: ${ranking.explanation}`)
      console.log('---')
    })
    console.log('=== END LLM OUTPUT ===')

    // Map rankings back to stories
    const storyMap = new Map(stories.map(s => [s.id, s]))
    
    // Process all LLM rankings and ensure uniqueness
    const seenStoryIds = new Set<string>()
    const llmRankedResults = object.rankings
      .map(ranking => {
        const story = storyMap.get(ranking.story_id)
        if (!story) {
          console.warn(`Story not found for ID: ${ranking.story_id}`)
          return null
        }
        
        // Check for duplicates
        if (seenStoryIds.has(story.id)) {
          console.warn(`Duplicate story in LLM rankings: ${story.id}`)
          return null
        }
        seenStoryIds.add(story.id)
        
        return {
          story,
          original_relevance_score: ranking.relevance_score, // Keep original for reference
          summary: ranking.summary,
          explanation: ranking.explanation,
        }
      })
      .filter(Boolean) // Remove null entries
      .sort((a, b) => b!.original_relevance_score - a!.original_relevance_score) // Sort by LLM relevance
      .slice(0, CONFIG.FINAL_RESULTS_LIMIT) // Take top 30
    
    // Apply relative scoring: map positions 0-29 to scores between RELATIVE_SCORE_MAX and RELATIVE_SCORE_MIN
    const rankedResults = llmRankedResults.map((result, index) => {
      // Calculate relative score: best story gets max score, worst gets min score
      // Use a slight curve to make top stories more distinct
      const position = index / (CONFIG.FINAL_RESULTS_LIMIT - 1) // 0 to 1
      const curvedPosition = Math.pow(position, 0.8) // Slight curve favoring top stories
      const relativeScore = Math.round(
        CONFIG.RELATIVE_SCORE_MAX - (curvedPosition * (CONFIG.RELATIVE_SCORE_MAX - CONFIG.RELATIVE_SCORE_MIN))
      )
      
      return {
        story: result!.story,
        relevance_score: relativeScore,
        summary: result!.summary,
        explanation: result!.explanation,
      }
    })

    console.log(`Applied relative scoring to ${rankedResults.length} stories (${CONFIG.RELATIVE_SCORE_MIN}-${CONFIG.RELATIVE_SCORE_MAX})`)
    return rankedResults as { story: DatabaseStory; relevance_score: number; summary: string; explanation: string }[]
    
  } catch (error) {
    console.error('LLM reranking failed:', error)
    
    // Fallback: return exactly 30 stories with relative scoring
    console.log('Using fallback ranking due to LLM failure')
    const fallbackStories = stories.slice(0, CONFIG.FINAL_RESULTS_LIMIT)
    return fallbackStories.map((story, index) => {
      // Apply same relative scoring logic as successful LLM path
      const position = index / (CONFIG.FINAL_RESULTS_LIMIT - 1)
      const curvedPosition = Math.pow(position, 0.8)
      const relativeScore = Math.round(
        CONFIG.RELATIVE_SCORE_MAX - (curvedPosition * (CONFIG.RELATIVE_SCORE_MAX - CONFIG.RELATIVE_SCORE_MIN))
      )
      
      return {
        story,
        relevance_score: relativeScore,
        summary: 'This story appears relevant to your interests based on semantic similarity.',
        explanation: 'Story was selected using semantic search but could not be analyzed in detail due to processing limitations.',
      }
    })
  }
}

/**
 * Main retrieval agent function - orchestrates the entire pipeline
 */
export async function retrievePersonalizedStories(
  userPrefs: UserPreferences
): Promise<PersonalizedStory[]> {
  try {
    console.log(`Starting personalized retrieval for ${userPrefs.role}:`, {
      interests: userPrefs.interests.length,
      projectsLength: userPrefs.projects.length
    })
    
    // Step 1: Generate user embedding
    const userEmbedding = await generateUserEmbedding(userPrefs)
    
    // Step 2: Retrieve candidate stories using hybrid search
    const candidateStories = await retrieveCandidateStories(userEmbedding)
    
    if (candidateStories.length === 0) {
      console.warn('No candidate stories found, returning empty results')
      return []
    }
    
    // Step 3: Apply business constraints
    const constrainedStories = applyBusinessConstraints(candidateStories)
    console.log(`Applied constraints: ${constrainedStories.length} stories remain`)
    
    // Step 4: LLM reranking and annotation
    const rankedResults = await rerank(userPrefs, constrainedStories)
    
    // Step 5: Transform to PersonalizedStory format
    const personalizedStories: PersonalizedStory[] = rankedResults.map(result => {
      const { story, relevance_score, summary, explanation } = result
      
      return {
        ...story,
        relevance_score,
        summary,
        explanation,
        time: getRelativeTime(story.published_at),
      }
    })
    
    console.log(`Retrieval complete: ${personalizedStories.length} personalized stories`)
    return personalizedStories
    
  } catch (error) {
    console.error('RetrievalAgent pipeline failed:', error)
    throw new Error(`Failed to retrieve personalized stories: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Helper function to convert timestamp to relative time
 */
function getRelativeTime(publishedAt: string): string {
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
    return `${Math.max(1, diffInMinutes)} minute${diffInMinutes !== 1 ? 's' : ''} ago`
  }
}

// Export configuration for easy adjustment
export { CONFIG as RetrievalConfig }
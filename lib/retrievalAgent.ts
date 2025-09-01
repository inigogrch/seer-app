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
  TOP_K_CANDIDATES: 30, // Pool for LLM filtering - reduced for better latency
  MAX_PER_SOURCE: 3, // Maximum stories per source for diversity - reduced for faster processing
  FINAL_RESULTS_LIMIT: 30, // Final results for 3-row grid layout
  FRESHNESS_DECAY_DAYS: 14, // Days for freshness bias calculation
  BLOCKLISTED_SOURCES: [] as string[], // Source names to exclude
  // Simplified LLM-only scoring - clean and non-redundant
  RECENCY_BOOST_POINTS: 5, // 0-5 points for slight recency preference
  // LLM handles all relevance scoring (0-100), recency adds small boost
  LLM_FILTER_TOP_K: 30, // Top stories to keep after LLM filtering - aligned with candidates
}

// Enhanced Story interface with personalization fields
export interface PersonalizedStory extends Omit<DatabaseStory, 'embedding'> {
  relevance_score: number
  time?: string // Relative time string for UI
}

// LLM response schema for relevance filtering
const StoryRelevanceSchema = z.object({
  rankings: z.array(z.object({
    story_id: z.string(),
    relevance_score: z.number().min(0).max(100),
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
      model: openai.textEmbeddingModel(CONFIG.EMBEDDING_MODEL),
      value: preferencesText,
    })

    return embedding
  } catch (error) {
    console.error('Error generating user embedding:', error)
    throw new Error('Failed to generate user embedding')
  }
}

/**
 * Retrieve candidate stories using Supabase hybrid search function and calculate similarity scores
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

    // Calculate similarity scores for each story
    const stories = (data || []) as DatabaseStory[]
    console.log(`Processing ${stories.length} stories for similarity calculation`)
    
    const storiesWithSimilarity = stories.map((story: DatabaseStory, index: number) => {
      if (!story.embedding) {
        return { ...story, similarity_score: 0 }
      }
      
      // Parse embedding if it's a string (common with Supabase vector data)
      let storyEmbedding: number[]
      if (typeof story.embedding === 'string') {
        try {
          // Remove brackets and split by comma, then parse as numbers
          const embeddingStr = story.embedding.replace(/[\[\]]/g, '')
          storyEmbedding = embeddingStr.split(',').map(val => parseFloat(val.trim()))
          // Parsed successfully
        } catch (e) {
          console.error(`Failed to parse embedding string for story ${index}:`, e)
          return { ...story, similarity_score: 0 }
        }
      } else if (Array.isArray(story.embedding)) {
        storyEmbedding = story.embedding
        // Array embedding found
      } else {
        console.warn(`Story has unknown embedding type: ${typeof story.embedding}`)
        return { ...story, similarity_score: 0 }
      }
      
      // Validate embedding array
      if (!Array.isArray(storyEmbedding) || storyEmbedding.length === 0 || storyEmbedding.some(isNaN)) {
        return { ...story, similarity_score: 0 }
      }
      
      // Calculate cosine similarity from embeddings
      const similarity = calculateCosineSimilarity(userEmbedding, storyEmbedding)
      
      return {
        ...story,
        similarity_score: Math.max(0, Math.min(1, similarity)) // Clamp to [0,1]
      }
    })

    console.log(`Retrieved ${storiesWithSimilarity.length} candidate stories with similarity scores`)
    return storiesWithSimilarity
  } catch (error) {
    console.error('Candidate retrieval failed:', error)
    throw new Error('Failed to retrieve candidate stories')
  }
}

/**
 * Calculate cosine similarity between two vectors
 */
function calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    console.warn(`Vector dimensions mismatch: ${vecA.length} vs ${vecB.length}`)
    return 0
  }

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i]
    normA += vecA[i] * vecA[i]
    normB += vecB[i] * vecB[i]
  }

  normA = Math.sqrt(normA)
  normB = Math.sqrt(normB)

  // Cosine similarity calculation

  if (normA === 0 || normB === 0) {
    console.warn('One of the vectors has zero norm')
    return 0
  }

  const similarity = dotProduct / (normA * normB)
  return similarity
}

/**
 * LLM-based relevance filtering - Stage 2 of hybrid pipeline
 */
export async function filterByLLMRelevance(
  userPrefs: UserPreferences,
  stories: DatabaseStory[]
): Promise<DatabaseStory[]> {
  try {
    // Prepare stories context for LLM evaluation
    const storiesContext = stories.map((story, index) => 
      `Story ${index + 1} (ID: ${story.id}):
Title: ${story.title}
Content: ${(story.content || '').substring(0, 300)}...
Tags: ${story.tags.join(', ')}
Source: ${story.source_name}
Published: ${new Date(story.published_at).toLocaleDateString()}`
    ).join('\n\n')

    const prompt = `You are a personal news assistant. Evaluate these ${stories.length} stories for a ${userPrefs.role} with these preferences:

INTERESTS: ${userPrefs.interests.join(', ')}
CURRENT PROJECTS: ${userPrefs.projects}

For each story, provide ONLY a relevance_score (0-100) based on how well it matches their interests, role, and projects.

Score highly (70-100) stories that:
- Directly relate to their stated interests and current projects
- Provide actionable insights for their professional role
- Offer new developments, tools, or techniques in their field
- Could impact their current work or career development

Score moderately (30-69) stories that are somewhat related but not central to their interests.
Score low (0-29) stories that are not relevant to their profile.

Evaluate ALL ${stories.length} stories and return scores for each.

STORIES:
${storiesContext}`

    console.log(`Sending ${stories.length} stories to LLM for relevance filtering...`)

    const { object } = await generateObject({
      model: openai(CONFIG.LLM_MODEL),
      schema: StoryRelevanceSchema,
      prompt,
      temperature: 0.1,
    })
    
    // Map LLM scores back to stories and sort by relevance
    const storyMap = new Map(stories.map(s => [s.id, s]))
    const scoredStories = object.rankings
      .map(ranking => ({
        story: storyMap.get(ranking.story_id),
        llm_relevance_score: ranking.relevance_score
      }))
      .filter(item => item.story) // Remove stories not found
      .sort((a, b) => b.llm_relevance_score - a.llm_relevance_score) // Sort by LLM score
      .slice(0, CONFIG.LLM_FILTER_TOP_K) // Take top 50
    
    // Add LLM relevance score to story objects
    const filteredStories = scoredStories.map(item => ({
      ...item.story!,
      llm_relevance_score: item.llm_relevance_score
    }))

    console.log(`LLM filtered ${stories.length} stories down to ${filteredStories.length} most relevant`)
    console.log(`Top 3 LLM scores: ${scoredStories.slice(0, 3).map(s => s.llm_relevance_score).join(', ')}`)
    
    return filteredStories
    
  } catch (error) {
    console.error('LLM relevance filtering failed:', error)
    // Fallback: return top stories based on similarity scores
    console.log('Using similarity fallback for relevance filtering')
    return stories
      .sort((a, b) => (b.similarity_score || 0) - (a.similarity_score || 0))
      .slice(0, CONFIG.LLM_FILTER_TOP_K)
      .map(story => ({ ...story, llm_relevance_score: 50 })) // Default score
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

interface ScoredStory {
  story: DatabaseStory
  relevance_score: number
  debug_scores: {
    llmRelevance: number
    similarity: number
    freshness: number
    tagRelevance: number
    contentRelevance: number
  }
}

/**
 * Calculate clean relevance scores using LLM intelligence + minimal recency boost
 */
export function calculateRelevanceScores(
  userPrefs: UserPreferences,
  stories: DatabaseStory[]
): { story: DatabaseStory; relevance_score: number }[] {
  const now = new Date()
  
  const scoredStories: ScoredStory[] = stories.map((story: DatabaseStory) => {
    // Primary score: LLM relevance (0-100) - handles all user preference matching
    const llmScore = story.llm_relevance_score || 50
    
    // Small recency boost (0-5 points) - slight preference for fresh content
    const publishedDate = new Date(story.published_at)
    const ageInDays = (now.getTime() - publishedDate.getTime()) / (1000 * 60 * 60 * 24)
    const recencyBoost = Math.round(
      Math.max(0, (1 - (ageInDays / CONFIG.FRESHNESS_DECAY_DAYS)) * CONFIG.RECENCY_BOOST_POINTS)
    )
    
    // Final score: LLM score + small recency boost (max 105, but clamp to 100)
    const finalScore = Math.max(1, Math.min(100, llmScore + recencyBoost))
    
    return {
      story,
      relevance_score: finalScore,
      debug_scores: {
        llmRelevance: llmScore / 100,
        similarity: story.similarity_score || 0, // keep for debugging
        freshness: recencyBoost / CONFIG.RECENCY_BOOST_POINTS,
        tagRelevance: 0, // removed - redundant with LLM
        contentRelevance: 0, // removed - redundant with LLM
      }
    }
  })
  
  // Sort by relevance score and take top results
  const sortedStories = scoredStories
    .sort((a, b) => b.relevance_score - a.relevance_score)
    .slice(0, CONFIG.FINAL_RESULTS_LIMIT)
  
  // Log top scoring stories with clean LLM-based breakdown
  console.log('=== TOP RELEVANCE SCORES (LLM-Based) ===')
  sortedStories.slice(0, 5).forEach((item, i) => {
    const llmScore = Math.round(item.debug_scores.llmRelevance * 100)
    const recencyBoost = Math.round(item.debug_scores.freshness * CONFIG.RECENCY_BOOST_POINTS)
    
    console.log(`${i + 1}. ${item.story.title.substring(0, 60)}...`)
    console.log(`   Final Score: ${item.relevance_score}/100`)
    console.log(`   Breakdown: LLM=${llmScore}/100, Recency Boost=+${recencyBoost}`)
    console.log('---')
  })
  console.log('=== END RELEVANCE SCORES ===')
  
  return sortedStories.map(({ story, relevance_score }) => ({ story, relevance_score }))
}

// LEGACY: LLM-based reranking (kept for optional future use)
// This function is no longer used in the main pipeline but kept as a fallback option
/*
export async function legacyLLMRerank(
  userPrefs: UserPreferences,
  stories: DatabaseStory[]
): Promise<{ story: DatabaseStory; relevance_score: number }[]> {
  // ... (LLM reranking implementation) ...
  // Note: This approach was replaced with calculateRelevanceScores for better performance
  // and more transparent, configurable scoring logic
}
*/

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
    
    // Step 3: LLM relevance filtering (100 -> 50 stories)
    const llmFilteredStories = await filterByLLMRelevance(userPrefs, candidateStories)
    
    // Step 4: Apply business constraints
    const constrainedStories = applyBusinessConstraints(llmFilteredStories)
    console.log(`Applied constraints: ${constrainedStories.length} stories remain`)
    
    // Step 5: Calculate hybrid relevance scores (LLM + heuristics)
    const rankedResults = calculateRelevanceScores(userPrefs, constrainedStories)
    
    // Step 6: Transform to PersonalizedStory format
    const personalizedStories: PersonalizedStory[] = rankedResults.map(result => {
      const { story, relevance_score } = result
      
      return {
        ...story,
        relevance_score,
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
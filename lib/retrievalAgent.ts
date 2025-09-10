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
  TOP_K_CANDIDATES: 35, // Optimized for fast retrieval and ranking
  FINAL_RESULTS_LIMIT: 30, // Final results for 3-row grid layout
  FRESHNESS_DECAY_DAYS: 14, // Days for freshness bias calculation
  RECENCY_BOOST_POINTS: 5, // 0-5 points for slight recency preference
  LLM_BATCH_SIZE: 15, // Process stories in smaller batches to avoid timeouts
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
 * Includes retry logic for timeout issues
 */
export async function retrieveCandidateStories(
  userEmbedding: number[],
  limit: number = CONFIG.TOP_K_CANDIDATES
): Promise<DatabaseStory[]> {
  const MAX_RETRIES = 2
  let lastError: any = null
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`Hybrid search attempt ${attempt}/${MAX_RETRIES}`)
      
      const { data, error } = await supabase.rpc('hybrid_story_search', {
        query_embedding: userEmbedding,
        match_threshold: CONFIG.MATCH_THRESHOLD,
        match_count: limit * 2, // Get more candidates to filter by threshold
      })

      if (error) {
        console.error(`Hybrid search error on attempt ${attempt}:`, error)
        lastError = error
        
        // If it's a timeout error and we have retries left, continue
        if (error.code === '57014' && attempt < MAX_RETRIES) {
          console.log(`Retrying due to timeout...`)
          await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1 second before retry
          continue
        }
        
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
      }).filter(story => story.similarity_score >= CONFIG.MATCH_THRESHOLD) // Apply threshold filter
       .slice(0, limit) // Take only the requested amount

      console.log(`Retrieved ${storiesWithSimilarity.length} candidate stories with similarity scores on attempt ${attempt}`)
      return storiesWithSimilarity
      
    } catch (error) {
      console.error(`Candidate retrieval failed on attempt ${attempt}:`, error)
      lastError = error
      
      // If this is the last attempt, don't continue the loop
      if (attempt >= MAX_RETRIES) {
        break
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }
  
  // If we get here, all retries failed
  console.error('All hybrid search attempts failed:', lastError)
  throw new Error('Failed to retrieve candidate stories after retries')
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
 * Process a batch of stories for LLM relevance scoring
 */
async function processBatch(
  userPrefs: UserPreferences,
  batch: DatabaseStory[],
  batchIndex: number
): Promise<{ story_id: string; relevance_score: number }[]> {
  const storiesContext = batch.map((story, index) => 
    `Story ${index + 1} (ID: ${story.id}):
Title: ${story.title}
Content: ${(story.content || '').substring(0, 300)}...
Tags: ${story.tags.join(', ')}
Source: ${story.source_name}
Published: ${new Date(story.published_at).toLocaleDateString()}`
  ).join('\n\n')

  const prompt = `You are a personal news assistant. Evaluate these ${batch.length} stories for a ${userPrefs.role} with these preferences:

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

Evaluate ALL ${batch.length} stories and return scores for each.

STORIES:
${storiesContext}`

  console.log(`Processing batch ${batchIndex + 1} with ${batch.length} stories...`)

  const { object } = await generateObject({
    model: openai(CONFIG.LLM_MODEL),
    schema: StoryRelevanceSchema,
    prompt,
    temperature: 0.1,
  })

  return object.rankings
}

/**
 * Calculate clean relevance scores using LLM intelligence + minimal recency boost
 */
export async function calculateRelevanceScores(
  userPrefs: UserPreferences,
  stories: DatabaseStory[]
): Promise<{ story: DatabaseStory; relevance_score: number }[]> {
  try {
    // Step 1: Process stories in batches to avoid timeout issues
    const batches = []
    for (let i = 0; i < stories.length; i += CONFIG.LLM_BATCH_SIZE) {
      batches.push(stories.slice(i, i + CONFIG.LLM_BATCH_SIZE))
    }

    console.log(`Processing ${stories.length} stories in ${batches.length} batches of ${CONFIG.LLM_BATCH_SIZE}...`)
    
    // Process all batches in parallel with error handling for individual batches
    const batchPromises = batches.map(async (batch, index) => {
      try {
        return await processBatch(userPrefs, batch, index)
      } catch (error) {
        console.error(`Batch ${index + 1} failed:`, error)
        // Return empty rankings for failed batch
        return []
      }
    })
    
    const batchResults = await Promise.all(batchPromises)
    
    // Combine all batch results (filtering out empty results from failed batches)
    const allRankings = batchResults.flat().filter(ranking => ranking.story_id)
    
    // Step 2: Map LLM scores to stories and apply recency boost
    const now = new Date()
    const storyMap = new Map(stories.map(s => [s.id, s]))
    
    const scoredStories: ScoredStory[] = allRankings
      .map(ranking => {
        const story = storyMap.get(ranking.story_id)
        if (!story) return null
        
        const llmScore = ranking.relevance_score
        
        // Small recency boost (0-5 points)
        const publishedDate = new Date(story.published_at)
        const ageInDays = (now.getTime() - publishedDate.getTime()) / (1000 * 60 * 60 * 24)
        const recencyBoost = Math.round(
          Math.max(0, (1 - (ageInDays / CONFIG.FRESHNESS_DECAY_DAYS)) * CONFIG.RECENCY_BOOST_POINTS)
        )
        
        const finalScore = Math.max(1, Math.min(100, llmScore + recencyBoost))
        
        return {
          story,
          relevance_score: finalScore,
          debug_scores: {
            llmRelevance: llmScore / 100,
            similarity: story.similarity_score || 0,
            freshness: recencyBoost / CONFIG.RECENCY_BOOST_POINTS,
            tagRelevance: 0,
            contentRelevance: 0,
          }
        }
      })
      .filter(item => item !== null) as ScoredStory[]

    // Step 3: Sort by relevance score with deterministic tie-breaking
    const sortedStories = scoredStories
      .sort((a, b) => {
        const scoreDiff = b.relevance_score - a.relevance_score
        return scoreDiff !== 0 ? scoreDiff : a.story.id.localeCompare(b.story.id)
      })
      .slice(0, CONFIG.FINAL_RESULTS_LIMIT)

    // Log results
    console.log('=== TOP RELEVANCE SCORES (LLM Personalized) ===')
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
    
  } catch (error) {
    console.error('LLM personalization failed, using similarity fallback:', error)
    // Fallback: simple similarity-based scoring
    const now = new Date()
    const fallbackStories = stories.map(story => {
      const publishedDate = new Date(story.published_at)
      const ageInDays = (now.getTime() - publishedDate.getTime()) / (1000 * 60 * 60 * 24)
      const recencyBoost = Math.round(
        Math.max(0, (1 - (ageInDays / CONFIG.FRESHNESS_DECAY_DAYS)) * CONFIG.RECENCY_BOOST_POINTS)
      )
      const similarityScore = Math.round((story.similarity_score || 0.5) * 100)
      
      return {
        story,
        relevance_score: Math.max(1, Math.min(100, similarityScore + recencyBoost))
      }
    })
    .sort((a, b) => {
      const scoreDiff = b.relevance_score - a.relevance_score
      return scoreDiff !== 0 ? scoreDiff : a.story.id.localeCompare(b.story.id)
    })
    .slice(0, CONFIG.FINAL_RESULTS_LIMIT)
    
    return fallbackStories
  }
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
    
    // Step 3: Calculate personalized relevance scores using LLM + recency boost
    const rankedResults = await calculateRelevanceScores(userPrefs, candidateStories)
    
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
export { CONFIG as RetrievalCon }
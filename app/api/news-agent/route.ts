import { NextRequest } from 'next/server'
import { streamText, generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { supabase } from '@/lib/supabaseClient'
import type { DatabaseStory, UserPreferences } from '@/lib/supabaseSchema'
import { z } from 'zod'

const RequestSchema = z.object({
  messages: z.array(z.object({
    id: z.string().optional(),
    role: z.enum(['user', 'assistant']),
    content: z.string()
  })),
  storyId: z.string().optional(),
  query: z.string().optional(),
  userContext: z.object({
    role: z.string(),
    interests: z.array(z.string()),
    projects: z.string(),
    timestamp: z.string()
  }).nullable().optional()
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('NewsAgent API called with:', { 
      messageCount: body.messages?.length,
      storyId: body.storyId, 
      hasUserContext: !!body.userContext 
    })
    
    const { messages, storyId, query, userContext } = RequestSchema.parse(body)
    const lastMessage = messages[messages.length - 1]
    const userMessage = lastMessage?.content || ''

    if (storyId) {
      console.log('Handling story chat for:', storyId, 'Message:', userMessage.substring(0, 50))
      return handleStoryChat(storyId, userContext, userMessage)
    } else if (query || userMessage) {
      const searchQuery = query || userMessage
      console.log('Handling general chat for query:', searchQuery.substring(0, 50))
      return handleGeneralChat(searchQuery, userContext)
    }
  } catch (error) {
    console.error('NewsAgent API error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to process request', details: error?.message }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

async function handleStoryChat(storyId: string, userContext?: UserPreferences, userMessage?: string) {
  try {
    console.log('Fetching story from database:', storyId)
    
    // Fetch story details from database
    const { data: story, error } = await supabase
      .from('stories')
      .select(`
        id, title, content, summary, author, url, published_at,
        source_name, tags, story_category
      `)
      .eq('id', storyId)
      .single()

    if (error || !story) {
      console.error('Story not found:', error)
      return new Response(
        JSON.stringify({ error: 'Story not found' }),
        { 
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Story found:', { title: story.title, source: story.source_name })

    // Build context for the NewsAgent
    const storyContext = buildStoryContext(story as DatabaseStory)
    const userContextStr = userContext 
      ? `User Role: ${userContext.role}\nInterests: ${userContext.interests.join(', ')}\nCurrent Projects: ${userContext.projects}`
      : 'General user'

    // For auto-analysis, provide a structured response
    const isAutoAnalysis = userMessage === 'AUTO_ANALYZE'
    
    const prompt = isAutoAnalysis 
      ? `You are NewsAgent, an expert AI news analyst. Provide an automatic analysis of this story with:

## Summary
[Provide a concise 2-4 sentence summary]

## Why This Matters to You
[Explain why this is relevant to a ${userContext?.role || 'tech professional'} with interests in ${userContext?.interests?.join(', ') || 'technology'}]

## Key Highlights
- [3-5 key takeaways or insights]

User Context:
${userContextStr}

Story to analyze:
${storyContext}

Be conversational but structured. Focus on actionable insights.`
      : `You are NewsAgent, an expert AI news analyst and educator. The user asked: "${userMessage}"

User Context:
${userContextStr}

Story being discussed:
${storyContext}

Respond conversationally to their question about this story.`

    return streamText({
      model: openai('gpt-4o-mini'),
      prompt,
      temperature: 0.7,
    }).toDataStreamResponse()
    
  } catch (error) {
    console.error('Story chat error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to analyze story' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

async function handleGeneralChat(query: string, userContext?: UserPreferences) {
  try {
    // Search for relevant stories based on the query
    const stories = await searchRelevantStories(query, userContext)
    
    if (stories.length === 0) {
      return streamText({
        model: openai('gpt-4o-mini'),
        prompt: `You are NewsAgent. The user asked: "${query}"

I couldn't find any relevant stories in the database that match your query. Could you try rephrasing your question or asking about a different topic? You might want to ask about AI, machine learning, data engineering, or other tech developments.`,
        temperature: 0.7,
      })
    }

    // Build context for multiple stories
    const storiesContext = stories
      .slice(0, 5) // Limit to top 5 most relevant stories
      .map((story, index) => `Story ${index + 1}:
Title: ${story.title}
Source: ${story.source_name}
Summary: ${story.summary || story.content?.substring(0, 300) + '...' || 'No summary available'}
Tags: ${story.tags.join(', ')}
URL: ${story.url}
Published: ${new Date(story.published_at).toLocaleDateString()}
`)
      .join('\n\n')

    const userContextStr = userContext 
      ? `User Role: ${userContext.role}\nInterests: ${userContext.interests.join(', ')}\nCurrent Projects: ${userContext.projects}`
      : 'General user'

    const prompt = `You are NewsAgent, an expert AI news analyst and educator. The user asked: "${query}"

Based on the most relevant stories in our database, provide a comprehensive response that:
1. Directly answers their question if possible
2. Summarizes the most relevant stories (2-4 sentences each)
3. Explains why these stories matter to the user personally
4. Highlights key facts and takeaways
5. Cites sources by mentioning story titles and sources

User Context:
${userContextStr}

Relevant Stories Found:
${storiesContext}

Respond conversationally and cite your sources. Focus on actionable insights and connect the stories to the user's interests and role.`

    return streamText({
      model: openai('gpt-4o-mini'),
      prompt,
      temperature: 0.7,
    }).toDataStreamResponse()
    
  } catch (error) {
    console.error('General chat error:', error)
    return new Response(
      JSON.stringify({
        error: "Sorry, I couldn't find any relevant stories right now. Please try again later or rephrase your question."
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

async function searchRelevantStories(
  query: string, 
  userContext?: UserPreferences
): Promise<DatabaseStory[]> {
  try {
    // Simple text search in title, content, and tags
    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 2)
    
    if (searchTerms.length === 0) {
      // Fallback to recent stories
      const { data, error } = await supabase
        .from('stories')
        .select(`
          id, title, content, summary, author, url, published_at,
          source_name, tags, story_category
        `)
        .order('published_at', { ascending: false })
        .limit(10)
      
      return error ? [] : (data as DatabaseStory[])
    }

    // Search across title, content, summary, and tags
    const { data, error } = await supabase
      .from('stories')
      .select(`
        id, title, content, summary, author, url, published_at,
        source_name, tags, story_category
      `)
      .or(searchTerms.map(term => 
        `title.ilike.%${term}%,content.ilike.%${term}%,summary.ilike.%${term}%,tags.cs.{${term}}`
      ).join(','))
      .order('published_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error('Search error:', error)
      return []
    }

    return data as DatabaseStory[]
  } catch (error) {
    console.error('Story search failed:', error)
    return []
  }
}

function buildStoryContext(story: DatabaseStory): string {
  return `Title: ${story.title}
Source: ${story.source_name || 'Unknown Source'}
Published: ${new Date(story.published_at).toLocaleDateString()}
Category: ${story.story_category || 'Not specified'}
Tags: ${story.tags.join(', ')}
URL: ${story.url}

Content: ${story.summary || story.content || 'No content available'}
`
}
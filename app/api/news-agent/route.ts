import { openai } from '@ai-sdk/openai'
import { convertToModelMessages, streamText } from 'ai'
import { supabase } from '@/lib/supabaseClient'
import type { DatabaseStory, UserPreferences } from '@/lib/supabaseSchema'

export async function POST(request: Request) {
  try {
    const { messages, storyId, userContext } = await request.json()
    
    console.log('NewsAgent API called with:', { 
      messageCount: messages?.length,
      storyId: storyId, 
      hasUserContext: !!userContext 
    })

    // Get the last user message
    const lastMessage = messages[messages.length - 1]
    const userMessage = lastMessage?.text || lastMessage?.content || ''

    // Build system prompt based on context
    let systemPrompt = 'You are NewsAgent, an expert AI news analyst and educator.'

    if (storyId) {
      // Fetch story details for story-specific chat
      const { data: story, error } = await supabase
        .from('stories')
        .select('id, title, content, summary, author, url, published_at, source_name, tags, story_category')
        .eq('id', storyId)
        .single()

      if (error || !story) {
        console.error('Story not found:', error)
        systemPrompt += ' I apologize, but I could not find the story you are referring to. Please try asking about something else.'
      } else {
        const userContextStr = userContext 
          ? `User Role: ${userContext.role}\nInterests: ${userContext.interests?.join(', ')}\nCurrent Projects: ${userContext.projects}`
          : 'General user'

        const storyContext = `Title: ${story.title}
Source: ${story.source_name || 'Unknown Source'}
Published: ${new Date(story.published_at).toLocaleDateString()}
Category: ${story.story_category || 'Not specified'}
Tags: ${story.tags?.join(', ')}
URL: ${story.url}
Content: ${story.summary || story.content || 'No content available'}`

        // Check if this is auto-analysis
        const isAutoAnalysis = userMessage === 'AUTO_ANALYZE'
        
        if (isAutoAnalysis) {
          systemPrompt += ` Provide an automatic analysis of this story with:

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
        } else {
          systemPrompt += ` The user is asking about this specific story:

User Context:
${userContextStr}

Story being discussed:
${storyContext}

Respond conversationally to their question about this story.`
        }
      }
    } else {
      // General chat - could add story search here later
      systemPrompt += ` Answer questions about AI, technology, and development topics. Be helpful and conversational.`
    }

    const result = streamText({
      model: openai('gpt-4o-mini'),
      system: systemPrompt,
      messages: convertToModelMessages(messages),
      temperature: 0.7,
    })

    return result.toUIMessageStreamResponse()
    
  } catch (error) {
    console.error('NewsAgent API error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to process request' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}
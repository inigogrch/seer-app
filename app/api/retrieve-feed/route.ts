import { NextRequest, NextResponse } from 'next/server'
import { retrievePersonalizedStories } from '@/lib/retrievalAgent'
import { UserPreferences } from '@/lib/supabaseSchema'

export async function POST(request: NextRequest) {
  try {
    const userPreferences: UserPreferences = await request.json()
    
    // Validate required fields
    if (!userPreferences.role || 
        !userPreferences.role.trim() ||
        !userPreferences.interests || 
        userPreferences.interests.length === 0 ||
        !userPreferences.projects || 
        !userPreferences.projects.trim()) {
      return NextResponse.json(
        { success: false, error: 'All fields are required: role, interests (at least 1), and projects must be filled out' },
        { status: 400 }
      )
    }
    
    console.log('Processing personalized feed request:', {
      role: userPreferences.role,
      interestCount: userPreferences.interests.length,
      hasProjects: !!userPreferences.projects
    })
    
    // Use the retrievalAgent to get personalized stories
    const personalizedStories = await retrievePersonalizedStories(userPreferences)
    
    console.log(`Retrieved ${personalizedStories.length} personalized stories`)
    
    return NextResponse.json({
      success: true,
      stories: personalizedStories,
      personalized: true,
      count: personalizedStories.length,
      userPreferences: {
        role: userPreferences.role,
        interestCount: userPreferences.interests.length,
        timestamp: userPreferences.timestamp
      }
    })
    
  } catch (error) {
    console.error('Error in retrieve-feed API:', error)
    
    // Return detailed error information for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve personalized feed',
        details: errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}


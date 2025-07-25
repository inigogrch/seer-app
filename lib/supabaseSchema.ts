// Supabase database schema interfaces and utilities

export interface DatabaseStory {
  id: string // UUID
  external_id: string
  title: string
  url: string
  content?: string
  summary?: string
  author?: string
  image_url?: string
  published_at: string
  created_at: string
  updated_at: string
  story_category?: 'news' | 'tools' | 'research' | 'opinion' | 'announcement'
  tags: string[] // text[] array
  embedding?: number[] // vector field
  embedding_model?: string
  embedding_generated_at?: string
  original_metadata?: Record<string, unknown>
  tagging_metadata?: Record<string, unknown>
  source_id: number // foreign key to sources table
  source_name?: string
}

export interface DatabaseSource {
  id: number
  name: string
  type: 'rss' | 'api' | 'web_scrape'
  endpoint_url: string
  fetch_freq_min: number
  is_active: boolean
  created_at: string
  updated_at: string
  slug?: string
  adapter_name?: string
  priority: number
}

export interface UserPreferences {
  role: string
  interests: string[]
  projects: string
  timestamp: string
}

// Fallback search function using PostgreSQL full-text search and array operations
export async function fallbackSearch(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userPrefs: UserPreferences,
  limit: number = 200
): Promise<DatabaseStory[]> {
  // Build search terms from user preferences
  const searchTerms = [
    userPrefs.role.toLowerCase(),
    ...userPrefs.interests.map(i => i.toLowerCase()),
    // Extract meaningful words from projects (length > 3)
    ...userPrefs.projects.toLowerCase().split(/\s+/).filter(word => word.length > 3)
  ].slice(0, 10) // Limit search terms to avoid query complexity
  
  try {
    let query = supabase
      .from('stories')
      .select(`
        id, external_id, title, url, content, summary, author, image_url,
        published_at, created_at, updated_at, story_category, tags,
        embedding, embedding_model, embedding_generated_at,
        original_metadata, tagging_metadata, source_id, source_name
      `)
      .order('published_at', { ascending: false })
      .limit(limit)
    
    if (searchTerms.length > 0) {
      // Use PostgreSQL full-text search and array operations
      const textSearchQuery = searchTerms.join(' | ') // OR search across terms
      
      // Combine multiple search strategies:
      // 1. Full-text search on title and content
      // 2. Array overlap on tags
      // 3. Case-insensitive pattern matching
      query = query.or([
        `title.fts.${textSearchQuery}`,
        `content.fts.${textSearchQuery}`,
        `summary.fts.${textSearchQuery}`,
        `tags.ov.{${searchTerms.join(',')}}`, // Array overlap
        ...searchTerms.slice(0, 3).map(term => `title.ilike.%${term}%`)
      ].join(','))
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('Fallback search error:', error)
      throw error
    }
    
    return data || []
    
  } catch (error) {
    console.error('Search failed, returning recent stories:', error)
    
    // Final fallback: return recent stories
    const { data: fallbackData } = await supabase
      .from('stories')
      .select(`
        id, external_id, title, url, content, summary, author, image_url,
        published_at, created_at, updated_at, story_category, tags,
        embedding, embedding_model, embedding_generated_at,
        original_metadata, tagging_metadata, source_id, source_name
      `)
      .order('published_at', { ascending: false })
      .limit(limit)
      
    return fallbackData || []
  }
}
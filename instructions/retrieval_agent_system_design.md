# retrievalAgent: Full System Design & Implementation Plan 

## 1. Agentic System Overview

- **Goal:** Return a ranked, relevance-scored feed of stories for each user, based on their onboarding preferences.
- **Architecture:** Modular agent (retrievalAgent) living in backend/API, triggered post-onboarding, using Vercel AI SDK for orchestration, enhanced by LLMs for ranking/justification.
- **Frontend:** Same feed UI (see `app/page.tsx`) for both public and personalized feeds, with new ordering and a relevance score when personalized.

---

## 2. Data Flow & Integration Points

### a. Onboarding Flow (Personalize)

- User progresses through multi-step onboarding (see `app/personalize/page.tsx`).
- User preferences gathered: `role`, `interests`, `freeform priorities/projects` (potentially more in the future).
- On completion, all preferences are saved to `localStorage.user_preferences`
- **User Embedding:** When personalization is triggered, generate an embedding vector for the user's preferences (e.g., via OpenAI embedding API or similar), used for hybrid search in the retrievalAgent.
- On click "Generate Feed":
  - Route to `/` (our feed lives in app/page.tsx)
  - Initiate personalized feed fetch (POST to `/api/retrieve-feed`, sending user prefs)

### b. Backend Storage (Users Table)

- Supabase `users` table (for persistence across devices/auth):
  - `id` (uuid, primary key)
  - `created_at` (timestamp)
  - `role` (string)
  - `interests` (string[] or JSON)
  - `projects` (text)
  - `embedding` (vector/float[])   # NEW: stores user's embedding for fast retrieval
  - (optional) `last_seen` (timestamp), `onboarding_complete` (bool)

### c. RetrievalAgent API

- Exposed at `/api/retrieve-feed/route.ts`
- Accepts POST with user prefs (object: `{ role, interests, projects, ... }`)
- **Embeddings Step:**
  - If not already provided, computes embedding for user prefs (see code below)
  - Uses this embedding in hybrid (semantic + heuristic) search for top-K stories from Supabase
- Runs `retrievalAgent` logic:
  1. Hybrid retrieve: semantic + heuristic (see embedding usage)
  2. LLM rerank: Sends user prefs + top-K stories to LLM for relevance scoring
  3. For each story, compute and return `relevanceScore`, one-paragraph summary, and explanation of relevance + insights
  4. Return top N stories, ordered by score, including relevance score, summary, and explanation in payload

### d. Feed Rendering

- Feed UI (see `app/page.tsx`) will:
  - Call `/api/retrieve-feed` if personalization context exists (else load public feed)
  - Render the same UI, but now ordered by relevance score
  - Show relevance score on cards (small badge or visual indicator)

---

## 3. User Preferences: Storage & Sync

- **Anonymous/MVP:** Store in `localStorage.user_preferences` only.
- **Logged-in/Future:** Sync preferences and embedding with Supabase `users` table. (when we implement OAuth - not now)
- **Frontend:** Always read from localStorage; on login, optionally sync to backend.
- **User Embedding:** Can be recomputed on demand or stored in the table for efficiency.

---

## 4. Clear Logic Separation

- **Feed Data Fetching & Transformation**
  - Extract all feed-fetching logic to a custom hook or service (e.g., `useFeedStories()`):
    - Checks for user preferences, decides whether to fetch public or personalized stories
    - Handles transformation (sectioning, mapping, relevance scoring) before passing to UI
- **Frontend Components**
  - `app/personalize/page.tsx`: Manages onboarding, saves user prefs, triggers agent fetch, routes to feed
  - `app/page.tsx`: Only handles rendering of the feed; agnostic to data source. Consumes `useFeedStories` (or equivalent) for normalized data.
  - `StorySection`, `StoryCard`: Presentational components, not aware of data source; render whatever stories they receive.
- **Conditional UX Logic**
  - Show relevance score badge only if present in the story object (personalized mode)
  - Feed sections and badges adapt based on public vs. personalized data
- **API/Backend**
  - `/api/retrieve-feed/route.ts`: Receives prefs, computes embedding, returns ranked stories (stateless, deterministic for MVP)
  - `/api/user` (optional): Receives and saves preferences+embedding to users table (for persistence)
- **Agent Logic**
  - `lib/retrievalAgent.ts`: Pure logic for embedding, scoring, and ranking (can be tested independently, unit-testable)

---

## 5. Agent Spec (Prompt, Context, Embeddings, Tools, Model)

### **Prompt/Task**

- "Given a user with preferences {role, interests, projects}, return the N most relevant stories from our Supabase archive, ordered by personalized relevance."

### **Context**

- User preferences (raw)
- User embedding (vector)
- Top-K candidate stories (via hybrid semantic + heuristic search)
- Each story's metadata (tags, source, content, etc.)

### **Embeddings**

- Generate user embedding from preferences using OpenAI or similar API:
  ```js
  const userEmbedding = await embedUserPrefs(userPrefs)
  ```
- Use this embedding in pgvector-based hybrid search to retrieve top-K candidate stories.

### **Memory**

- Stateless per-request (MVP); future: allow preference evolution, previous reads, feedback

### **Tools**

1. **Embedding Tool**
   - Converts user preferences into an embedding vector (e.g., OpenAI or Vercel AI SDK embedding tool).
2. **Retrieval Tool**
   - Performs hybrid search using Supabase SQL + pgvector, returning the top-K candidate stories by semantic & heuristic relevance.
3. **Constraint/Filter Tool**
   - Applies post-retrieval logic: limits max per source, deduplicates, applies freshness bias and blocklist filtering before reranking.
4. **LLM Reranker Tool**
   - Calls Vercel AI SDK to invoke an LLM (e.g., GPT-4o-mini), passing user prefs and filtered stories for relevance scoring, summary, and explanation.
5. **Evaluation/Explanation Tool**
   - LLM provides not just ranking, but also a one-paragraph summary and a transparent "why" for each story’s placement (enabling explainable recommendations).

### **Model**

- Retrieval: Hybrid vector + heuristic search in SQL (fast, narrows to manageable set)
- Ranking: LLM reranker (GPT-4o-mini or similar)
- Why: Maximizes accuracy and personalization while controlling cost and latency

---

## 6. Implementation Plan

1. **lib/retrievalAgent.ts**

   - Accepts user prefs, generates embedding, queries Supabase for top-K stories, passes those (with prefs) to LLM reranker
   - Returns ordered story list with relevance scores and  ranking explanations
   - Exposes `retrievePersonalizedStories(userPrefs): Promise<Story[]>`

2. **/api/retrieve-feed/route.ts**

   - Accepts POST with user prefs
   - Calls `retrievePersonalizedStories`, returns top N results to frontend

3. **Update onboarding + feed rendering as previously specified**

4. **User Table:**

   - For MVP: Only store user prefs in `localStorage.user_preferences`. No backend persistence needed.
   - (Future) Create/update Supabase `users` table with prefs and embedding if logged in
   - (Future) Sync prefs and embedding on login/logout

---

## 7. Example Code for Embedding & Retrieval (lib/retrievalAgent.ts)

```ts
import { getEmbedding } from '@/lib/embeddings';
import { supabase } from '@/lib/supabaseClient';
import { experimental_generate } from 'ai';

export async function retrievePersonalizedStories(userPrefs) {
  // 1. Generate embedding for user preferences
  const userEmbedding = await getEmbedding(userPrefs)

  // 2. Hybrid search for top-K stories
  const { data: stories } = await supabase.rpc('hybrid_story_search', {
    user_embedding: userEmbedding,
    k: 200
  })

  // 3. Call LLM reranker
  const prompt = renderPrompt(userPrefs, stories)
  const llmResponse = await experimental_generate({
    model: 'gpt-4o',
    prompt
  })

  // 4. Parse response, map to stories with scores/explanations
  return parseLlmRanking(llmResponse, stories)
}
```

---

## 8. TL;DR

- Retrieval: Use hybrid (semantic + heuristic) search with user embeddings to get a focused candidate set
- Rerank: Use LLM for deep personalization and relevance scoring
- All logic separated and efficient for MVP, but ready to scale/extend for future feedback, session, and agentic chaining.


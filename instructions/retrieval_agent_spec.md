# retrievalAgent Spec (Full System, Updated)

## Prompt/Task

- **LLM Reranker Prompt:**
  ```
  You are a personal news assistant. Given a user with the following preferences:
  - Role: {{role}}
  - Interests: {{interests}}
  - Projects: {{projects}}

  And a list of candidate stories (each with title, content, tags, source, and summary),
  rank the top N stories by their relevance to the user's preferences. For each, assign:
    - a relevance score (0-100)
    - a one-sentence summary of why this story is relevant to the user
    - a short explanation (2-3 sentences) justifying your ranking

  Output as an array of {story_id, relevance_score, summary, explanation}.
  ```
  *(This is templated with actual user prefs and top stories.)*

---

## Context

- **Top-K (e.g. 200) candidate stories** are selected using **hybrid (semantic + heuristic) search** via Supabase/pgvector:
  - **Semantic:** Embedding similarity between user prefs and stories
  - **Heuristic:** Overlap in tags, keywords, sources
- **Constraints (applied before LLM):**
  - **Max per Source:** e.g., no more than 10 stories from the same source
  - **Recency/Freshness Bias:** Prefer newer stories (score decay, or LLM prompt bias)
  - **Deduplication:** No duplicates (by title/URL) in candidate or output set
  - **Blocklist:** Filter out any excluded sources, tags, or keywords
- **Inputs to the LLM:**
  - User preferences
  - Filtered, deduplicated, diversified candidate stories (with metadata)

---

## Memory

- **Stateless per request** (no session/user history for MVP)
- Each call: user prefs + fresh top-K stories
- *(Future: Add feedback, recency, user event history)*

---

## Tools (Explicit Logical Separation)

1. **Embedding Tool**
   - Converts user prefs to an embedding vector for semantic search (e.g., OpenAI embedding or Vercel AI SDK).
2. **Retrieval Tool**
   - Performs hybrid search (Supabase SQL + pgvector), returns initial top-K stories.
3. **Constraint/Filter Tool**
   - Applies: max per source, dedupe, recency, blocklist, before sending to LLM.
4. **LLM Reranker Tool**
   - Ranks, scores, summarizes, and explains top stories using Vercel AI SDK (GPT-4o or similar).
5. **Evaluation/Explanation Tool**
   - Explicitly extracts and returns the summary & explanation per story.

---

## Model

- **Retrieval:** Hybrid vector + heuristic search, optimized in SQL (fast, narrows to best candidates)
- **Ranking:** LLM reranker (GPT-4o via Vercel AI SDK) — relevance scoring, summary, and justification
- **Why:** Maximizes both accuracy and user trust through transparency

---

## Implementation Plan

1. **lib/retrievalAgent.ts**

   - Accepts user prefs, generates embedding, retrieves top-K candidates
   - Applies constraints: diversity, dedupe, recency, blocklist
   - Runs LLM reranker (with prompt for relevance score, summary, explanation)
   - Parses LLM response and returns enriched story objects
   - Exposes `retrievePersonalizedStories(userPrefs): Promise<Story[]>`

2. **/api/retrieve-feed/route.ts**

   - Accepts POST with user prefs
   - Calls `retrievePersonalizedStories`, returns top N results to frontend

3. **Update onboarding + feed rendering as previously specified**

   - Onboarding flow saves prefs, triggers agent, displays relevance scores, summaries, explanations in UI

---

## Example RetrievalAgent Entrypoint (lib/retrievalAgent.ts)

```ts
export async function retrievePersonalizedStories(userPrefs) {
  // 1. Hybrid search for top-K stories
  const userEmbedding = await getEmbedding(userPrefs)
  const { data: stories } = await supabase.rpc('hybrid_story_search', {
    user_embedding: userEmbedding,
    k: 200
  })

  // 2. Apply diversity, dedupe, blocklist, freshness filters
  const maxPerSource = 10;
  const limitedStories = [];
  const perSourceCount = {};
  const seenTitles = new Set();
  for (const story of stories) {
    const source = story.source_name;
    if (!perSourceCount[source]) perSourceCount[source] = 0;
    if (
      perSourceCount[source] < maxPerSource &&
      !seenTitles.has(story.title) &&
      !BLOCKLISTED_SOURCES.includes(source)
      // ...any additional constraints here
    ) {
      limitedStories.push(story);
      perSourceCount[source]++;
      seenTitles.add(story.title);
    }
  }

  // 3. Call LLM reranker
  const prompt = renderPrompt(userPrefs, limitedStories)
  const llmResponse = await experimental_generate({
    model: 'gpt-4o',
    prompt
  })

  // 4. Parse response, map to stories with score, summary, explanation
  return parseLlmRanking(llmResponse, limitedStories)
}
```

---

## TL;DR

- **Retrieval:** Use hybrid (semantic + heuristic) search to get a focused candidate set, with diversity and quality constraints
- **Rerank:** Use LLM for deep personalization and relevance scoring
- **Return:** Relevance score, summary, and explanation for each story, ready for the UI
- \*\*All logic separated and efficient for MVP, but ready to scale/extend for future feedback, session, and agentic chaining.


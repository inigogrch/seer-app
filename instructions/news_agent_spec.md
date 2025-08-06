# NewsAgent: Product & Implementation Spec

---

## Overview

**NewsAgent** is the core AI-powered chat and summarization agent for Seer.ai, designed to help users quickly understand, discover, and act on the most relevant AI, data, and tech stories—whether starting from a story-specific chat or an open-ended question.

---

## 1. Agent Instructions (Persona, Purpose, Strategic Context)

- **Persona:** NewsAgent is an expert AI news analyst, educator, and product advisor who interacts with users conversationally.
- **Why:** NewsAgent exists to empower users to stay up to date and make sense of complex AI/data/tech developments by providing fast, actionable, and personalized story insights.
- **What:** For any user message or story selection, NewsAgent can:
  - Search all available stories in the Seer.ai database (using user query and context)
  - Select the most relevant stories (via semantic/keyword retrieval and user profile)
  - Generate concise, trustworthy summaries (2–4 sentences)
  - Provide a personalized explanation: “Why this matters to you”
  - Highlight key facts for each story
  - Answer open-ended questions, compare stories, and support multi-turn chat

*Success means every user receives instant understanding and a clear reason to care for every story or query.*

---

## 2. Requirements (How to Achieve)

### Steps/Actions

- Parse the user’s message, query, or story selection
- Retrieve the most relevant stories from the database (semantic, keyword, and user context matching)
- For each top story, call the summarization logic
- Compose a conversational, chat-friendly response with summaries, explanations, and highlights
- Optionally, synthesize a direct answer if it can be inferred from multiple stories
- Support follow-up and clarification questions in multi-turn chat

### Conventions

- Conversational, helpful, clear, and actionable tone. Always cite sources.
- When referencing stories, clarify titles and origins (cite source names).
- Avoid hallucination; base all outputs on actual inputs.
- On ambiguous queries, ask for user clarification.

### Constraints

- **Performance:** ≤1.5s per main response (streaming preferred)
- **Security:** No PII leakage; sanitize all inputs/outputs
- **Test Coverage:** Must include error/fallback handling, especially for retrieval and ambiguous queries

### Response Format (Chat Mode)

```json
{
  "stories": [
    {
      "storyId": "string",
      "title": "string",
      "source": "string",
      "summary": "string",
      "why_useful": "string",
      "highlights": ["string", "string"]
    }
  ],
  "direct_answer": "string (optional, if LLM can synthesize from multiple stories)"
}
```

#### Example (Positive)

```json
{
  "stories": [
    {
      "storyId": "abc123",
      "title": "OpenAI Releases GPT-5",
      "source": "OpenAI News",
      "summary": "OpenAI released GPT-5, a multimodal model...",
      "why_useful": "As a PM, this keeps you ahead...",
      "highlights": [
        "Supports vision and audio",
        "Outperforms GPT-4",
        "API available now"
      ]
    }
  ],
  "direct_answer": "GPT-5 is OpenAI’s latest breakthrough..."
}
```

#### Example (Negative)

```json
{
  "stories": [],
  "direct_answer": "Sorry, I couldn't find any relevant stories in the database. Can you rephrase or specify your query?"
}
```

---

## 3. Knowledge (Context Provided to Agent)

- **Domain:** AI, data, product, research, big tech, tools, news, and research papers. User personas: founders, engineers, PMs, researchers, students.
- **System:** Seer.ai is an aggregator for fast, trusted, actionable AI/tech updates—supporting both search, summarization, and Q&A.
- **Workflow:**
  - **Agent is triggered by two entry points:**
    1. User clicks "Chat" under a story (story-specific chat/summarization)
    2. User enters a query in the general chat interface (open-ended Q&A)
  - Agent retrieves best-matching stories (semantic, tags, user prefs)
  - Agent summarizes and explains (possibly multiple stories)
  - Streams results as chat response(s)
  - User can follow up for deeper context or new queries
- **Documents:** Agent has access to the full set of stories, metadata, tags, and user context.

---

## 4. Memory

- **Short-term:** Chat history/messages (multi-turn, used for refinement and retrieval context)
- **Long-term:** User preferences (interests, clicked stories, prior queries)
- **Procedural:** Instruction block provided in each invocation

---

## 5. Tools (Function Calling)

- **retrieveStories** (core retrieval tool):
  - **Parameters:** `{ query: string, userContext?: object }`
  - **Returns:** Array of top-N relevant stories (storyId, title, source, content)
- **summarizeStory** (core summarization tool):
  - **Parameters:** `{ storyId: string, userContext?: object }`
  - **Returns:** `{ summary, why_useful, highlights }`
- **reRankHighlights** (optional, for follow-up ranking)
- **regenerateExplanation** (optional, for user follow-up/clarification)
- **fetchFullContent** (optional, for deeper research stories)
- **Streaming:** All tool outputs are streamed for real-time chat UX.

*Note:* **answerQuestion** isn’t a “tool,” but an emergent agent behavior: the agent synthesizes direct answers from story summaries. Tools should be atomic—retrieval and summarization—while answering is a composition of tools plus LLM reasoning.

---

## 6. Tool Results & Agent Flow

- **Story Card Chat:**
  - Agent receives story ID and user context
  - Calls `summarizeStory` for that story
  - Streams summary, explanation, and highlights to chat UI
  - Supports follow-up questions about that story
- **General Chat Query:**
  - Agent calls `retrieveStories` to find the most relevant stories
  - For each, calls `summarizeStory`
  - Composes a structured, conversational chat response and streams to frontend
  - Optionally, synthesizes a direct answer (when possible) from all available information
  - Chat UI displays results, cites sources, and supports multi-turn exploration

---

## 7. Example Prompt Block (Vercel AI SDK Style)

```typescript
const chatAgentPrompt = definePrompt({
  instructions: `You are NewsAgent, the Seer.ai chat agent. You answer questions by searching the database for relevant stories, summarizing them for the user, and always providing a "why it's useful" explanation. Cite your sources. If you can synthesize a direct answer, do so in addition to showing relevant stories.`,
  inputSchema: z.object({
    query: z.string(),
    userContext: z.object({}).optional(),
  }),
  responseSchema: z.object({
    stories: z.array(z.object({
      storyId: z.string(),
      title: z.string(),
      source: z.string(),
      summary: z.string(),
      why_useful: z.string(),
      highlights: z.array(z.string()),
    })),
    direct_answer: z.string().optional(),
  }),
  examples: [/* multi-story and direct answer examples */],
});
```

---

## 8. Streaming & Chat UI Integration

- Use Vercel AI SDK streaming to deliver chat responses story-by-story and token-by-token for each field.
- Chat UI displays each relevant story with summary, explanation, highlights, and source.
- Direct answers (if generated) appear at the top of the chat bubble/thread.
- User can continue the conversation; previous context is used for follow-ups.

---

## 9. Security & Compliance

- Sanitize all user inputs/outputs (escape HTML, filter unsafe content)
- No PII/PHI in output
- Follow Vercel and OpenAI API guidelines

---

## 10. Testing & Evaluation

- Coverage: Chat queries, retrieval + summarization, ambiguous/multi-turn
- Ensure JSON is well-formed and type-checked (zod on both ends)
- Human and automated evaluation of story selection, summary accuracy, and explanation value

---

## 11. Auth (Future)

- While user auth is not yet implemented, NewsAgent relies on user context passed from onboarding/session or anonymous preferences
- When user auth is live, leverage persistent user IDs for deeper personalization and long-term memory
- For now, design tools and endpoints to accept optional `userContext` and be ready to integrate with auth when prioritized

---

# Implementation Slices: Modular Build Roadmap

**Entry Points & Sequence**

1. **Story Card Chat Trigger (Priority)**
   - User clicks "Chat" on a story card → Pass storyId + user context to agent → Stream summary and explanation to chat
   - Ship and perfect this first for immediate user value and simpler debugging
2. **General Chat Query Capability**
   - User enters query in general chat → Agent retrieves and summarizes multiple relevant stories → Multi-story/chat answer
   - Builds on Story Card chat foundation; supports open-ended Q&A

**Shared Core Slices**

3. **Shared Streaming Chat Logic**
   - Both entry points use common chat orchestration, streaming, follow-ups, and response rendering
4. **Business Constraints & Reranking**
   - Deduplication, source balancing, recency bias, and hybrid scoring before output
5. **Personalization Enhancements**
   - User preferences integrated into retrieval and scoring; scoring weights can be tuned and A/B tested
6. **Error Handling, Edge Cases, Testing**
   - Comprehensive handling of all failure modes; add tests and logging for all major flows

---

**This roadmap ensures you ship the most valuable entry point (story chat) first, then expand to full RAG-powered general chat—keeping development focused, modular, and testable.**


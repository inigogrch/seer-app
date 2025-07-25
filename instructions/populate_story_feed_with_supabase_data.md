# Cursor Prompt: Populate Public Story Feed with Supabase Data

## 📝 Background

Our Next.js app's landing page feed currently uses mock data. This task is to replace the mock data with real stories fetched from our Supabase `stories` table.

---

## 🎯 Objective

- Fetch live stories from Supabase and render them in place of mock data on the public feed.
- Make sure all necessary fields display correctly (title, snippet/content, tags, source, published\_at, url, image/logo).
- Preserve the StoryCard component’s existing UI/UX (including hover buttons).

---

## 📂 Files to Have Open (Context):

- `app/page.tsx`\
  *Landing page; where feed and mock data are currently defined/used.*
- `components/ui/card.tsx` also contains the story card component 
- `lib/supabaseClient.ts` (or add if not present)
- `.env.local` (ensure correct Supabase keys; do not expose keys in code)

You may also want to search for any instance of mock stories (like `mockStories`, `storiesMock`, etc.).

---

## 🛠️ Steps / Implementation Plan

1. **Supabase Client Setup**

   - Ensure a Supabase client is set up (typically in `lib/supabaseClient.ts`) using `@supabase/supabase-js`.
   - Credentials should use `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from `.env.local`.

2. **Fetch Stories**

   - In `app/page.tsx`, replace the mock data source with a real data fetch.
     - Use a React hook (e.g., `useEffect` + `useState`) or `getServerSideProps`/`getStaticProps` if you prefer SSR.
     - Fetch latest N stories (order by `published_at` DESC).
     - Example query:
       ```js
       const { data, error } = await supabase
         .from('stories')
         .select('*')
         .order('published_at', { ascending: false })
         .limit(20);
       ```

3. **Map Data to StoryCard Props**

   - Ensure mapping covers all needed fields:
     - `title`, `content` (or snippet), `source`, `published_at`, `tags`, `url`, and image/logo.
   - Add a helper for mapping `source` to a logo (fallback to placeholder if necessary).

4. **UI/UX Updates**

   - Pass fetched stories into the feed rendering logic, replacing mock stories.
   - Preserve existing styling and hover actions for "Read" and "Chat" buttons.
   - "Read" should link to `url`. "Chat" can be disabled or routed for now.

5. **Error/Loading/Empty States**

   - Handle loading and error states gracefully.
   - Show an empty state if no stories are present.

6. **Remove All Mock Data**

   - Ensure all instances of mock data for the story feed are removed.

---

## ✅ Acceptance Criteria

[ ] Feed displays real stories from Supabase, not mock data.

[ ] Story cards show all required fields.

[ ] Image/logo logic works for each card.

[ ] "Read" and "Chat" buttons appear as in the current design.

[ ] UI handles loading, error, and empty cases.

[ ] No hardcoded keys or secrets in client code.

---

**Ready to start! Begin by opening **``** and **``**.**


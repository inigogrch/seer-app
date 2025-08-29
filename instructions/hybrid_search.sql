CREATE OR REPLACE FUNCTION public.hybrid_story_search(
    query_embedding VECTOR,
    match_threshold FLOAT,
    match_count INTEGER
)
RETURNS SETOF stories AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.stories
  WHERE
    embedding IS NOT NULL
    AND (embedding <#> query_embedding) < match_threshold
    AND published_at > now() - interval '30 days'
    AND source_name IS NOT NULL
  ORDER BY embedding <#> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql STABLE;
-- Fix security definer views by setting security_invoker = true
-- This ensures RLS policies of the querying user are applied, not the view creator

ALTER VIEW public.v_community_posts SET (security_invoker = true);
ALTER VIEW public.v_community_comments SET (security_invoker = true);
ALTER VIEW public.v_daily_scores SET (security_invoker = true);
ALTER VIEW public.v_symptom_catalog SET (security_invoker = true);
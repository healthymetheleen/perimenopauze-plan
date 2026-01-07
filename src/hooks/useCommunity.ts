import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

export interface CommunityPost {
  id: string;
  owner_id: string;
  title: string;
  content: string;
  category: string;
  language: string;
  is_anonymous: boolean;
  likes_count: number;
  comments_count: number;
  created_at: string;
  updated_at: string;
  // Joined data
  author_name?: string;
  has_liked?: boolean;
}

export interface CommunityComment {
  id: string;
  post_id: string;
  owner_id: string;
  content: string;
  is_anonymous: boolean;
  created_at: string;
  updated_at: string;
  author_name?: string;
}

export const categories = [
  { value: 'algemeen', label: 'Algemeen' },
  { value: 'voeding', label: 'Voeding' },
  { value: 'slaap', label: 'Slaap' },
  { value: 'beweging', label: 'Beweging' },
  { value: 'cyclus', label: 'Cyclus & Hormonen' },
  { value: 'stress', label: 'Stress & Mentaal' },
  { value: 'tips', label: 'Tips & Ervaringen' },
];

export function useCommunityPosts(category?: string, language?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['community-posts', category, language],
    queryFn: async (): Promise<CommunityPost[]> => {
      // Use the secure view that masks owner_id for anonymous posts
      let query = supabase
        .from('v_community_posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (category && category !== 'alle') {
        query = query.eq('category', category);
      }

      if (language && language !== 'alle') {
        query = query.eq('language', language);
      }

      const { data: posts, error } = await query;
      if (error) throw error;

      // Get user's likes if logged in
      let userLikes: string[] = [];
      if (user) {
        const { data: likes } = await supabase
          .from('community_likes')
          .select('post_id')
          .eq('owner_id', user.id);
        userLikes = likes?.map(l => l.post_id) || [];
      }

      // Get author names for non-anonymous posts (owner_id is null for anonymous in the view)
      const ownerIds = [...new Set(posts?.filter(p => p.owner_id).map(p => p.owner_id) || [])];
      let profiles: Record<string, string> = {};
      if (ownerIds.length > 0) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, display_name')
          .in('id', ownerIds);
        profiles = Object.fromEntries(
          profileData?.map(p => [p.id, p.display_name || 'Anoniem']) || []
        );
      }

      return (posts || []).map(post => ({
        ...post,
        owner_id: post.owner_id || '', // Ensure owner_id is always defined for type safety
        author_name: !post.owner_id ? 'Anoniem' : (profiles[post.owner_id] || 'Gebruiker'),
        has_liked: userLikes.includes(post.id),
      }));
    },
  });
}

export function useCommunityPost(postId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['community-post', postId],
    queryFn: async (): Promise<CommunityPost | null> => {
      // Use the secure view that masks owner_id for anonymous posts
      const { data: post, error } = await supabase
        .from('v_community_posts')
        .select('*')
        .eq('id', postId)
        .single();

      if (error) throw error;
      if (!post) return null;

      // Check if user liked
      let hasLiked = false;
      if (user) {
        const { data: like } = await supabase
          .from('community_likes')
          .select('id')
          .eq('post_id', postId)
          .eq('owner_id', user.id)
          .maybeSingle();
        hasLiked = !!like;
      }

      // Get author name (owner_id is null for anonymous in the view)
      let authorName = 'Anoniem';
      if (post.owner_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', post.owner_id)
          .single();
        authorName = profile?.display_name || 'Gebruiker';
      }

      return {
        ...post,
        owner_id: post.owner_id || '', // Ensure owner_id is always defined for type safety
        author_name: authorName,
        has_liked: hasLiked,
      };
    },
    enabled: !!postId,
  });
}

export function usePostComments(postId: string) {
  return useQuery({
    queryKey: ['community-comments', postId],
    queryFn: async (): Promise<CommunityComment[]> => {
      // Use the secure view that masks owner_id for anonymous comments
      const { data: comments, error } = await supabase
        .from('v_community_comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Get author names (owner_id is null for anonymous in the view)
      const ownerIds = [...new Set(comments?.filter(c => c.owner_id).map(c => c.owner_id) || [])];
      let profiles: Record<string, string> = {};
      if (ownerIds.length > 0) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, display_name')
          .in('id', ownerIds);
        profiles = Object.fromEntries(
          profileData?.map(p => [p.id, p.display_name || 'Anoniem']) || []
        );
      }

      return (comments || []).map(comment => ({
        ...comment,
        owner_id: comment.owner_id || '', // Ensure owner_id is always defined for type safety
        author_name: !comment.owner_id ? 'Anoniem' : (profiles[comment.owner_id] || 'Gebruiker'),
      }));
    },
    enabled: !!postId,
  });
}

export function useCreatePost() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { title: string; content: string; category: string; language: string; is_anonymous: boolean }) => {
      if (!user) throw new Error('Niet ingelogd');

      const { data: post, error } = await supabase
        .from('community_posts')
        .insert({
          owner_id: user.id,
          title: data.title,
          content: data.content,
          category: data.category,
          language: data.language,
          is_anonymous: data.is_anonymous,
        })
        .select()
        .single();

      if (error) throw error;
      return post;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-posts'] });
    },
  });
}

export function useCreateComment() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { post_id: string; content: string; is_anonymous: boolean }) => {
      if (!user) throw new Error('Niet ingelogd');

      const { data: comment, error } = await supabase
        .from('community_comments')
        .insert({
          post_id: data.post_id,
          owner_id: user.id,
          content: data.content,
          is_anonymous: data.is_anonymous,
        })
        .select()
        .single();

      if (error) throw error;
      return comment;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['community-comments', variables.post_id] });
      queryClient.invalidateQueries({ queryKey: ['community-post', variables.post_id] });
      queryClient.invalidateQueries({ queryKey: ['community-posts'] });
    },
  });
}

export function useToggleLike() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      if (!user) throw new Error('Niet ingelogd');

      // Check if already liked
      const { data: existingLike } = await supabase
        .from('community_likes')
        .select('id')
        .eq('post_id', postId)
        .eq('owner_id', user.id)
        .maybeSingle();

      if (existingLike) {
        // Unlike
        const { error } = await supabase
          .from('community_likes')
          .delete()
          .eq('id', existingLike.id);
        if (error) throw error;
        return { liked: false };
      } else {
        // Like
        const { error } = await supabase
          .from('community_likes')
          .insert({ post_id: postId, owner_id: user.id });
        if (error) throw error;
        return { liked: true };
      }
    },
    onSuccess: (_, postId) => {
      queryClient.invalidateQueries({ queryKey: ['community-posts'] });
      queryClient.invalidateQueries({ queryKey: ['community-post', postId] });
    },
  });
}

export function useDeletePost() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      if (!user) throw new Error('Niet ingelogd');

      const { error } = await supabase
        .from('community_posts')
        .delete()
        .eq('id', postId)
        .eq('owner_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-posts'] });
    },
  });
}

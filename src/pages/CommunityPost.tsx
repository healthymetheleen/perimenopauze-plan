import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { nl } from 'date-fns/locale';
import { 
  MessageCircle, Heart, ArrowLeft, User, Clock, 
  Send, Trash2, MoreVertical
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { LoadingState } from '@/components/ui/loading-state';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  useCommunityPost, 
  usePostComments, 
  useCreateComment, 
  useToggleLike,
  useDeletePost,
  categories 
} from '@/hooks/useCommunity';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const categoryColors: Record<string, string> = {
  algemeen: 'bg-muted text-muted-foreground',
  voeding: 'bg-primary/10 text-primary',
  slaap: 'bg-primary/15 text-primary',
  beweging: 'bg-primary/10 text-primary',
  cyclus: 'bg-primary/20 text-primary',
  stress: 'bg-muted text-muted-foreground',
  tips: 'bg-primary/5 text-primary',
};

export default function CommunityPostPage() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [newComment, setNewComment] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);

  const { data: post, isLoading: postLoading } = useCommunityPost(postId || '');
  const { data: comments, isLoading: commentsLoading } = usePostComments(postId || '');
  const createComment = useCreateComment();
  const toggleLike = useToggleLike();
  const deletePost = useDeletePost();

  const handleLike = async () => {
    if (!postId) return;
    try {
      await toggleLike.mutateAsync(postId);
    } catch (error) {
      toast({ title: 'Kon niet liken', variant: 'destructive' });
    }
  };

  const handleSubmitComment = async () => {
    if (!postId || !newComment.trim()) return;

    try {
      await createComment.mutateAsync({
        post_id: postId,
        content: newComment.trim(),
        is_anonymous: isAnonymous,
      });
      setNewComment('');
      toast({ title: 'Reactie geplaatst!' });
    } catch (error) {
      toast({ title: 'Kon reactie niet plaatsen', variant: 'destructive' });
    }
  };

  const handleDeletePost = async () => {
    if (!postId) return;
    if (!confirm('Weet je zeker dat je dit bericht wilt verwijderen?')) return;

    try {
      await deletePost.mutateAsync(postId);
      toast({ title: 'Bericht verwijderd' });
      navigate('/community');
    } catch (error) {
      toast({ title: 'Kon bericht niet verwijderen', variant: 'destructive' });
    }
  };

  if (postLoading) {
    return (
      <AppLayout>
        <LoadingState />
      </AppLayout>
    );
  }

  if (!post) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Bericht niet gevonden</p>
          <Button asChild className="mt-4">
            <Link to="/community">Terug naar community</Link>
          </Button>
        </div>
      </AppLayout>
    );
  }

  const isOwner = user?.id === post.owner_id;

  return (
    <AppLayout>
      <div className="space-y-6 max-w-2xl mx-auto">
        {/* Back button */}
        <Button variant="ghost" size="sm" asChild>
          <Link to="/community">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Terug naar community
          </Link>
        </Button>

        {/* Post */}
        <Card className="rounded-2xl">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge 
                    variant="secondary" 
                    className={cn("text-xs", categoryColors[post.category])}
                  >
                    {categories.find(c => c.value === post.category)?.label || post.category}
                  </Badge>
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {post.author_name}
                  </span>
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(post.created_at), { 
                      addSuffix: true, 
                      locale: nl 
                    })}
                  </span>
                </div>
                <h1 className="text-xl font-semibold">{post.title}</h1>
              </div>
              {isOwner && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem 
                      onClick={handleDeletePost}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Verwijderen
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-foreground whitespace-pre-wrap">{post.content}</p>
            
            <div className="flex items-center gap-4 mt-6 pt-4 border-t">
              <button
                onClick={handleLike}
                className={cn(
                  "flex items-center gap-2 text-sm font-medium transition-colors",
                  post.has_liked 
                    ? "text-pink-500" 
                    : "text-muted-foreground hover:text-pink-500"
                )}
              >
                <Heart 
                  className={cn("h-5 w-5", post.has_liked && "fill-current")} 
                />
                {post.likes_count} likes
              </button>
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <MessageCircle className="h-5 w-5" />
                {post.comments_count} reacties
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Comment form */}
        <Card className="rounded-2xl">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <Textarea
                placeholder="Schrijf een reactie..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={3}
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    id="anonymous"
                    checked={isAnonymous}
                    onCheckedChange={setIsAnonymous}
                  />
                  <Label htmlFor="anonymous" className="text-sm">
                    Anoniem reageren
                  </Label>
                </div>
                <Button 
                  onClick={handleSubmitComment}
                  disabled={!newComment.trim() || createComment.isPending}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Plaatsen
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Comments */}
        <div className="space-y-3">
          <h2 className="text-lg font-medium">
            Reacties ({comments?.length || 0})
          </h2>
          
          {commentsLoading ? (
            <LoadingState size="sm" />
          ) : !comments?.length ? (
            <p className="text-muted-foreground text-center py-6">
              Nog geen reacties. Wees de eerste!
            </p>
          ) : (
            <div className="space-y-3">
              {comments.map((comment) => (
                <Card key={comment.id} className="rounded-xl">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {comment.author_name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.created_at), { 
                          addSuffix: true, 
                          locale: nl 
                        })}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

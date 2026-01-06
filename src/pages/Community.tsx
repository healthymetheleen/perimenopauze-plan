import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { nl } from 'date-fns/locale';
import { 
  MessageCircle, Heart, Plus, Search, Filter,
  User, Clock, ChevronRight
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/ui/loading-state';
import { EmptyState } from '@/components/ui/empty-state';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useCommunityPosts, useCreatePost, useToggleLike, categories } from '@/hooks/useCommunity';
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

export default function CommunityPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('alle');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    category: 'algemeen',
    is_anonymous: false,
  });

  const { data: posts, isLoading } = useCommunityPosts(selectedCategory);
  const createPost = useCreatePost();
  const toggleLike = useToggleLike();
  const { toast } = useToast();

  const filteredPosts = posts?.filter(post => 
    post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreatePost = async () => {
    if (!newPost.title.trim() || !newPost.content.trim()) {
      toast({ title: 'Vul een titel en bericht in', variant: 'destructive' });
      return;
    }

    try {
      await createPost.mutateAsync(newPost);
      toast({ title: 'Bericht geplaatst!' });
      setShowNewPost(false);
      setNewPost({ title: '', content: '', category: 'algemeen', is_anonymous: false });
    } catch (error) {
      toast({ title: 'Kon bericht niet plaatsen', variant: 'destructive' });
    }
  };

  const handleLike = async (postId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await toggleLike.mutateAsync(postId);
    } catch (error) {
      toast({ title: 'Kon niet liken', variant: 'destructive' });
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Community</h1>
            <p className="text-muted-foreground">
              Stel vragen en deel ervaringen met andere vrouwen
            </p>
          </div>
          <Dialog open={showNewPost} onOpenChange={setShowNewPost}>
            <DialogTrigger asChild>
              <Button className="shrink-0">
                <Plus className="h-4 w-4 mr-2" />
                Nieuwe vraag
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Nieuwe vraag stellen</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Titel</Label>
                  <Input
                    id="title"
                    placeholder="Korte samenvatting van je vraag..."
                    value={newPost.title}
                    onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="content">Je vraag of bericht</Label>
                  <Textarea
                    id="content"
                    placeholder="Beschrijf je vraag of ervaring..."
                    rows={5}
                    value={newPost.content}
                    onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Categorie</Label>
                  <Select 
                    value={newPost.category} 
                    onValueChange={(value) => setNewPost({ ...newPost, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <Label>Anoniem plaatsen</Label>
                    <p className="text-sm text-muted-foreground">
                      Je naam wordt niet getoond
                    </p>
                  </div>
                  <Switch
                    checked={newPost.is_anonymous}
                    onCheckedChange={(checked) => setNewPost({ ...newPost, is_anonymous: checked })}
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <Button variant="outline" className="flex-1" onClick={() => setShowNewPost(false)}>
                    Annuleren
                  </Button>
                  <Button 
                    className="flex-1" 
                    onClick={handleCreatePost}
                    disabled={createPost.isPending}
                  >
                    Plaatsen
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Zoek in berichten..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="alle">Alle categorieën</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Posts */}
        {isLoading ? (
          <LoadingState />
        ) : !filteredPosts?.length ? (
          <Card className="rounded-2xl">
            <CardContent className="py-12">
              <EmptyState
                icon={<MessageCircle className="h-10 w-10" />}
                title="Nog geen berichten"
                description={selectedCategory !== 'alle' 
                  ? "Er zijn nog geen berichten in deze categorie."
                  : "Wees de eerste die een vraag stelt!"}
                action={{
                  label: 'Stel een vraag',
                  onClick: () => setShowNewPost(true),
                }}
              />
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredPosts.map((post) => (
              <Link key={post.id} to={`/community/${post.id}`}>
                <Card className="rounded-xl hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge 
                            variant="secondary" 
                            className={cn("text-xs", categoryColors[post.category])}
                          >
                            {categories.find(c => c.value === post.category)?.label || post.category}
                          </Badge>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {post.author_name}
                          </span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(post.created_at), { 
                              addSuffix: true, 
                              locale: nl 
                            })}
                          </span>
                        </div>
                        <h3 className="font-medium text-foreground line-clamp-2 mb-1">
                          {post.title}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {post.content}
                        </p>
                        <div className="flex items-center gap-4 mt-3">
                          <button
                            onClick={(e) => handleLike(post.id, e)}
                            className={cn(
                              "flex items-center gap-1 text-sm transition-colors",
                              post.has_liked 
                                ? "text-pink-500" 
                                : "text-muted-foreground hover:text-pink-500"
                            )}
                          >
                            <Heart 
                              className={cn("h-4 w-4", post.has_liked && "fill-current")} 
                            />
                            {post.likes_count}
                          </button>
                          <span className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MessageCircle className="h-4 w-4" />
                            {post.comments_count}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {/* Community guidelines */}
        <p className="text-xs text-muted-foreground text-center">
          Wees respectvol en ondersteunend. Deze community vervangt geen medisch advies.
        </p>
      </div>
    </AppLayout>
  );
}

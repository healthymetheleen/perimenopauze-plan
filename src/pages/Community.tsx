import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { nl, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { 
  MessageCircle, Heart, Plus, Search, Filter,
  User, Clock, ChevronRight, Globe
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
  algemeen: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  voeding: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  slaap: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  beweging: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  cyclus: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
  stress: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  tips: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
};

export default function CommunityPage() {
  const { t, i18n } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState<string>('alle');
  const [selectedLanguage, setSelectedLanguage] = useState<string>(i18n.language === 'nl' ? 'nl' : 'en');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    category: 'algemeen',
    language: i18n.language === 'nl' ? 'nl' : 'en',
    is_anonymous: false,
  });

  const { data: posts, isLoading } = useCommunityPosts(selectedCategory, selectedLanguage);
  const createPost = useCreatePost();
  const toggleLike = useToggleLike();
  const { toast } = useToast();
  const dateLocale = i18n.language === 'nl' ? nl : enUS;

  const filteredPosts = posts?.filter(post => 
    post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreatePost = async () => {
    if (!newPost.title.trim() || !newPost.content.trim()) {
      toast({ title: t('community.fill_title_content'), variant: 'destructive' });
      return;
    }

    try {
      await createPost.mutateAsync(newPost);
      toast({ title: t('community.post_success') });
      setShowNewPost(false);
      setNewPost({ title: '', content: '', category: 'algemeen', language: i18n.language === 'nl' ? 'nl' : 'en', is_anonymous: false });
    } catch (error) {
      toast({ title: t('community.post_error'), variant: 'destructive' });
    }
  };

  const handleLike = async (postId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await toggleLike.mutateAsync(postId);
    } catch (error) {
      toast({ title: t('community.like_error'), variant: 'destructive' });
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{t('community.title')}</h1>
            <p className="text-muted-foreground">
              {t('community.subtitle')}
            </p>
          </div>
          <Dialog open={showNewPost} onOpenChange={setShowNewPost}>
            <DialogTrigger asChild>
              <Button className="shrink-0">
                <Plus className="h-4 w-4 mr-2" />
                {t('community.new_question')}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{t('community.new_question_title')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">{t('community.post_title')}</Label>
                  <Input
                    id="title"
                    placeholder={t('community.post_title_placeholder')}
                    value={newPost.title}
                    onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="content">{t('community.post_content')}</Label>
                  <Textarea
                    id="content"
                    placeholder={t('community.post_content_placeholder')}
                    rows={5}
                    value={newPost.content}
                    onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>{t('community.category')}</Label>
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
                  <div className="space-y-2">
                    <Label>{t('community.post_language')}</Label>
                    <Select 
                      value={newPost.language} 
                      onValueChange={(value) => setNewPost({ ...newPost, language: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nl">🇳🇱 Nederlands</SelectItem>
                        <SelectItem value="en">🇬🇧 English</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <Label>{t('community.post_anonymous')}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t('community.post_anonymous_desc')}
                    </p>
                  </div>
                  <Switch
                    checked={newPost.is_anonymous}
                    onCheckedChange={(checked) => setNewPost({ ...newPost, is_anonymous: checked })}
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <Button variant="outline" className="flex-1" onClick={() => setShowNewPost(false)}>
                    {t('community.cancel')}
                  </Button>
                  <Button 
                    className="flex-1" 
                    onClick={handleCreatePost}
                    disabled={createPost.isPending}
                  >
                    {t('community.post')}
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
              placeholder={t('community.search_placeholder')}
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder={t('community.filter')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="alle">{t('community.all_categories')}</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
            <SelectTrigger className="w-full sm:w-36">
              <Globe className="h-4 w-4 mr-2" />
              <SelectValue placeholder={t('community.language')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="alle">{t('community.all_languages')}</SelectItem>
              <SelectItem value="nl">🇳🇱 Nederlands</SelectItem>
              <SelectItem value="en">🇬🇧 English</SelectItem>
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
                title={t('community.no_posts')}
                description={selectedCategory !== 'alle' || selectedLanguage !== 'alle'
                  ? t('community.no_posts_category')
                  : t('community.no_posts_all')}
                action={{
                  label: t('community.ask_question'),
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
                          <span className="text-xs">
                            {post.language === 'nl' ? '🇳🇱' : '🇬🇧'}
                          </span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {post.author_name}
                          </span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(post.created_at), { 
                              addSuffix: true, 
                              locale: dateLocale 
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
          {t('community.guidelines')}
        </p>
      </div>
    </AppLayout>
  );
}

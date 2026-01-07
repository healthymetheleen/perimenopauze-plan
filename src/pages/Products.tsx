import { useState } from 'react';
import { ExternalLink, Tag } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAffiliateProductsByCategory, useCategories } from '@/hooks/useAffiliateProducts';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingState } from '@/components/ui/loading-state';
import { EmptyState } from '@/components/ui/empty-state';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function ProductsPage() {
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState('alle');
  const { data: products, isLoading } = useAffiliateProductsByCategory(selectedCategory);
  const { data: categories } = useCategories();

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{t('products.title')}</h1>
          <p className="text-muted-foreground mt-1">
            {t('products.subtitle')}
          </p>
        </div>

        {/* Affiliate disclosure */}
        <Alert>
          <Tag className="h-4 w-4" />
          <AlertDescription>
            <strong>{t('products.affiliateNotice')}:</strong> {t('products.affiliateDescription')}
          </AlertDescription>
        </Alert>

        {/* Category filter */}
        {categories && categories.length > 1 && (
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
            <TabsList>
              <TabsTrigger value="alle">{t('products.all')}</TabsTrigger>
              {categories.map((cat) => (
                <TabsTrigger key={cat} value={cat} className="capitalize">
                  {cat}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}

        {/* Products grid */}
        {isLoading ? (
          <LoadingState message={t('products.loading')} />
        ) : !products?.length ? (
          <EmptyState
            icon={<Tag className="h-12 w-12" />}
            title={t('products.noProducts')}
            description={selectedCategory === 'alle' 
              ? t('products.noProductsDescription')
              : t('products.noProductsInCategory')}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <Card key={product.id} className="overflow-hidden flex flex-col">
                {product.image_url && (
                  <div className="aspect-video w-full overflow-hidden bg-muted">
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
                <CardContent className="flex-1 flex flex-col p-4">
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold">{product.name}</h3>
                      {product.price_indication && (
                        <Badge variant="secondary" className="shrink-0">
                          {product.price_indication}
                        </Badge>
                      )}
                    </div>
                    {product.description && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-3">
                        {product.description}
                      </p>
                    )}
                    {product.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {product.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button asChild className="mt-4 w-full">
                    <a
                      href={product.affiliate_url}
                      target="_blank"
                      rel="noopener noreferrer sponsored"
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      {t('products.viewOnAmazon')}
                    </a>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

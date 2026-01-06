import { useState } from 'react';
import { Plus, Pencil, Trash2, ExternalLink, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  useAffiliateProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  type AffiliateProduct,
} from '@/hooks/useAffiliateProducts';
import { LoadingState } from '@/components/ui/loading-state';

interface ProductFormData {
  name: string;
  description: string;
  image_url: string;
  affiliate_url: string;
  price_indication: string;
  category: string;
  tags: string;
  is_published: boolean;
  sort_order: number;
}

const emptyForm: ProductFormData = {
  name: '',
  description: '',
  image_url: '',
  affiliate_url: '',
  price_indication: '',
  category: 'algemeen',
  tags: '',
  is_published: true,
  sort_order: 0,
};

function ProductForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading,
}: {
  initialData?: ProductFormData;
  onSubmit: (data: ProductFormData) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [form, setForm] = useState<ProductFormData>(initialData || emptyForm);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Naam *</Label>
        <Input
          id="name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="affiliate_url">Affiliate URL *</Label>
        <Input
          id="affiliate_url"
          type="url"
          value={form.affiliate_url}
          onChange={(e) => setForm({ ...form, affiliate_url: e.target.value })}
          placeholder="https://amazon.nl/..."
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Beschrijving</Label>
        <Textarea
          id="description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="image_url">Afbeelding URL</Label>
          <Input
            id="image_url"
            type="url"
            value={form.image_url}
            onChange={(e) => setForm({ ...form, image_url: e.target.value })}
            placeholder="https://..."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="price_indication">Prijsindicatie</Label>
          <Input
            id="price_indication"
            value={form.price_indication}
            onChange={(e) => setForm({ ...form, price_indication: e.target.value })}
            placeholder="€25-35"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="category">Categorie</Label>
          <Input
            id="category"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            placeholder="slaap, voeding, etc."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="sort_order">Sorteervolgorde</Label>
          <Input
            id="sort_order"
            type="number"
            value={form.sort_order}
            onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="tags">Tags (komma-gescheiden)</Label>
        <Input
          id="tags"
          value={form.tags}
          onChange={(e) => setForm({ ...form, tags: e.target.value })}
          placeholder="blauw licht, slaap, etc."
        />
      </div>

      <div className="flex items-center gap-2">
        <Switch
          id="is_published"
          checked={form.is_published}
          onCheckedChange={(checked) => setForm({ ...form, is_published: checked })}
        />
        <Label htmlFor="is_published">Gepubliceerd</Label>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuleren
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Opslaan...' : 'Opslaan'}
        </Button>
      </div>
    </form>
  );
}

export function ProductsAdminCard() {
  const { data: products, isLoading } = useAffiliateProducts();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<AffiliateProduct | null>(null);

  const handleCreate = (data: ProductFormData) => {
    createProduct.mutate(
      {
        ...data,
        tags: data.tags.split(',').map((t) => t.trim()).filter(Boolean),
      },
      {
        onSuccess: () => setIsAddDialogOpen(false),
      }
    );
  };

  const handleUpdate = (data: ProductFormData) => {
    if (!editingProduct) return;
    updateProduct.mutate(
      {
        id: editingProduct.id,
        ...data,
        tags: data.tags.split(',').map((t) => t.trim()).filter(Boolean),
      },
      {
        onSuccess: () => setEditingProduct(null),
      }
    );
  };

  const togglePublished = (product: AffiliateProduct) => {
    updateProduct.mutate({
      id: product.id,
      is_published: !product.is_published,
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Affiliate Producten</CardTitle>
        </CardHeader>
        <CardContent>
          <LoadingState message="Producten laden..." />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Affiliate Producten ({products?.length || 0})</CardTitle>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Product toevoegen
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Nieuw product toevoegen</DialogTitle>
            </DialogHeader>
            <ProductForm
              onSubmit={handleCreate}
              onCancel={() => setIsAddDialogOpen(false)}
              isLoading={createProduct.isPending}
            />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {!products?.length ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nog geen producten toegevoegd
          </p>
        ) : (
          <div className="space-y-3">
            {products.map((product) => (
              <div
                key={product.id}
                className="flex items-center gap-3 p-3 rounded-lg border bg-card"
              >
                {product.image_url && (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="h-12 w-12 rounded object-cover"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{product.name}</span>
                    {!product.is_published && (
                      <Badge variant="secondary">Verborgen</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="capitalize">{product.category}</span>
                    {product.price_indication && (
                      <>
                        <span>•</span>
                        <span>{product.price_indication}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => togglePublished(product)}
                    title={product.is_published ? 'Verbergen' : 'Publiceren'}
                  >
                    {product.is_published ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    asChild
                  >
                    <a
                      href={product.affiliate_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                  <Dialog
                    open={editingProduct?.id === product.id}
                    onOpenChange={(open) => !open && setEditingProduct(null)}
                  >
                    <DialogTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setEditingProduct(product)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                      <DialogHeader>
                        <DialogTitle>Product bewerken</DialogTitle>
                      </DialogHeader>
                      <ProductForm
                        initialData={{
                          name: product.name,
                          description: product.description || '',
                          image_url: product.image_url || '',
                          affiliate_url: product.affiliate_url,
                          price_indication: product.price_indication || '',
                          category: product.category,
                          tags: product.tags?.join(', ') || '',
                          is_published: product.is_published,
                          sort_order: product.sort_order,
                        }}
                        onSubmit={handleUpdate}
                        onCancel={() => setEditingProduct(null)}
                        isLoading={updateProduct.isPending}
                      />
                    </DialogContent>
                  </Dialog>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="icon" variant="ghost">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Product verwijderen?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Weet je zeker dat je "{product.name}" wilt verwijderen?
                          Dit kan niet ongedaan worden gemaakt.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuleren</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteProduct.mutate(product.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Verwijderen
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

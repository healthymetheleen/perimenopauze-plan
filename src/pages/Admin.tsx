import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth-new';
import { api } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  TrendingUp,
  DollarSign,
  Activity,
  Shield,
  Search,
  Trash2,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [usersPagination, setUsersPagination] = useState<any>(null);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is admin
    if (!user?.is_admin) {
      toast.error('Je hebt geen toegang tot deze pagina');
      navigate('/');
      return;
    }

    loadDashboardData();
  }, [user, navigate]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load stats
      const statsResult = await api.admin.getStats();
      if (statsResult.success) {
        setStats(statsResult.data);
      }

      // Load users
      const usersResult = await api.admin.getUsers(1, 50, '');
      if (usersResult.success) {
        setUsers(usersResult.data.users);
        setUsersPagination(usersResult.data.pagination);
      }

      // Load recipes
      const recipesResult = await api.admin.getRecipes();
      if (recipesResult.success) {
        setRecipes(recipesResult.data.recipes);
      }

      // Load logs
      const logsResult = await api.admin.getLogs(1, 20);
      if (logsResult.success) {
        setLogs(logsResult.data.logs);
      }

    } catch (error: any) {
      console.error('Failed to load admin data:', error);
      toast.error(error.message || 'Fout bij laden van admin data');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchUsers = async () => {
    try {
      const result = await api.admin.getUsers(1, 50, searchTerm);
      if (result.success) {
        setUsers(result.data.users);
        setUsersPagination(result.data.pagination);
      }
    } catch (error: any) {
      toast.error(error.message || 'Fout bij zoeken');
    }
  };

  const handleToggleAdmin = async (userId: string, currentStatus: boolean) => {
    try {
      const result = await api.admin.updateUser(userId, {
        is_admin: !currentStatus
      });

      if (result.success) {
        toast.success(currentStatus ? 'Admin rechten ingetrokken' : 'Admin rechten toegekend');
        loadDashboardData();
      }
    } catch (error: any) {
      toast.error(error.message || 'Fout bij updaten');
    }
  };

  const handleTogglePremium = async (userId: string, currentStatus: boolean) => {
    try {
      const result = await api.admin.updateUser(userId, {
        is_premium: !currentStatus
      });

      if (result.success) {
        toast.success(currentStatus ? 'Premium verwijderd' : 'Premium toegekend');
        loadDashboardData();
      }
    } catch (error: any) {
      toast.error(error.message || 'Fout bij updaten');
    }
  };

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (!confirm(`Weet je zeker dat je ${userEmail} wilt verwijderen? Dit kan niet ongedaan gemaakt worden.`)) {
      return;
    }

    try {
      const result = await api.admin.deleteUser(userId);

      if (result.success) {
        toast.success('Gebruiker verwijderd');
        loadDashboardData();
      }
    } catch (error: any) {
      toast.error(error.message || 'Fout bij verwijderen');
    }
  };

  const handleDeleteRecipe = async (recipeId: string, recipeTitle: string) => {
    if (!confirm(`Weet je zeker dat je "${recipeTitle}" wilt verwijderen?`)) {
      return;
    }

    try {
      const result = await api.admin.deleteRecipe(recipeId);

      if (result.success) {
        toast.success('Recept verwijderd');
        loadDashboardData();
      }
    } catch (error: any) {
      toast.error(error.message || 'Fout bij verwijderen');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Activity className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p>Admin dashboard laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold flex items-center gap-2">
            <Shield className="w-10 h-10 text-primary" />
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">Beheer gebruikers, content en bekijk statistieken</p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          <Shield className="w-4 h-4 mr-2" />
          Administrator
        </Badge>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totaal Gebruikers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.stats?.total_users || 0}</div>
            <p className="text-xs text-muted-foreground">
              +{stats?.stats?.new_users_week || 0} deze week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Premium Gebruikers</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.stats?.premium_users || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.stats?.active_subscriptions || 0} actieve abonnementen
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Maandelijkse Omzet</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{stats?.stats?.monthly_revenue || '0'}</div>
            <p className="text-xs text-muted-foreground">
              Recurring revenue
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dagboek Entries</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.stats?.total_diary_entries || 0}</div>
            <p className="text-xs text-muted-foreground">
              Totaal aantal entries
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">Gebruikers</TabsTrigger>
          <TabsTrigger value="recipes">Recepten</TabsTrigger>
          <TabsTrigger value="logs">Admin Logs</TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Gebruikers Beheer</CardTitle>
              <CardDescription>
                Beheer gebruikers, ken admin rechten toe en verwijder accounts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-6">
                <div className="flex-1">
                  <Input
                    placeholder="Zoek op email of naam..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchUsers()}
                  />
                </div>
                <Button onClick={handleSearchUsers}>
                  <Search className="w-4 h-4 mr-2" />
                  Zoeken
                </Button>
              </div>

              <div className="space-y-4">
                {users.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{u.full_name || 'Geen naam'}</h3>
                        {u.is_admin && (
                          <Badge variant="destructive">
                            <Shield className="w-3 h-3 mr-1" />
                            Admin
                          </Badge>
                        )}
                        {u.is_premium && (
                          <Badge variant="secondary">Premium</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{u.email}</p>
                      <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                        <span>{u.diary_count} dagboek entries</span>
                        <span>Sinds {new Date(u.created_at).toLocaleDateString('nl-NL')}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant={u.is_admin ? "destructive" : "outline"}
                        size="sm"
                        onClick={() => handleToggleAdmin(u.id, u.is_admin)}
                        disabled={u.id === user?.id}
                      >
                        <Shield className="w-4 h-4 mr-2" />
                        {u.is_admin ? 'Revoke Admin' : 'Make Admin'}
                      </Button>

                      <Button
                        variant={u.is_premium ? "outline" : "secondary"}
                        size="sm"
                        onClick={() => handleTogglePremium(u.id, u.is_premium)}
                      >
                        {u.is_premium ? 'Remove Premium' : 'Grant Premium'}
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteUser(u.id, u.email)}
                        disabled={u.id === user?.id}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {usersPagination && (
                <div className="mt-6 text-center text-sm text-muted-foreground">
                  Pagina {usersPagination.page} van {usersPagination.totalPages}
                  ({usersPagination.total} totaal)
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recipes Tab */}
        <TabsContent value="recipes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recepten Beheer</CardTitle>
              <CardDescription>
                Beheer alle recepten in de database
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recipes.map((recipe) => (
                  <div
                    key={recipe.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <h3 className="font-semibold">{recipe.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {recipe.description}
                      </p>
                      <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                        <span>{recipe.prep_time + recipe.cook_time} min</span>
                        <span>{recipe.servings} porties</span>
                        {recipe.is_premium && <Badge variant="secondary">Premium</Badge>}
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteRecipe(recipe.id, recipe.title)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Admin Activiteit Logs</CardTitle>
              <CardDescription>
                Bekijk alle admin acties voor audit trail
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-3 border rounded text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{log.action_type}</Badge>
                      <span className="text-muted-foreground">
                        door <strong>{log.admin_email}</strong>
                      </span>
                      {log.target_table && (
                        <span className="text-muted-foreground">
                          op <strong>{log.target_table}</strong>
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(log.created_at).toLocaleString('nl-NL')}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  CalendarDays, 
  TrendingUp, 
  Activity, 
  User,
  Settings,
  LogOut,
  Menu,
  X,
  Flower2,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { useEntitlements } from '@/hooks/useEntitlements';

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
  premium?: boolean;
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Overzicht', icon: <Home className="h-5 w-5" /> },
  { href: '/diary', label: 'Eetdagboek', icon: <CalendarDays className="h-5 w-5" /> },
  { href: '/cycle', label: 'Cyclus', icon: <Flower2 className="h-5 w-5" /> },
  { href: '/trends', label: 'Trends', icon: <TrendingUp className="h-5 w-5" />, premium: true },
  { href: '/patterns', label: 'Patronen', icon: <Activity className="h-5 w-5" />, premium: true },
  { href: '/account', label: 'Account', icon: <User className="h-5 w-5" /> },
  { href: '/settings', label: 'Instellingen', icon: <Settings className="h-5 w-5" /> },
];

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const { signOut } = useAuth();
  const { data: entitlements } = useEntitlements();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isPremium = entitlements?.plan === 'premium' || entitlements?.plan === 'starter';

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile header */}
      <header className="sticky top-0 z-50 lg:hidden bg-card border-b border-border">
        <div className="flex items-center justify-between px-4 h-16">
          <Link to="/dashboard" className="text-xl font-semibold text-foreground">
            HormoonBalans
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Sluit menu' : 'Open menu'}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <nav className="absolute top-16 left-0 right-0 bg-card border-b border-border shadow-lg animate-slide-up">
            <ul className="py-2">
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors',
                      location.pathname === item.href
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                    {item.premium && !isPremium && (
                      <span className="ml-auto text-xs bg-secondary/20 text-secondary px-2 py-0.5 rounded-full">
                        Premium
                      </span>
                    )}
                  </Link>
                </li>
              ))}
              <li className="border-t border-border mt-2 pt-2">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    signOut();
                  }}
                  className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground w-full"
                >
                  <LogOut className="h-5 w-5" />
                  <span>Uitloggen</span>
                </button>
              </li>
            </ul>
          </nav>
        )}
      </header>

      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex flex-col w-64 min-h-screen bg-card border-r border-border">
          <div className="p-6">
            <Link to="/dashboard" className="text-xl font-semibold text-foreground">
              HormoonBalans
            </Link>
            <p className="text-sm text-muted-foreground mt-1">Dagboek</p>
          </div>

          <nav className="flex-1 px-3">
            <ul className="space-y-1">
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link
                    to={item.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      location.pathname === item.href
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                    {item.premium && !isPremium && (
                      <span className="ml-auto text-xs bg-secondary/20 text-secondary px-2 py-0.5 rounded-full">
                        Premium
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="p-3 border-t border-border">
            <button
              onClick={signOut}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground w-full transition-colors"
            >
              <LogOut className="h-5 w-5" />
              <span>Uitloggen</span>
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-h-screen">
          <div className="container py-6 lg:py-8 max-w-5xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
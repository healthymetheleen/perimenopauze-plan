import { ReactNode, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Home,
  CalendarDays,
  TrendingUp,
  User,
  Settings,
  LogOut,
  Menu,
  X,
  Flower2,
  ChefHat,
  Moon,
  Dumbbell,
  Heart,
  Users,
  BarChart3,
  BookOpen,
  ShoppingBag,
  Bot,
  Shield,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { useEntitlements } from '@/hooks/useEntitlements';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useLatestPrediction, useCyclePreferences } from '@/hooks/useCycle';
import { usePageAnalytics } from '@/hooks/usePageAnalytics';
import { Footer } from './Footer';
import { AnimatedSeasonBackground } from './AnimatedSeasonBackground';
import { TrialLockout, TrialBanner } from '@/components/subscription/TrialLockout';

// Pages that should NOT be locked when trial expires
const UNLOCKED_PATHS = ['/subscription', '/account', '/settings', '/login', '/consent', '/terms', '/privacy'];

interface NavItem {
  href: string;
  labelKey: string;
  icon: ReactNode;
  premium?: boolean;
  adminOnly?: boolean;
}

const baseNavItems: NavItem[] = [
  { href: '/dashboard', labelKey: 'nav.overview', icon: <Home className="h-5 w-5" /> },
  { href: '/trends', labelKey: 'nav.trends', icon: <TrendingUp className="h-5 w-5" /> },
  { href: '/diary', labelKey: 'nav.diary', icon: <CalendarDays className="h-5 w-5" /> },
  { href: '/cycle', labelKey: 'nav.cycle', icon: <Flower2 className="h-5 w-5" /> },
  { href: '/slaap', labelKey: 'nav.sleep', icon: <Moon className="h-5 w-5" /> },
  { href: '/bewegen', labelKey: 'nav.movement', icon: <Dumbbell className="h-5 w-5" /> },
  { href: '/meditatie', labelKey: 'nav.meditations', icon: <Heart className="h-5 w-5" /> },
  { href: '/recepten', labelKey: 'nav.recipes', icon: <ChefHat className="h-5 w-5" /> },
  { href: '/producten', labelKey: 'nav.products', icon: <ShoppingBag className="h-5 w-5" /> },
  { href: '/educatie', labelKey: 'nav.education', icon: <BookOpen className="h-5 w-5" /> },
  { href: '/community', labelKey: 'nav.community', icon: <Users className="h-5 w-5" /> },
  { href: '/voeding-beheer', labelKey: 'nav.nutrition_goals', icon: <Settings className="h-5 w-5" />, adminOnly: true },
  { href: '/ai-instellingen', labelKey: 'nav.ai_settings', icon: <Bot className="h-5 w-5" />, adminOnly: true },
  { href: '/admin', labelKey: 'nav.admin', icon: <Shield className="h-5 w-5" />, adminOnly: true },
  { href: '/account', labelKey: 'nav.account', icon: <User className="h-5 w-5" /> },
  { href: '/settings', labelKey: 'nav.settings', icon: <Settings className="h-5 w-5" /> },
];

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const { signOut } = useAuth();
  const { data: entitlements } = useEntitlements();
  const { data: isAdmin } = useIsAdmin();
  const { data: prediction } = useLatestPrediction();
  const { data: preferences } = useCyclePreferences();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Track page views (GDPR-friendly: no user IDs stored)
  usePageAnalytics();

  const isPremium = entitlements?.plan === 'premium' || entitlements?.plan === 'starter';
  const isTrialExpired = entitlements?.is_trial_expired ?? false;
  const trialDaysRemaining = entitlements?.trial_days_remaining ?? 0;
  
  // Get current cycle season for animated background
  const currentSeason = useMemo(() => {
    if (!preferences?.onboarding_completed) return 'onbekend';
    return (prediction?.current_season as 'winter' | 'lente' | 'zomer' | 'herfst') || 'onbekend';
  }, [prediction?.current_season, preferences?.onboarding_completed]);
  
  // Check if current path should be locked
  const shouldLockPage = isTrialExpired && !UNLOCKED_PATHS.some(path => location.pathname.startsWith(path));

  // Filter nav items based on admin status
  const navItems = useMemo(() => {
    return baseNavItems.filter(item => !item.adminOnly || isAdmin);
  }, [isAdmin]);

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Animated season background */}
      <AnimatedSeasonBackground season={currentSeason} />
      
      {/* Mobile header */}
      <header className="sticky top-0 z-50 lg:hidden border-b border-border/50 bg-background/70 backdrop-blur-md">
        <div className="flex items-center justify-between px-4 h-16">
          <Link to="/dashboard" className="flex items-center gap-2">
            <img
              src="/favicon.svg"
              alt={t('layout.app_name')}
              className="h-7 w-7"
              loading="eager"
            />
            <span className="text-lg font-semibold text-primary">{t('layout.app_name')}</span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? t('layout.close_menu') : t('layout.open_menu')}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <nav className="absolute top-16 left-0 right-0 bg-card border-b border-border shadow-lg animate-slide-up z-50">
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
                    <span>{t(item.labelKey)}</span>
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
                  <span>{t('common.logout')}</span>
                </button>
              </li>
            </ul>
          </nav>
        )}
      </header>

      <div className="flex flex-1">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex flex-col w-64 min-h-screen bg-card/70 backdrop-blur-md border-r border-border/50">
          <div className="p-6">
            <Link to="/dashboard" className="text-xl font-semibold text-foreground">
              {t('layout.app_name')}
            </Link>
            <p className="text-sm text-muted-foreground mt-1">{t('layout.diary')}</p>
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
                    <span>{t(item.labelKey)}</span>
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
        <main className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
          <div className="flex-1 container py-6 lg:py-8 max-w-5xl px-4 sm:px-6 overflow-x-hidden">
            {shouldLockPage ? (
              <TrialLockout isTrialExpired={true} trialDaysRemaining={0}>
                {children}
              </TrialLockout>
            ) : (
              <>
                <TrialBanner daysRemaining={trialDaysRemaining} />
                {children}
              </>
            )}
          </div>
          <Footer />
        </main>
      </div>
    </div>
  );
}
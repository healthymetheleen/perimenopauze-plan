import { format, differenceInDays, parseISO } from 'date-fns';
import { nl, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { Droplets, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface BleedingReminderBannerProps {
  cycleStartDate: string;
  hasBleedingToday: boolean;
  onLogBleeding: () => void;
}

export function BleedingReminderBanner({
  cycleStartDate,
  hasBleedingToday,
  onLogBleeding,
}: BleedingReminderBannerProps) {
  const { t, i18n } = useTranslation();
  const [dismissed, setDismissed] = useState(false);
  const dateLocale = i18n.language === 'nl' ? nl : enUS;

  // Calculate day in cycle
  const today = new Date();
  const cycleStart = parseISO(cycleStartDate);
  const dayInCycle = differenceInDays(today, cycleStart) + 1;

  // Only show reminder if:
  // 1. User is in day 1-5 of cycle (typical menstruation period)
  // 2. User hasn't logged bleeding for today
  // 3. User hasn't dismissed the banner
  const shouldShow = dayInCycle >= 1 && dayInCycle <= 5 && !hasBleedingToday && !dismissed;

  if (!shouldShow) return null;

  return (
    <div className="p-4 rounded-2xl bg-pink-50 dark:bg-pink-950/30 border border-pink-200 dark:border-pink-800">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-full bg-pink-100 dark:bg-pink-900/50">
          <Droplets className="h-5 w-5 text-pink-600 dark:text-pink-400" />
        </div>
        <div className="flex-1">
          <p className="font-medium text-pink-800 dark:text-pink-200">
            {t('cycle.bleeding_reminder_title')}
          </p>
          <p className="text-sm text-pink-700 dark:text-pink-300 mt-1">
            {t('cycle.bleeding_reminder_desc', { day: dayInCycle })}
          </p>
          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              variant="default"
              className="bg-pink-600 hover:bg-pink-700 text-white"
              onClick={onLogBleeding}
            >
              <Droplets className="h-4 w-4 mr-1" />
              {t('cycle.log_bleeding')}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-pink-700 dark:text-pink-300 hover:bg-pink-100 dark:hover:bg-pink-900/50"
              onClick={() => setDismissed(true)}
            >
              {t('cycle.no_bleeding_today')}
            </Button>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-pink-400 hover:text-pink-600 dark:text-pink-500 dark:hover:text-pink-300"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

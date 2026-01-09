import { useMemo } from 'react';
import { format } from 'date-fns';
import { nl, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { Moon, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { TrendDayData } from '@/hooks/useTrendsData';

interface TrendsSleepBlockProps {
  data: TrendDayData[];
}

export function TrendsSleepBlock({ data }: TrendsSleepBlockProps) {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language === 'nl' ? nl : enUS;
  const isEnglish = i18n.language === 'en';

  const chartData = useMemo(() => {
    return data.map(day => {
      const lastMealHour = day.lastMealTime 
        ? parseInt(day.lastMealTime.split(':')[0]) 
        : null;
      
      return {
        date: format(new Date(day.date), 'd', { locale: dateLocale }),
        fullDate: day.date,
        sleepHours: day.sleepDurationMin ? Math.round(day.sleepDurationMin / 6) / 10 : null,
        quality: day.sleepQuality,
        lastMealHour,
        isLateMeal: lastMealHour !== null && lastMealHour >= 21,
      };
    });
  }, [data, dateLocale]);

  const daysWithSleep = chartData.filter(d => d.sleepHours !== null);
  const avgSleep = daysWithSleep.length > 0
    ? daysWithSleep.reduce((sum, d) => sum + (d.sleepHours || 0), 0) / daysWithSleep.length
    : 0;
  
  const lateMealDays = chartData.filter(d => d.isLateMeal);
  const lateMealWithBadSleep = lateMealDays.filter(d => d.quality !== null && d.quality < 6);
  const showLateMealInsight = lateMealDays.length >= 2 && lateMealWithBadSleep.length > 0;

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { payload: { sleepHours?: number; quality: number | null; lastMealHour: number | null } }[]; label?: string }) => {
    if (!active || !payload?.length) return null;
    const dayData = payload[0]?.payload;
    
    return (
      <div className="bg-card border rounded-lg p-3 shadow-lg">
        <p className="font-medium">{isEnglish ? 'Day' : 'Dag'} {label}</p>
        {dayData?.sleepHours && (
          <p className="text-sm">{t('trends.sleep_duration')}: {dayData.sleepHours} {isEnglish ? 'hrs' : 'uur'}</p>
        )}
        {dayData?.quality !== null && (
          <p className="text-sm text-muted-foreground">
            {t('trends.sleep_quality')}: {dayData.quality}/10
          </p>
        )}
        {dayData?.lastMealHour !== null && (
          <p className="text-xs text-muted-foreground">
            {t('trends.last_meal')}: {dayData.lastMealHour}:00
          </p>
        )}
      </div>
    );
  };

  if (daysWithSleep.length === 0) {
    return (
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Moon className="h-5 w-5 text-indigo-500" />
            {t('trends.sleep_chart_title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center text-muted-foreground">
          <p>{t('common.no_data')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Moon className="h-5 w-5 text-indigo-500" />
          {t('trends.sleep_chart_title')}
        </CardTitle>
        <div className="flex gap-2 mt-1">
          <Badge variant="outline" className="text-xs">
            {t('trends.sleep_avg', { hours: avgSleep.toFixed(1) })}
          </Badge>
          {avgSleep < 7 && (
            <Badge variant="outline" className="text-xs text-warning border-warning">
              {t('trends.sleep_warning')}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 10 }}
                className="text-muted-foreground"
              />
              <YAxis 
                yAxisId="left"
                domain={[0, 12]}
                tick={{ fontSize: 10 }}
                className="text-muted-foreground"
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                domain={[0, 10]}
                tick={{ fontSize: 10 }}
                hide
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine 
                y={7} 
                yAxisId="left"
                stroke="hsl(var(--success))" 
                strokeDasharray="3 3"
              />
              <Bar 
                yAxisId="left"
                dataKey="sleepHours" 
                fill="hsl(225, 70%, 60%)"
                radius={[4, 4, 0, 0]}
                opacity={0.8}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="quality"
                stroke="hsl(280, 70%, 60%)"
                strokeWidth={2}
                dot={{ fill: 'hsl(280, 70%, 60%)', r: 3 }}
                connectNulls
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        
        <div className="flex items-center justify-center gap-4 mt-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'hsl(225, 70%, 60%)' }} />
            <span>{t('trends.sleep_duration')}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5" style={{ backgroundColor: 'hsl(280, 70%, 60%)' }} />
            <span>{t('trends.sleep_quality')}</span>
          </div>
        </div>
        
        <div className="mt-4 space-y-2">
          {showLateMealInsight && (
            <div className="flex items-start gap-2 p-2 rounded-lg bg-warning/10 text-sm">
              <Clock className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
              <p className="text-muted-foreground">
                {t('trends.late_meal_insight', { days: lateMealWithBadSleep.length })}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

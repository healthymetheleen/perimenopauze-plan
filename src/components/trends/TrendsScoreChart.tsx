import { useMemo } from 'react';
import { format } from 'date-fns';
import { nl, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { TrendingUp, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import { TrendDayData } from '@/hooks/useTrendsData';

interface TrendsScoreChartProps {
  data: TrendDayData[];
  showSeasonOverlay: boolean;
  onDayClick?: (date: string) => void;
}

const seasonColors: Record<string, string> = {
  winter: 'hsl(210, 80%, 90%)',
  lente: 'hsl(140, 70%, 90%)',
  zomer: 'hsl(45, 90%, 90%)',
  herfst: 'hsl(25, 80%, 90%)',
  onbekend: 'hsl(0, 0%, 95%)',
};

export function TrendsScoreChart({ data, showSeasonOverlay, onDayClick }: TrendsScoreChartProps) {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language === 'nl' ? nl : enUS;

  const chartData = useMemo(() => {
    return data.map((day, index) => {
      const start = Math.max(0, index - 6);
      const window = data.slice(start, index + 1).filter(d => d.score !== null);
      const avg = window.length > 0 
        ? window.reduce((sum, d) => sum + (d.score || 0), 0) / window.length 
        : null;
      
      return {
        date: format(new Date(day.date), 'd MMM', { locale: dateLocale }),
        fullDate: day.date,
        score: day.score,
        avg: avg ? Math.round(avg * 10) / 10 : null,
        season: day.season,
        seasonBg: showSeasonOverlay ? 10 : 0,
      };
    });
  }, [data, showSeasonOverlay, dateLocale]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const dayData = payload[0]?.payload;
    
    return (
      <div className="bg-card border rounded-lg p-3 shadow-lg">
        <p className="font-medium">{label}</p>
        {dayData?.score !== null && (
          <p className="text-sm text-primary">{t('trends.score_label')}: {dayData.score}</p>
        )}
        {dayData?.avg !== null && (
          <p className="text-sm text-muted-foreground">{t('trends.average_label')}: {dayData.avg}</p>
        )}
        {showSeasonOverlay && dayData?.season && (
          <Badge className="mt-1 text-xs capitalize" variant="outline">
            {t(`seasons.${dayData.season}`)}
          </Badge>
        )}
      </div>
    );
  };

  if (data.length === 0) {
    return (
      <Card className="rounded-2xl">
        <CardContent className="py-12 text-center text-muted-foreground">
          {t('common.no_data')}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          {t('trends.score_chart_title')}
          {showSeasonOverlay && (
            <Badge variant="outline" className="text-xs ml-2">
              <Calendar className="h-3 w-3 mr-1" />
              {t('trends.season_overlay')}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart 
              data={chartData}
              onClick={(e) => e?.activePayload?.[0]?.payload?.fullDate && onDayClick?.(e.activePayload[0].payload.fullDate)}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
              />
              <YAxis 
                domain={[0, 10]} 
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
              />
              <Tooltip content={<CustomTooltip />} />
              
              {showSeasonOverlay && (
                <Bar dataKey="seasonBg" stackId="bg" fill="transparent">
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={seasonColors[entry.season]}
                      opacity={0.5}
                    />
                  ))}
                </Bar>
              )}
              
              <ReferenceLine y={7} stroke="hsl(var(--success))" strokeDasharray="3 3" opacity={0.5} />
              
              <Line
                type="monotone"
                dataKey="score"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                connectNulls={false}
              />
              
              <Line
                type="monotone"
                dataKey="avg"
                stroke="hsl(var(--muted-foreground))"
                strokeWidth={1.5}
                strokeDasharray="5 5"
                dot={false}
                connectNulls
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        
        <div className="flex items-center justify-center gap-4 mt-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-primary" />
            <span>{t('trends.score_label')}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-muted-foreground" style={{ borderStyle: 'dashed' }} />
            <span>{t('trends.average_label')}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

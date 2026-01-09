import { useMemo } from 'react';
import { format } from 'date-fns';
import { nl, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { Drumstick, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BarChart,
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

interface TrendsProteinChartProps {
  data: TrendDayData[];
  targetProtein?: number;
}

export function TrendsProteinChart({ data, targetProtein = 70 }: TrendsProteinChartProps) {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language === 'nl' ? nl : enUS;
  const isEnglish = i18n.language === 'en';

  const chartData = useMemo(() => {
    return data.map(day => ({
      date: format(new Date(day.date), 'd', { locale: dateLocale }),
      fullDate: day.date,
      protein: Math.round(day.proteinG),
      belowTarget: day.proteinG < targetProtein,
      season: day.season,
    }));
  }, [data, targetProtein, dateLocale]);

  const avgProtein = data.length > 0 
    ? Math.round(data.reduce((sum, d) => sum + d.proteinG, 0) / data.length)
    : 0;
  
  const lowProteinDays = data.filter(d => d.proteinG > 0 && d.proteinG < targetProtein).length;
  const daysWithData = data.filter(d => d.proteinG > 0).length;

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
    if (!active || !payload?.length) return null;
    const value = payload[0]?.value;
    
    return (
      <div className="bg-card border rounded-lg p-3 shadow-lg">
        <p className="font-medium">{isEnglish ? 'Day' : 'Dag'} {label}</p>
        <p className="text-sm">
          {t('trends.kpi_protein')}: <span className="font-semibold">{value}g</span>
        </p>
        {value < targetProtein && value > 0 && (
          <p className="text-xs text-warning">
            {targetProtein - value}g {t('trends.protein_below_target').toLowerCase()}
          </p>
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
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Drumstick className="h-5 w-5 text-accent" />
              {t('trends.protein_chart_title')}
            </CardTitle>
            <CardDescription>
              {isEnglish 
                ? `Average ${avgProtein}g/day · Target ${targetProtein}g`
                : `Gemiddeld ${avgProtein}g/dag · Streef ${targetProtein}g`}
            </CardDescription>
          </div>
          {lowProteinDays > daysWithData * 0.5 && daysWithData > 0 && (
            <Badge variant="outline" className="text-warning border-warning">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {isEnglish ? 'Often low' : 'Vaak te laag'}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 10 }}
                className="text-muted-foreground"
              />
              <YAxis 
                tick={{ fontSize: 10 }}
                className="text-muted-foreground"
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine 
                y={targetProtein} 
                stroke="hsl(var(--success))" 
                strokeDasharray="3 3" 
                label={{ value: `${targetProtein}g`, position: 'right', fontSize: 10 }}
              />
              <Bar dataKey="protein" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`}
                    fill={entry.protein >= targetProtein 
                      ? 'hsl(var(--accent))' 
                      : entry.protein > 0 
                        ? 'hsl(var(--warning))' 
                        : 'hsl(var(--muted))'
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        {lowProteinDays > 0 && daysWithData > 0 && (
          <div className="mt-3 p-3 rounded-lg bg-muted/30 text-sm">
            <p className="font-medium">💡 {isEnglish ? 'Tip' : 'Tip'}</p>
            <p className="text-muted-foreground">
              {t('trends.protein_tip', { days: lowProteinDays, total: daysWithData })}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

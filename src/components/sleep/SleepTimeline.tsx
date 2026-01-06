import { useMemo } from 'react';
import { format, startOfDay, endOfDay, differenceInMinutes, isWithinInterval, areIntervalsOverlapping } from 'date-fns';
import { nl } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2, AlertTriangle } from 'lucide-react';
import { SleepSession } from '@/hooks/useSleep';
import { cn } from '@/lib/utils';

interface SleepTimelineProps {
  sessions: SleepSession[];
  onDeleteSession?: (sessionId: string) => void;
}

// Check if two sessions overlap
function sessionsOverlap(a: SleepSession, b: SleepSession): boolean {
  if (!a.sleep_end || !b.sleep_end) return false;
  
  const aStart = new Date(a.sleep_start);
  const aEnd = new Date(a.sleep_end);
  const bStart = new Date(b.sleep_start);
  const bEnd = new Date(b.sleep_end);
  
  return areIntervalsOverlapping(
    { start: aStart, end: aEnd },
    { start: bStart, end: bEnd }
  );
}

// Find all overlapping session IDs
function findOverlappingSessions(sessions: SleepSession[]): Set<string> {
  const overlapping = new Set<string>();
  
  for (let i = 0; i < sessions.length; i++) {
    for (let j = i + 1; j < sessions.length; j++) {
      if (sessionsOverlap(sessions[i], sessions[j])) {
        overlapping.add(sessions[i].id);
        overlapping.add(sessions[j].id);
      }
    }
  }
  
  return overlapping;
}

// Group sessions by the night they belong to (a night is from noon to noon)
function groupSessionsByNight(sessions: SleepSession[]): Map<string, SleepSession[]> {
  const nights = new Map<string, SleepSession[]>();
  
  sessions.forEach(session => {
    const startDate = new Date(session.sleep_start);
    // If sleep started before noon, it belongs to the previous day's night
    const nightDate = startDate.getHours() < 12 
      ? new Date(startDate.getTime() - 12 * 60 * 60 * 1000)
      : startDate;
    const nightKey = format(nightDate, 'yyyy-MM-dd');
    
    if (!nights.has(nightKey)) {
      nights.set(nightKey, []);
    }
    nights.get(nightKey)!.push(session);
  });
  
  return nights;
}

export function SleepTimeline({ sessions, onDeleteSession }: SleepTimelineProps) {
  const overlappingSessions = useMemo(() => findOverlappingSessions(sessions), [sessions]);
  const hasOverlaps = overlappingSessions.size > 0;
  
  const nightGroups = useMemo(() => {
    const groups = groupSessionsByNight(sessions);
    // Sort by date descending (newest first)
    return Array.from(groups.entries())
      .sort((a, b) => b[0].localeCompare(a[0]));
  }, [sessions]);
  
  if (sessions.length === 0) {
    return null;
  }
  
  // Calculate position and width for a session bar on a 24-hour timeline
  // Timeline goes from 18:00 to 12:00 next day (18 hours)
  const getSessionBarStyle = (session: SleepSession) => {
    const start = new Date(session.sleep_start);
    const end = session.sleep_end ? new Date(session.sleep_end) : new Date();
    
    // Convert to minutes from 18:00
    let startMinutes = (start.getHours() - 18) * 60 + start.getMinutes();
    if (startMinutes < 0) startMinutes += 24 * 60; // Wrap around
    
    let endMinutes = (end.getHours() - 18) * 60 + end.getMinutes();
    if (endMinutes < 0) endMinutes += 24 * 60;
    if (endMinutes < startMinutes) endMinutes += 24 * 60; // Next day
    
    // Timeline is 18 hours (18:00 - 12:00) = 1080 minutes
    const timelineMinutes = 18 * 60;
    
    const left = Math.max(0, (startMinutes / timelineMinutes) * 100);
    const width = Math.min(100 - left, ((endMinutes - startMinutes) / timelineMinutes) * 100);
    
    return { left: `${left}%`, width: `${Math.max(2, width)}%` };
  };
  
  return (
    <div className="space-y-4">
      {/* Overlap warning */}
      {hasOverlaps && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
          <p className="text-sm text-destructive">
            Er zijn overlappende slaapsessies gevonden. Controleer en verwijder de foutieve sessies.
          </p>
        </div>
      )}
      
      <ScrollArea className="h-[320px] pr-4">
        <div className="space-y-4">
          {nightGroups.map(([nightKey, nightSessions]) => {
            const nightDate = new Date(nightKey);
            const dayLabel = format(nightDate, 'EEEE d MMMM', { locale: nl });
            
            return (
              <div key={nightKey} className="space-y-2">
                {/* Night header */}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium capitalize">{dayLabel}</span>
                  <span className="text-xs text-muted-foreground">→ ochtend</span>
                </div>
                
                {/* Timeline bar container */}
                <div className="relative">
                  {/* Timeline background with hour markers */}
                  <div className="h-12 bg-muted/30 rounded-lg relative overflow-hidden">
                    {/* Hour markers: 18:00, 21:00, 00:00, 03:00, 06:00, 09:00, 12:00 */}
                    {[0, 3, 6, 9, 12, 15, 18].map((hours, i) => (
                      <div 
                        key={i}
                        className="absolute top-0 bottom-0 border-l border-muted-foreground/20"
                        style={{ left: `${(hours / 18) * 100}%` }}
                      />
                    ))}
                    
                    {/* Sleep session bars */}
                    {nightSessions.map((session) => {
                      const style = getSessionBarStyle(session);
                      const isOverlapping = overlappingSessions.has(session.id);
                      const isActive = !session.sleep_end;
                      
                      return (
                        <div
                          key={session.id}
                          className={cn(
                            "absolute top-1 bottom-1 rounded-md flex items-center justify-center transition-all cursor-pointer group",
                            isActive 
                              ? "bg-indigo-400/60 animate-pulse" 
                              : "bg-indigo-500/80 hover:bg-indigo-600/90",
                            isOverlapping && "ring-2 ring-destructive ring-offset-1"
                          )}
                          style={style}
                          title={`${format(new Date(session.sleep_start), 'HH:mm')} - ${session.sleep_end ? format(new Date(session.sleep_end), 'HH:mm') : 'nu'}`}
                        >
                          {/* Duration label if bar is wide enough */}
                          {session.duration_minutes && session.duration_minutes > 120 && (
                            <span className="text-xs font-medium text-white truncate px-1">
                              {(session.duration_minutes / 60).toFixed(1)}u
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Hour labels */}
                  <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
                    <span>18:00</span>
                    <span>21:00</span>
                    <span>00:00</span>
                    <span>03:00</span>
                    <span>06:00</span>
                    <span>09:00</span>
                    <span>12:00</span>
                  </div>
                </div>
                
                {/* Session details list */}
                <div className="space-y-1">
                  {nightSessions.map((session) => {
                    const isOverlapping = overlappingSessions.has(session.id);
                    const startTime = format(new Date(session.sleep_start), 'HH:mm');
                    const endTime = session.sleep_end 
                      ? format(new Date(session.sleep_end), 'HH:mm') 
                      : 'bezig...';
                    const duration = session.duration_minutes 
                      ? `${(session.duration_minutes / 60).toFixed(1)}u` 
                      : '';
                    
                    return (
                      <div 
                        key={session.id}
                        className={cn(
                          "flex items-center justify-between p-2 rounded-lg text-sm",
                          isOverlapping 
                            ? "bg-destructive/10 border border-destructive/30" 
                            : "bg-muted/50"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          {isOverlapping && (
                            <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                          )}
                          <span className="font-medium">{startTime}</span>
                          <span className="text-muted-foreground">→</span>
                          <span className="font-medium">{endTime}</span>
                          {duration && (
                            <span className="text-muted-foreground">({duration})</span>
                          )}
                          {session.quality_score && (
                            <Badge variant="secondary" className="text-xs">
                              Score {session.quality_score}
                            </Badge>
                          )}
                        </div>
                        {onDeleteSession && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => onDeleteSession(session.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

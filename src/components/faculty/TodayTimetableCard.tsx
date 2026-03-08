import { Calendar, Clock, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface TimetableEntry {
  id: string;
  subject: string;
  section: string;
  hour_number: number;
}

interface TodayTimetableCardProps {
  classes: TimetableEntry[];
  currentPeriod: number | null;
}

const HOUR_TIMES: Record<number, string> = {
  1: '9:00 - 9:50',
  2: '9:50 - 10:40',
  3: '10:55 - 11:45',
  4: '11:45 - 12:35',
  5: '1:30 - 2:20',
  6: '2:20 - 3:10',
  7: '3:10 - 4:00',
  8: '4:00 - 4:50',
};

export function TodayTimetableCard({ classes, currentPeriod }: TodayTimetableCardProps) {
  const navigate = useNavigate();
  const sorted = [...classes].sort((a, b) => a.hour_number - b.hour_number);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Calendar className="h-5 w-5 text-primary" />
          Today's Schedule
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={() => navigate('/faculty/timetable')} className="text-xs text-muted-foreground">
          Full Timetable <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No classes today 🎉</p>
        ) : (
          <div className="space-y-2">
            {sorted.map((cls) => {
              const isCurrent = currentPeriod === cls.hour_number;
              const isPast = currentPeriod !== null && cls.hour_number < currentPeriod;
              return (
                <div
                  key={cls.id}
                  className={`flex items-center justify-between p-2.5 rounded-lg border transition-colors ${
                    isCurrent
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : isPast
                      ? 'border-border/50 bg-muted/30 opacity-60'
                      : 'border-border bg-card'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${
                      isCurrent ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    }`}>
                      {cls.hour_number}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{cls.subject}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {HOUR_TIMES[cls.hour_number] || `Hour ${cls.hour_number}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{cls.section}</Badge>
                    {isCurrent && <Badge className="text-xs bg-primary">Now</Badge>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

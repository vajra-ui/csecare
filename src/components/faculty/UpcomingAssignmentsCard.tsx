import { BookOpen, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface Assignment {
  id: string;
  title: string;
  subject: string;
  section: string;
  due_date: string;
  submission_count: number;
}

interface UpcomingAssignmentsCardProps {
  assignments: Assignment[];
}

export function UpcomingAssignmentsCard({ assignments }: UpcomingAssignmentsCardProps) {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <BookOpen className="h-5 w-5 text-accent-foreground" />
          Upcoming Deadlines
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={() => navigate('/faculty/assignments')} className="text-xs text-muted-foreground">
          All <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
      </CardHeader>
      <CardContent>
        {assignments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No upcoming assignments</p>
        ) : (
          <div className="space-y-2">
            {assignments.map((a) => {
              const due = new Date(a.due_date);
              const now = new Date();
              const daysLeft = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              const isUrgent = daysLeft <= 2;
              return (
                <div key={a.id} className="flex items-center justify-between p-2.5 rounded-lg border">
                  <div>
                    <p className="text-sm font-medium">{a.title}</p>
                    <p className="text-xs text-muted-foreground">{a.subject} • {a.section}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant={isUrgent ? 'destructive' : 'secondary'} className="text-xs">
                      {daysLeft <= 0 ? 'Overdue' : `${daysLeft}d left`}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">{a.submission_count} submitted</p>
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

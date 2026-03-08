import { FileText, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface Submission {
  id: string;
  student_name: string;
  assignment_title: string;
  submitted_at: string;
  grade: string | null;
}

interface RecentSubmissionsCardProps {
  submissions: Submission[];
}

export function RecentSubmissionsCard({ submissions }: RecentSubmissionsCardProps) {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-5 w-5 text-primary" />
          Recent Submissions
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={() => navigate('/faculty/assignments')} className="text-xs text-muted-foreground">
          Grade <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
      </CardHeader>
      <CardContent>
        {submissions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No recent submissions</p>
        ) : (
          <div className="space-y-2">
            {submissions.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-2.5 rounded-lg border">
                <div>
                  <p className="text-sm font-medium">{s.student_name}</p>
                  <p className="text-xs text-muted-foreground">{s.assignment_title}</p>
                </div>
                <div className="text-right">
                  {s.grade ? (
                    <Badge variant="secondary" className="text-xs">Graded: {s.grade}</Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs border-warning text-warning-foreground">Ungraded</Badge>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(s.submitted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import { AlertTriangle, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface AtRiskStudent {
  id: string;
  name: string;
  roll_number: string;
  attendance_pct: number;
  cgpa: number | null;
}

interface AtRiskStudentsCardProps {
  students: AtRiskStudent[];
}

export function AtRiskStudentsCard({ students }: AtRiskStudentsCardProps) {
  const navigate = useNavigate();

  return (
    <Card className="border-destructive/20">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          At-Risk Students
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={() => navigate('/faculty/students')} className="text-xs text-muted-foreground">
          View All <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
      </CardHeader>
      <CardContent>
        {students.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">All students are performing well ✅</p>
        ) : (
          <div className="space-y-2">
            {students.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-2.5 rounded-lg border border-destructive/10 bg-destructive/5">
                <div>
                  <p className="text-sm font-medium">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.roll_number}</p>
                </div>
                <div className="flex gap-2">
                  {s.attendance_pct < 75 && (
                    <Badge variant="destructive" className="text-xs">{s.attendance_pct.toFixed(0)}% Att</Badge>
                  )}
                  {s.cgpa !== null && s.cgpa < 5.0 && (
                    <Badge variant="destructive" className="text-xs">{s.cgpa} CGPA</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

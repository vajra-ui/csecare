import { ClipboardCheck, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface TimetableEntry {
  subject: string;
  section: string;
  hour_number: number;
}

interface QuickAttendanceCardProps {
  currentClass: TimetableEntry | null;
  nextClass: TimetableEntry | null;
}

export function QuickAttendanceCard({ currentClass, nextClass }: QuickAttendanceCardProps) {
  const navigate = useNavigate();
  const targetClass = currentClass || nextClass;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardCheck className="h-5 w-5 text-primary" />
          Quick Attendance
        </CardTitle>
      </CardHeader>
      <CardContent>
        {targetClass ? (
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium">{targetClass.subject}</p>
              <p className="text-xs text-muted-foreground">
                {currentClass ? 'Current class' : 'Next class'} • Hour {targetClass.hour_number} • {targetClass.section}
              </p>
            </div>
            <Button className="w-full" onClick={() => navigate('/faculty/attendance')}>
              Mark Attendance <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        ) : (
          <div className="text-center py-2">
            <p className="text-sm text-muted-foreground">No upcoming classes today</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => navigate('/faculty/attendance')}>
              View Attendance
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import { BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TeachingStatsCardProps {
  classesThisMonth: number;
  avgAttendance: number;
  totalStudentsTaught: number;
}

export function TeachingStatsCard({ classesThisMonth, avgAttendance, totalStudentsTaught }: TeachingStatsCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-5 w-5 text-primary" />
          Your Teaching Stats
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold">{classesThisMonth}</p>
            <p className="text-xs text-muted-foreground">Classes this month</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{avgAttendance > 0 ? `${avgAttendance}%` : '-'}</p>
            <p className="text-xs text-muted-foreground">Avg attendance</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{totalStudentsTaught}</p>
            <p className="text-xs text-muted-foreground">Students taught</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

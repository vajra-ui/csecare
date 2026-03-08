import { Cake } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface BirthdayStudent {
  id: string;
  name: string;
  roll_number: string;
}

interface StudentBirthdaysCardProps {
  students: BirthdayStudent[];
}

export function StudentBirthdaysCard({ students }: StudentBirthdaysCardProps) {
  if (students.length === 0) return null;

  return (
    <Card className="border-warning/30 bg-gradient-to-br from-warning/5 to-transparent">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Cake className="h-5 w-5 text-warning" />
          Birthdays Today 🎉
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {students.map((s) => (
            <div key={s.id} className="flex items-center gap-3 p-2 rounded-lg bg-warning/10">
              <div className="h-8 w-8 rounded-full bg-warning/20 flex items-center justify-center text-sm font-bold">
                🎂
              </div>
              <div>
                <p className="text-sm font-medium">{s.name}</p>
                <p className="text-xs text-muted-foreground">{s.roll_number}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

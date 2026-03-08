import { useState, useEffect } from 'react';
import { StudentLayout } from '@/components/layouts/StudentLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Clock, MapPin } from 'lucide-react';

export default function StudentExamTimetable() {
  const { user } = useAuth();
  const [exams, setExams] = useState<any[]>([]);
  const [studentSection, setStudentSection] = useState('');

  useEffect(() => { if (user?.studentId) init(); }, [user]);

  const init = async () => {
    const { data: student } = await supabase.from('students').select('section, year').eq('id', user!.studentId!).single();
    if (!student) return;
    setStudentSection(student.section);
    const { data } = await supabase.from('exam_timetable').select('*')
      .eq('section', student.section as any).eq('year', student.year as any)
      .order('exam_date', { ascending: true });
    setExams(data || []);
  };

  const grouped = exams.reduce<Record<string, any[]>>((acc, e) => {
    if (!acc[e.exam_name]) acc[e.exam_name] = [];
    acc[e.exam_name].push(e);
    return acc;
  }, {});

  const isUpcoming = (date: string) => new Date(date) >= new Date(new Date().toDateString());
  const isToday = (date: string) => new Date(date).toDateString() === new Date().toDateString();

  return (
    <StudentLayout>
      <div className="space-y-6">
        <h1 className="font-display text-2xl md:text-3xl font-bold">Exam Timetable</h1>

        {exams.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p>No exams scheduled yet for {studentSection}.</p>
          </CardContent></Card>
        ) : (
          Object.entries(grouped).map(([examName, examList]) => (
            <Card key={examName}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  {examName}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {examList.map(exam => {
                    const upcoming = isUpcoming(exam.exam_date);
                    const today = isToday(exam.exam_date);
                    return (
                      <div key={exam.id} className={`flex items-center justify-between p-3 rounded-lg border ${today ? 'border-primary bg-primary/5 shadow-sm' : upcoming ? 'border-border' : 'border-border/50 opacity-60'}`}>
                        <div className="flex items-center gap-4">
                          <div className={`text-center min-w-16 p-2 rounded ${today ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                            <p className="text-lg font-bold">{new Date(exam.exam_date).getDate()}</p>
                            <p className="text-xs">{new Date(exam.exam_date).toLocaleDateString('en-IN', { month: 'short' })}</p>
                          </div>
                          <div>
                            <p className="font-medium">{exam.subject}</p>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                              <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {exam.start_time?.slice(0,5)} - {exam.end_time?.slice(0,5)}</span>
                              {exam.venue && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {exam.venue}</span>}
                            </div>
                          </div>
                        </div>
                        <div>
                          {today && <Badge className="bg-primary">Today</Badge>}
                          {!today && upcoming && <Badge variant="outline">Upcoming</Badge>}
                          {!upcoming && !today && <Badge variant="secondary">Done</Badge>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </StudentLayout>
  );
}

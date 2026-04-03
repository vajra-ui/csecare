import { useEffect, useState } from 'react';
import { Users, ShieldCheck, BookOpen, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface FacultyInfo {
  id: string;
  name: string;
  faculty_id: string;
  qualification: string | null;
  current_subjects: string[] | null;
  is_tutor: boolean;
  section: string | null;
}

interface MyFacultiesCardProps {
  studentSection: string | null;
}

export function MyFacultiesCard({ studentSection }: MyFacultiesCardProps) {
  const [faculties, setFaculties] = useState<FacultyInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (studentSection) fetchFaculties();
    else setLoading(false);
  }, [studentSection]);

  const fetchFaculties = async () => {
    try {
      // Get faculty IDs from timetable for this section
      const { data: timetableData } = await supabase
        .from('timetable')
        .select('faculty_id')
        .eq('section', studentSection as any);

      const facultyIdsFromTimetable = Array.from(
        new Set((timetableData || []).map(t => t.faculty_id))
      );

      // Get the section tutor
      const { data: tutorData } = await supabase
        .from('faculty')
        .select('id, name, faculty_id, qualification, current_subjects, is_tutor, section')
        .eq('section', studentSection as any)
        .eq('is_tutor', true);

      // Get teaching faculty from timetable
      let teachingFaculty: FacultyInfo[] = [];
      if (facultyIdsFromTimetable.length > 0) {
        const { data } = await supabase
          .from('faculty')
          .select('id, name, faculty_id, qualification, current_subjects, is_tutor, section')
          .in('id', facultyIdsFromTimetable);
        teachingFaculty = (data || []) as FacultyInfo[];
      }

      // Merge: tutor on top, then unique teaching faculty
      const tutors = (tutorData || []) as FacultyInfo[];
      const tutorIds = new Set(tutors.map(t => t.id));
      const others = teachingFaculty.filter(f => !tutorIds.has(f.id));

      setFaculties([...tutors, ...others]);
    } catch (error) {
      console.error('Error fetching faculties:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (faculties.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          My Faculties
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {faculties.map((f) => (
          <div
            key={f.id}
            className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/50"
          >
            <div className="mt-0.5">
              {f.is_tutor && f.section === studentSection ? (
                <ShieldCheck className="h-4 w-4 text-success" />
              ) : (
                <BookOpen className="h-4 w-4 text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium text-sm">{f.name}</p>
                {f.is_tutor && f.section === studentSection && (
                  <Badge variant="default" className="text-[10px] px-1.5 py-0">
                    Tutor
                  </Badge>
                )}
              </div>
              {f.qualification && (
                <p className="text-xs text-muted-foreground">{f.qualification}</p>
              )}
              {f.current_subjects && f.current_subjects.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {f.current_subjects.map((s) => (
                    <Badge key={s} variant="outline" className="text-[10px]">
                      {s}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

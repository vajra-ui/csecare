import { useState, useEffect } from 'react';
import { FacultyLayout } from '@/components/layouts/FacultyLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Save, Search, Upload, Download } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { parseCSV, downloadCSV } from '@/lib/csvExport';

export default function FacultyMarks() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [facultyDbId, setFacultyDbId] = useState('');
  const [sections, setSections] = useState<string[]>([]);
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [semester, setSemester] = useState('1');
  const [subjects, setSubjects] = useState<string[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [scores, setScores] = useState<Record<string, { internal: string; external: string; grade: string }>>({});
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (user?.facultyId) fetchFacultyInfo();
  }, [user]);

  const fetchFacultyInfo = async () => {
    const { data: faculty } = await supabase.from('faculty').select('id, current_subjects, section').eq('faculty_id', user?.facultyId).single();
    if (!faculty) return;
    setFacultyDbId(faculty.id);
    setSubjects(faculty.current_subjects || []);
    // Get sections from timetable
    const { data: tt } = await supabase.from('timetable').select('section').eq('faculty_id', faculty.id);
    const uniqueSections = [...new Set((tt || []).map((t: any) => t.section))];
    setSections(uniqueSections as string[]);
  };

  const fetchStudents = async () => {
    if (!selectedSection || !selectedSubject) return;
    setLoading(true);
    const { data: studentList } = await supabase.from('students').select('id, name, roll_number').eq('section', selectedSection as any).order('roll_number');
    if (!studentList) { setLoading(false); return; }
    setStudents(studentList);

    // Fetch existing scores
    const studentIds = studentList.map(s => s.id);
    const { data: existingScores } = await supabase.from('subject_scores')
      .select('*').in('student_id', studentIds).eq('subject_name', selectedSubject).eq('semester', parseInt(semester));

    const scoreMap: Record<string, { internal: string; external: string; grade: string }> = {};
    (existingScores || []).forEach((s: any) => {
      scoreMap[s.student_id] = {
        internal: s.internal_marks?.toString() || '',
        external: s.external_marks?.toString() || '',
        grade: s.grade || '',
      };
    });
    studentList.forEach(s => {
      if (!scoreMap[s.id]) scoreMap[s.id] = { internal: '', external: '', grade: '' };
    });
    setScores(scoreMap);
    setLoading(false);
  };

  useEffect(() => {
    if (selectedSection && selectedSubject && semester) fetchStudents();
  }, [selectedSection, selectedSubject, semester]);

  const updateScore = (studentId: string, field: 'internal' | 'external' | 'grade', value: string) => {
    setScores(prev => ({ ...prev, [studentId]: { ...prev[studentId], [field]: value } }));
  };

  const saveAll = async () => {
    setLoading(true);
    try {
      for (const student of students) {
        const s = scores[student.id];
        if (!s) continue;
        const internal = s.internal ? parseFloat(s.internal) : null;
        const external = s.external ? parseFloat(s.external) : null;
        const total = (internal || 0) + (external || 0);

        const { data: existing } = await supabase.from('subject_scores')
          .select('id').eq('student_id', student.id).eq('subject_name', selectedSubject).eq('semester', parseInt(semester)).maybeSingle();

        if (existing) {
          await supabase.from('subject_scores').update({
            internal_marks: internal, external_marks: external, total_marks: total, grade: s.grade || null,
          }).eq('id', existing.id);
        } else if (internal !== null || external !== null) {
          await supabase.from('subject_scores').insert({
            student_id: student.id, subject_name: selectedSubject, semester: parseInt(semester),
            internal_marks: internal, external_marks: external, total_marks: total, grade: s.grade || null,
            uploaded_by: facultyDbId,
          });
        }
      }
      toast({ title: 'Saved', description: 'All marks have been saved successfully.' });
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to save marks.', variant: 'destructive' });
    }
    setLoading(false);
  };

  const filtered = students.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.roll_number.toLowerCase().includes(search.toLowerCase()));

  return (
    <FacultyLayout>
      <div className="space-y-6">
        <h1 className="font-display text-2xl md:text-3xl font-bold">Internal Marks Entry</h1>

        <Card>
          <CardHeader><CardTitle>Select Class & Subject</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <Select value={selectedSection} onValueChange={setSelectedSection}>
                <SelectTrigger><SelectValue placeholder="Section" /></SelectTrigger>
                <SelectContent>{sections.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger><SelectValue placeholder="Subject" /></SelectTrigger>
                <SelectContent>{subjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={semester} onValueChange={setSemester}>
                <SelectTrigger><SelectValue placeholder="Semester" /></SelectTrigger>
                <SelectContent>{[1,2,3,4,5,6,7,8].map(s => <SelectItem key={s} value={s.toString()}>Semester {s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {students.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Mark Sheet — {selectedSubject} ({selectedSection})</CardTitle>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 w-48" />
                </div>
                <Button onClick={saveAll} disabled={loading}><Save className="h-4 w-4 mr-2" /> Save All</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Roll No</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="w-28">Internal</TableHead>
                      <TableHead className="w-28">External</TableHead>
                      <TableHead className="w-20">Total</TableHead>
                      <TableHead className="w-24">Grade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((student, i) => {
                      const s = scores[student.id] || { internal: '', external: '', grade: '' };
                      const total = (parseFloat(s.internal) || 0) + (parseFloat(s.external) || 0);
                      return (
                        <TableRow key={student.id}>
                          <TableCell>{i + 1}</TableCell>
                          <TableCell className="font-mono text-xs">{student.roll_number}</TableCell>
                          <TableCell>{student.name}</TableCell>
                          <TableCell>
                            <Input type="number" value={s.internal} onChange={e => updateScore(student.id, 'internal', e.target.value)} className="h-8" min="0" max="50" />
                          </TableCell>
                          <TableCell>
                            <Input type="number" value={s.external} onChange={e => updateScore(student.id, 'external', e.target.value)} className="h-8" min="0" max="100" />
                          </TableCell>
                          <TableCell><Badge variant="outline">{total || '-'}</Badge></TableCell>
                          <TableCell>
                            <Select value={s.grade} onValueChange={v => updateScore(student.id, 'grade', v)}>
                              <SelectTrigger className="h-8"><SelectValue placeholder="-" /></SelectTrigger>
                              <SelectContent>{['O','A+','A','B+','B','C','U'].map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </FacultyLayout>
  );
}

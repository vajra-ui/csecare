import { useState, useEffect } from 'react';
import { StudentLayout } from '@/components/layouts/StudentLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Star, Send, CheckCircle } from 'lucide-react';

export default function StudentFeedback() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [faculty, setFaculty] = useState<any[]>([]);
  const [selectedFaculty, setSelectedFaculty] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [semester, setSemester] = useState('1');
  const [ratings, setRatings] = useState({ rating: 0, teaching_quality: 0, communication: 0, punctuality: 0 });
  const [comments, setComments] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [studentSection, setStudentSection] = useState('');

  useEffect(() => { if (user?.studentId) init(); }, [user]);

  const init = async () => {
    const { data: student } = await supabase.from('students').select('section').eq('id', user!.studentId!).single();
    if (!student) return;
    setStudentSection(student.section);
    // Get faculty teaching this section from timetable
    const { data: tt } = await supabase.from('timetable').select('faculty_id, subject').eq('section', student.section as any);
    if (!tt || tt.length === 0) return;
    
    // Get unique faculty IDs
    const facultyIds = [...new Set(tt.map(t => t.faculty_id))];
    
    // Fetch faculty details separately
    const { data: facultyRecords } = await supabase.from('faculty').select('id, name').in('id', facultyIds);
    if (!facultyRecords) return;
    
    const facultyMap = new Map(facultyRecords.map(f => [f.id, f]));
    const uniqueFaculty = new Map<string, { id: string; name: string; subjects: string[] }>();
    
    tt.forEach(t => {
      const f = facultyMap.get(t.faculty_id);
      if (f && !uniqueFaculty.has(f.id)) {
        uniqueFaculty.set(f.id, { id: f.id, name: f.name, subjects: [] });
      }
      if (f) uniqueFaculty.get(f.id)!.subjects.push(t.subject);
    });
    setFaculty(Array.from(uniqueFaculty.values()));
  };

  const StarRating = ({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) => (
    <div className="flex items-center justify-between">
      <span className="text-sm">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(i => (
          <button key={i} onClick={() => onChange(i)} className="transition-transform hover:scale-110">
            <Star className={`h-6 w-6 ${i <= value ? 'fill-warning text-warning' : 'text-muted-foreground/30'}`} />
          </button>
        ))}
      </div>
    </div>
  );

  const submitFeedback = async () => {
    if (!selectedFaculty || !selectedSubject || ratings.rating === 0) {
      toast({ title: 'Please fill all required fields', variant: 'destructive' }); return;
    }
    setLoading(true);
    try {
      await supabase.from('faculty_feedback').insert({
        faculty_id: selectedFaculty, subject: selectedSubject, section: studentSection as any,
        rating: ratings.rating, teaching_quality: ratings.teaching_quality || null,
        communication: ratings.communication || null, punctuality: ratings.punctuality || null,
        comments: comments || null, semester: parseInt(semester),
      });
      setSubmitted(true);
      toast({ title: 'Thank you!', description: 'Your anonymous feedback has been submitted.' });
    } catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
    setLoading(false);
  };

  if (submitted) {
    return (
      <StudentLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-md w-full">
            <CardContent className="pt-12 pb-8 text-center space-y-4">
              <CheckCircle className="h-16 w-16 mx-auto text-green-500" />
              <h2 className="text-2xl font-bold">Feedback Submitted!</h2>
              <p className="text-muted-foreground">Your anonymous feedback has been recorded. Thank you for helping us improve.</p>
              <Button onClick={() => { setSubmitted(false); setRatings({ rating: 0, teaching_quality: 0, communication: 0, punctuality: 0 }); setComments(''); setSelectedFaculty(''); setSelectedSubject(''); }}>
                Submit Another
              </Button>
            </CardContent>
          </Card>
        </div>
      </StudentLayout>
    );
  }

  const selectedFacultyData = faculty.find(f => f.id === selectedFaculty);

  return (
    <StudentLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold">Faculty Feedback</h1>
          <p className="text-muted-foreground text-sm">Your feedback is completely anonymous and helps improve teaching quality.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Select Faculty & Subject</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Select value={selectedFaculty} onValueChange={v => { setSelectedFaculty(v); setSelectedSubject(''); }}>
                <SelectTrigger><SelectValue placeholder="Select Faculty" /></SelectTrigger>
                <SelectContent>{faculty.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
              </Select>
              {selectedFacultyData && (
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger><SelectValue placeholder="Select Subject" /></SelectTrigger>
                  <SelectContent>{[...new Set(selectedFacultyData.subjects)].map((s: any) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              )}
              <Select value={semester} onValueChange={setSemester}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{[1,2,3,4,5,6,7,8].map(s => <SelectItem key={s} value={s.toString()}>Semester {s}</SelectItem>)}</SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Rate Your Experience</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <StarRating label="Overall Rating *" value={ratings.rating} onChange={v => setRatings({ ...ratings, rating: v })} />
              <StarRating label="Teaching Quality" value={ratings.teaching_quality} onChange={v => setRatings({ ...ratings, teaching_quality: v })} />
              <StarRating label="Communication" value={ratings.communication} onChange={v => setRatings({ ...ratings, communication: v })} />
              <StarRating label="Punctuality" value={ratings.punctuality} onChange={v => setRatings({ ...ratings, punctuality: v })} />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Additional Comments (optional)</CardTitle></CardHeader>
          <CardContent>
            <Textarea placeholder="Share your thoughts... (anonymous)" value={comments} onChange={e => setComments(e.target.value)} rows={4} />
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={submitFeedback} disabled={loading} size="lg">
            <Send className="h-4 w-4 mr-2" /> {loading ? 'Submitting...' : 'Submit Feedback'}
          </Button>
        </div>

        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground text-center">
              🔒 Your identity is not linked to this feedback. Faculty will only see aggregated ratings and anonymous comments.
            </p>
          </CardContent>
        </Card>
      </div>
    </StudentLayout>
  );
}

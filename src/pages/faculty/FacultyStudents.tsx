import { useState, useEffect } from 'react';
import { Users, Search, Loader2, Eye, FileText, Award, ShieldCheck } from 'lucide-react';
import { FacultyLayout } from '@/components/layouts/FacultyLayout';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';

interface Student {
  id: string;
  name: string;
  roll_number: string;
  register_number: string;
  section: string;
  year: string;
  dob: string;
  user_id: string | null;
  profile_photo_url?: string | null;
}

interface DocRecord {
  id: string;
  category: string;
  file_name: string;
  file_url: string;
  description: string | null;
  subject: string | null;
  created_at: string;
}

export default function FacultyStudents() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentDocs, setStudentDocs] = useState<DocRecord[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: faculty } = await supabase
        .from('faculty')
        .select('id, section')
        .eq('user_id', user.id)
        .single();

      if (faculty) {
        let query = supabase.from('students').select('*').order('roll_number');
        if (faculty.section) {
          query = query.eq('section', faculty.section as any);
        } else {
          query = query.eq('tutor_id', faculty.id);
        }

        const { data, error } = await query;
        if (error) throw error;
        setStudents((data as any as Student[]) || []);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const viewStudentDocs = async (student: Student) => {
    setSelectedStudent(student);
    setDocsLoading(true);
    try {
      const { data } = await supabase
        .from('student_documents' as any)
        .select('*')
        .eq('student_id', student.id)
        .order('created_at', { ascending: false });

      setStudentDocs((data as any as DocRecord[]) || []);
    } catch (error) {
      console.error('Error fetching docs:', error);
    } finally {
      setDocsLoading(false);
    }
  };

  const getSignedUrl = async (filePath: string) => {
    const { data } = await supabase.storage
      .from('student-documents')
      .createSignedUrl(filePath, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  };

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.roll_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getDocsByCategory = (category: string) => studentDocs.filter(d => d.category === category);

  const DocTable = ({ docs, showSubject }: { docs: DocRecord[]; showSubject?: boolean }) => (
    docs.length === 0 ? (
      <p className="text-center text-muted-foreground py-4">No documents uploaded.</p>
    ) : (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>File</TableHead>
            {showSubject && <TableHead>Subject</TableHead>}
            <TableHead>Description</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {docs.map(doc => (
            <TableRow key={doc.id}>
              <TableCell>
                <button
                  onClick={() => getSignedUrl(doc.file_url)}
                  className="text-primary hover:underline font-medium text-sm"
                >
                  {doc.file_name}
                </button>
              </TableCell>
              {showSubject && <TableCell>{doc.subject || '-'}</TableCell>}
              <TableCell className="text-sm">{doc.description || '-'}</TableCell>
              <TableCell className="text-sm">{new Date(doc.created_at).toLocaleDateString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
  );

  return (
    <FacultyLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Users className="h-7 w-7 text-primary" />
            My Students
          </h1>
          <p className="text-muted-foreground text-sm">Students assigned to you — view their profiles and documents</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or roll number..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Badge variant="secondary">{filteredStudents.length} students</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No students assigned to you yet.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Photo</TableHead>
                    <TableHead>Roll Number</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Register Number</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead>Year</TableHead>
                    <TableHead>Documents</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map(student => (
                    <TableRow key={student.id}>
                      <TableCell>
                        <Avatar className="h-8 w-8">
                          {student.profile_photo_url ? (
                            <AvatarImage src={student.profile_photo_url} alt={student.name} />
                          ) : null}
                          <AvatarFallback className="text-xs">{student.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell className="font-mono">{student.roll_number}</TableCell>
                      <TableCell className="font-medium">{student.name}</TableCell>
                      <TableCell>{student.register_number}</TableCell>
                      <TableCell><Badge variant="outline">{student.section}</Badge></TableCell>
                      <TableCell>{student.year}</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" onClick={() => viewStudentDocs(student)}>
                          <Eye className="h-4 w-4 mr-1" /> View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Student Documents Dialog */}
      <Dialog open={!!selectedStudent} onOpenChange={() => setSelectedStudent(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                {selectedStudent?.profile_photo_url ? (
                  <AvatarImage src={selectedStudent.profile_photo_url} alt={selectedStudent?.name} />
                ) : null}
                <AvatarFallback>{selectedStudent?.name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <p>{selectedStudent?.name}</p>
                <p className="text-sm font-normal text-muted-foreground">{selectedStudent?.roll_number} • {selectedStudent?.section}</p>
              </div>
            </DialogTitle>
          </DialogHeader>

          {docsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Tabs defaultValue="assignment">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="assignment" className="text-xs sm:text-sm"><FileText className="h-4 w-4 mr-1" /> Assignments</TabsTrigger>
                <TabsTrigger value="certificate" className="text-xs sm:text-sm"><Award className="h-4 w-4 mr-1" /> Certificates</TabsTrigger>
                <TabsTrigger value="kyc" className="text-xs sm:text-sm"><ShieldCheck className="h-4 w-4 mr-1" /> KYC</TabsTrigger>
              </TabsList>
              <TabsContent value="assignment">
                <DocTable docs={getDocsByCategory('assignment')} showSubject />
              </TabsContent>
              <TabsContent value="certificate">
                <DocTable docs={getDocsByCategory('certificate')} />
              </TabsContent>
              <TabsContent value="kyc">
                <DocTable docs={getDocsByCategory('kyc')} />
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </FacultyLayout>
  );
}

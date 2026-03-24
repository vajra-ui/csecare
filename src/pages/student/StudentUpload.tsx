import { useState, useEffect, useRef } from 'react';
import { Upload, Loader2, FileText, Trash2, Award, ShieldCheck } from 'lucide-react';
import { StudentLayout } from '@/components/layouts/StudentLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface DocRecord {
  id: string;
  category: string;
  file_name: string;
  file_url: string;
  description: string | null;
  subject: string | null;
  created_at: string;
}

const CATEGORIES = [
  { key: 'assignment', label: 'Assignments', icon: FileText, description: 'Upload your assignment files' },
  { key: 'certificate', label: 'Certificates & Marksheets', icon: Award, description: 'Upload verification certificates and marksheets' },
  { key: 'kyc', label: 'KYC Documents', icon: ShieldCheck, description: 'Upload identity & address proof documents' },
] as const;

export default function StudentUpload() {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState<DocRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [studentData, setStudentData] = useState<{ id: string; section: string } | null>(null);
  const [activeTab, setActiveTab] = useState('assignment');
  const [uploadDesc, setUploadDesc] = useState('');
  const [uploadSubject, setUploadSubject] = useState('');

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data: student } = await supabase
        .from('students')
        .select('id, section')
        .eq('user_id', authUser.id)
        .single();

      if (student) {
        setStudentData(student);

        const { data: docs } = await supabase
          .from('student_documents' as any)
          .select('*')
          .eq('user_id', authUser.id)
          .order('created_at', { ascending: false });

        setDocuments((docs as any as DocRecord[]) || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !studentData) return;

    if (file.size > 20 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Max file size is 20MB.', variant: 'destructive' });
      return;
    }

    // Server-side file type validation
    const allowedExtensions = ['pdf', 'doc', 'docx', 'zip', 'ppt', 'pptx', 'jpg', 'jpeg', 'png', 'txt'];
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !allowedExtensions.includes(ext)) {
      toast({ title: 'Invalid file type', description: `Only ${allowedExtensions.join(', ')} files are allowed.`, variant: 'destructive' });
      return;
    }

    // Block executable or dangerous file types
    const dangerousTypes = ['exe', 'bat', 'cmd', 'sh', 'js', 'vbs', 'msi', 'jar', 'php', 'py', 'rb'];
    if (dangerousTypes.includes(ext)) {
      toast({ title: 'Blocked', description: 'This file type is not allowed for security reasons.', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const ext = file.name.split('.').pop();
      const filePath = `${authUser.id}/${activeTab}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('student-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get signed URL for private bucket
      const { data: urlData } = await supabase.storage
        .from('student-documents')
        .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 year

      const { error: insertError } = await supabase
        .from('student_documents' as any)
        .insert({
          student_id: studentData.id,
          user_id: authUser.id,
          category: activeTab,
          file_name: file.name,
          file_url: filePath,
          description: uploadDesc || null,
          subject: uploadSubject || null,
        } as any);

      if (insertError) throw insertError;

      // If uploading assignment, notify the tutor/faculty of the student's section
      if (activeTab === 'assignment') {
        const { data: student } = await supabase
          .from('students')
          .select('name, roll_number, section, tutor_id')
          .eq('id', studentData.id)
          .single();

        if (student?.tutor_id) {
          const { data: tutor } = await supabase
            .from('faculty')
            .select('user_id')
            .eq('id', student.tutor_id)
            .single();

          if (tutor?.user_id) {
            await supabase.from('notifications').insert({
              user_id: tutor.user_id,
              title: 'New Document Upload',
              message: `${student.name} (${student.roll_number}) uploaded an assignment document: ${file.name}${uploadSubject ? ` — ${uploadSubject}` : ''}`,
              type: 'document',
              link: '/faculty/students',
            });
          }
        }
      }

      toast({ title: 'Uploaded', description: `${file.name} uploaded successfully.` });
      setUploadDesc('');
      setUploadSubject('');
      fetchData();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (doc: DocRecord) => {
    try {
      // Delete from storage
      await supabase.storage.from('student-documents').remove([doc.file_url]);

      // Delete record
      await supabase.from('student_documents' as any).delete().eq('id', doc.id);

      setDocuments(prev => prev.filter(d => d.id !== doc.id));
      toast({ title: 'Deleted', description: `${doc.file_name} has been removed.` });
    } catch (error: any) {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
    }
  };

  const getSignedUrl = async (filePath: string) => {
    const { data } = await supabase.storage
      .from('student-documents')
      .createSignedUrl(filePath, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  };

  const filteredDocs = documents.filter(d => d.category === activeTab);

  return (
    <StudentLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Upload className="h-7 w-7 text-info" />
            Document Uploads
          </h1>
          <p className="text-muted-foreground text-sm">
            Upload assignments, certificates, and KYC documents
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            {CATEGORIES.map(cat => (
              <TabsTrigger key={cat.key} value={cat.key} className="flex items-center gap-1.5 text-xs sm:text-sm">
                <cat.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{cat.label}</span>
                <span className="sm:hidden">{cat.key === 'assignment' ? 'Assign.' : cat.key === 'certificate' ? 'Certs' : 'KYC'}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {CATEGORIES.map(cat => (
            <TabsContent key={cat.key} value={cat.key} className="space-y-4">
              {/* Upload Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <cat.icon className="h-5 w-5" />
                    Upload {cat.label}
                  </CardTitle>
                  <CardDescription>{cat.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {cat.key === 'assignment' && (
                    <div>
                      <Label>Subject</Label>
                      <Input
                        placeholder="e.g. Data Structures"
                        value={uploadSubject}
                        onChange={e => setUploadSubject(e.target.value)}
                      />
                    </div>
                  )}
                  <div>
                    <Label>Description (optional)</Label>
                    <Input
                      placeholder={
                        cat.key === 'assignment' ? 'e.g. Assignment 1 - Sorting Algorithms' :
                        cat.key === 'certificate' ? 'e.g. Semester 3 Marksheet' :
                        'e.g. Aadhar Card'
                      }
                      value={uploadDesc}
                      onChange={e => setUploadDesc(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Select File</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        ref={fileInputRef}
                        type="file"
                        accept={cat.key === 'assignment' ? '.pdf,.doc,.docx,.zip,.ppt,.pptx' : '.pdf,.jpg,.jpeg,.png'}
                        onChange={handleUpload}
                        disabled={uploading}
                      />
                    </div>
                    {uploading && (
                      <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" /> Uploading...
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Documents List */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Your {cat.label}
                    <Badge variant="secondary" className="ml-2">{filteredDocs.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredDocs.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No {cat.label.toLowerCase()} uploaded yet.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>File</TableHead>
                          {cat.key === 'assignment' && <TableHead>Subject</TableHead>}
                          <TableHead>Description</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead className="w-20">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredDocs.map(doc => (
                          <TableRow key={doc.id}>
                            <TableCell>
                              <button
                                onClick={() => getSignedUrl(doc.file_url)}
                                className="text-primary hover:underline font-medium text-sm truncate max-w-[200px] block text-left"
                              >
                                {doc.file_name}
                              </button>
                            </TableCell>
                            {cat.key === 'assignment' && (
                              <TableCell>{doc.subject || '-'}</TableCell>
                            )}
                            <TableCell className="text-sm max-w-[200px] truncate">
                              {doc.description || '-'}
                            </TableCell>
                            <TableCell className="text-sm">
                              {new Date(doc.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete {doc.file_name}?</AlertDialogTitle>
                                    <AlertDialogDescription>This will permanently remove this file.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(doc)}>Delete</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </StudentLayout>
  );
}

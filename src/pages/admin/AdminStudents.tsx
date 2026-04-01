import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  GraduationCap,
  Plus,
  Search,
  Loader2,
  Pencil,
  Trash2,
} from 'lucide-react';
import { BulkUpload, FieldDef, UploadResult } from '@/components/admin/BulkUpload';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const studentSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  rollNumber: z.string().min(1, 'Roll number is required'),
  registerNumber: z.string().min(1, 'Register number is required'),
  dob: z.string().min(1, 'Date of birth is required'),
  section: z.enum(['CSE A', 'CSE B', 'CSE C', 'CSE D']),
  year: z.enum(['I', 'II', 'III', 'IV']),
});

type StudentFormData = z.infer<typeof studentSchema>;

interface Student {
  id: string;
  name: string;
  roll_number: string;
  register_number: string;
  dob: string;
  section: string;
  year: string;
  user_id: string | null;
  created_at: string;
}

export default function AdminStudents() {
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [csvUploading, setCsvUploading] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const PAGE_SIZE = 50;

  const form = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      name: '',
      rollNumber: '',
      registerNumber: '',
      dob: '',
      section: 'CSE A',
      year: 'I',
    },
  });

  const editForm = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
  });

  useEffect(() => {
    fetchStudents();
  }, [currentPage]);

  const fetchStudents = async () => {
    try {
      const from = (currentPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error, count } = await supabase
        .from('students')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      setStudents(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error fetching students:', error);
      toast({ title: 'Error', description: 'Failed to fetch students', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: StudentFormData) => {
    setCreating(true);
    try {
      const response = await supabase.functions.invoke('create-user', {
        body: {
          type: 'student',
          data: {
            name: data.name,
            rollNumber: data.rollNumber,
            registerNumber: data.registerNumber,
            dob: data.dob,
            section: data.section,
            year: data.year,
          },
        },
      });

      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);

      toast({ title: 'Student Created', description: `${data.name} has been added successfully.` });
      form.reset();
      setIsDialogOpen(false);
      fetchStudents();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create student',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const openEditDialog = (s: Student) => {
    setEditingStudent(s);
    editForm.reset({
      name: s.name,
      rollNumber: s.roll_number,
      registerNumber: s.register_number,
      dob: s.dob,
      section: s.section as StudentFormData['section'],
      year: s.year as StudentFormData['year'],
    });
    setIsEditDialogOpen(true);
  };

  const onEditSubmit = async (data: StudentFormData) => {
    if (!editingStudent) return;
    setCreating(true);
    try {
      const { error } = await supabase
        .from('students')
        .update({
          name: data.name,
          roll_number: data.rollNumber.toUpperCase(),
          register_number: data.registerNumber.toUpperCase(),
          dob: data.dob,
          section: data.section as any,
          year: data.year as any,
        })
        .eq('id', editingStudent.id);

      if (error) throw error;

      toast({ title: 'Student Updated', description: `${data.name} has been updated.` });
      setIsEditDialogOpen(false);
      setEditingStudent(null);
      fetchStudents();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update student',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingStudent) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', deletingStudent.id);

      if (error) throw error;

      toast({ title: 'Student Deleted', description: `${deletingStudent.name} has been removed.` });
      setDeletingStudent(null);
      fetchStudents();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete student',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleCsvUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setCsvUploading(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const requiredHeaders = ['name', 'roll_number', 'register_number', 'dob', 'section', 'year'];
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
      if (missingHeaders.length > 0) throw new Error(`Missing columns: ${missingHeaders.join(', ')}`);

      let successCount = 0, errorCount = 0;
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
        try {
          const response = await supabase.functions.invoke('create-user', {
            body: { type: 'student', data: { name: row.name, rollNumber: row.roll_number, registerNumber: row.register_number, dob: row.dob, section: row.section, year: row.year } },
          });
          if (response.error || response.data?.error) errorCount++; else successCount++;
        } catch { errorCount++; }
      }
      toast({ title: 'CSV Import Complete', description: `${successCount} created, ${errorCount} failed.` });
      fetchStudents();
    } catch (error) {
      toast({ title: 'CSV Import Failed', description: error instanceof Error ? error.message : 'Invalid CSV', variant: 'destructive' });
    } finally {
      setCsvUploading(false);
      event.target.value = '';
    }
  };

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.roll_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.register_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const StudentFormFields = ({ formInstance, onSubmitFn, submitLabel, isSubmitting }: {
    formInstance: typeof form;
    onSubmitFn: (data: StudentFormData) => void;
    submitLabel: string;
    isSubmitting: boolean;
  }) => (
    <Form {...formInstance}>
      <form onSubmit={formInstance.handleSubmit(onSubmitFn)} className="space-y-4">
        <FormField control={formInstance.control} name="name" render={({ field }) => (
          <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <div className="grid grid-cols-2 gap-4">
          <FormField control={formInstance.control} name="rollNumber" render={({ field }) => (
            <FormItem><FormLabel>Roll Number</FormLabel><FormControl><Input placeholder="21CSE001" {...field} onChange={(e) => field.onChange(e.target.value.toUpperCase())} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={formInstance.control} name="registerNumber" render={({ field }) => (
            <FormItem><FormLabel>Register Number</FormLabel><FormControl><Input placeholder="921421104001" {...field} onChange={(e) => field.onChange(e.target.value.toUpperCase())} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
        <FormField control={formInstance.control} name="dob" render={({ field }) => (
          <FormItem><FormLabel>Date of Birth</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <div className="grid grid-cols-2 gap-4">
          <FormField control={formInstance.control} name="section" render={({ field }) => (
            <FormItem><FormLabel>Section</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select section" /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="CSE A">CSE A</SelectItem>
                  <SelectItem value="CSE B">CSE B</SelectItem>
                  <SelectItem value="CSE C">CSE C</SelectItem>
                  <SelectItem value="CSE D">CSE D</SelectItem>
                </SelectContent>
              </Select><FormMessage />
            </FormItem>
          )} />
          <FormField control={formInstance.control} name="year" render={({ field }) => (
            <FormItem><FormLabel>Year</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select year" /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="I">I Year</SelectItem>
                  <SelectItem value="II">II Year</SelectItem>
                  <SelectItem value="III">III Year</SelectItem>
                  <SelectItem value="IV">IV Year</SelectItem>
                </SelectContent>
              </Select><FormMessage />
            </FormItem>
          )} />
        </div>
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); setIsEditDialogOpen(false); }}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold flex items-center gap-2">
              <GraduationCap className="h-6 w-6 md:h-8 md:w-8 text-info" />
              Student Management
            </h1>
            <p className="text-muted-foreground text-sm md:text-base">Add, manage, and view student records</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <label>
              <input type="file" accept=".csv" onChange={handleCsvUpload} className="hidden" disabled={csvUploading} />
              <Button variant="outline" asChild disabled={csvUploading}>
                <span className="cursor-pointer">
                  {csvUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                  Import CSV
                </span>
              </Button>
            </label>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gradient-primary"><Plus className="mr-2 h-4 w-4" /> Add Student</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Student</DialogTitle>
                  <DialogDescription>Enter student details. Login credentials will be auto-generated.</DialogDescription>
                </DialogHeader>
                <StudentFormFields formInstance={form} onSubmitFn={onSubmit} submitLabel="Create Student" isSubmitting={creating} />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Student</DialogTitle>
              <DialogDescription>Update details for {editingStudent?.name}</DialogDescription>
            </DialogHeader>
            <StudentFormFields formInstance={editForm} onSubmitFn={onEditSubmit} submitLabel="Save Changes" isSubmitting={creating} />
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deletingStudent} onOpenChange={(open) => !open && setDeletingStudent(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Student</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete <strong>{deletingStudent?.name}</strong> ({deletingStudent?.roll_number})? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">CSV Format</CardTitle>
            <CardDescription>Required columns: name, roll_number, register_number, dob (YYYY-MM-DD), section, year</CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by name, roll or register number..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
              </div>
              <Badge variant="secondary">{filteredStudents.length} students</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {students.length === 0 ? 'No students added yet.' : 'No students match your search.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Roll Number</TableHead>
                      <TableHead className="hidden md:table-cell">Register Number</TableHead>
                      <TableHead className="hidden sm:table-cell">Section</TableHead>
                      <TableHead className="hidden sm:table-cell">Year</TableHead>
                      <TableHead className="hidden md:table-cell">DOB</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">{student.name}</TableCell>
                        <TableCell>{student.roll_number}</TableCell>
                        <TableCell className="hidden md:table-cell">{student.register_number}</TableCell>
                        <TableCell className="hidden sm:table-cell"><Badge variant="outline">{student.section}</Badge></TableCell>
                        <TableCell className="hidden sm:table-cell">{student.year}</TableCell>
                        <TableCell className="hidden md:table-cell">{new Date(student.dob).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEditDialog(student)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setDeletingStudent(student)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            <PaginationControls
              currentPage={currentPage}
              totalPages={Math.ceil(totalCount / PAGE_SIZE)}
              onPageChange={setCurrentPage}
              totalItems={totalCount}
              pageSize={PAGE_SIZE}
            />
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

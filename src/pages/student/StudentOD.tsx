import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FileText, Upload, Clock, CheckCircle, Check, X, Loader2, Download } from 'lucide-react';
import { generateODLetterPDF } from '@/lib/pdfReports';

import { StudentLayout } from '@/components/layouts/StudentLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const odSchema = z.object({
  reason: z.string().min(10, 'Reason must be at least 10 characters').max(1000, 'Reason must be less than 1000 characters'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
}).refine(data => new Date(data.endDate) >= new Date(data.startDate), {
  message: 'End date cannot be before start date',
  path: ['endDate'],
});

type ODFormData = z.infer<typeof odSchema>;

interface ODRequest {
  id: string;
  reason: string;
  start_date: string;
  end_date: string;
  status: 'submitted' | 'tutor_verified' | 'admin_approved' | 'completed' | 'rejected';
  tutor_remarks: string | null;
  admin_remarks: string | null;
  tutor_id: string | null;
  admin_approved_at: string | null;
  created_at: string;
}


const statusConfig = {
  submitted: { label: 'Submitted', color: 'bg-warning/20 text-warning-foreground', icon: Clock, step: 1 },
  tutor_verified: { label: 'Tutor Verified', color: 'bg-info/20 text-info', icon: CheckCircle, step: 2 },
  admin_approved: { label: 'Admin Approved', color: 'bg-success/20 text-success', icon: Check, step: 3 },
  completed: { label: 'Completed', color: 'bg-success text-success-foreground', icon: CheckCircle, step: 4 },
  rejected: { label: 'Rejected', color: 'bg-destructive/20 text-destructive', icon: X, step: 0 },
};

export default function StudentOD() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [requests, setRequests] = useState<ODRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [studentInfo, setStudentInfo] = useState<any>(null);
  const [tutorNames, setTutorNames] = useState<Record<string, string>>({});


  const form = useForm<ODFormData>({
    resolver: zodResolver(odSchema),
    defaultValues: {
      reason: '',
      startDate: '',
      endDate: '',
    },
  });

  useEffect(() => {
    fetchStudentAndRequests();
  }, [user]);

  const fetchStudentAndRequests = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data: studentData } = await supabase
        .from('students')
        .select('id, name, roll_number, register_number, section, year')
        .eq('user_id', authUser.id)
        .single();

      if (studentData) {
        setStudentId(studentData.id);
        setStudentInfo(studentData);

        const { data: odData } = await supabase
          .from('od_requests')
          .select('*')
          .eq('student_id', studentData.id)
          .order('created_at', { ascending: false });

        setRequests(odData || []);

        // Resolve tutor names for real-time status ("Being reviewed by [Tutor]")
        const tutorIds = Array.from(new Set((odData || []).map((o: any) => o.tutor_id).filter(Boolean)));
        if (tutorIds.length > 0) {
          const { data: tutors } = await supabase.from('faculty').select('user_id, name').in('user_id', tutorIds as string[]);
          const map: Record<string, string> = {};
          (tutors || []).forEach((t: any) => { map[t.user_id] = t.name; });
          setTutorNames(map);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadLetter = (r: ODRequest) => {
    if (!studentInfo) return;
    generateODLetterPDF({
      studentName: studentInfo.name,
      rollNumber: studentInfo.roll_number,
      registerNumber: studentInfo.register_number,
      section: studentInfo.section,
      year: studentInfo.year,
      reason: r.reason,
      startDate: r.start_date,
      endDate: r.end_date,
      tutorName: r.tutor_id ? tutorNames[r.tutor_id] : undefined,
      approvedOn: r.admin_approved_at ? new Date(r.admin_approved_at).toLocaleDateString('en-IN') : undefined,
      reference: `OD/${new Date(r.created_at).getFullYear()}/${r.id.substring(0, 6).toUpperCase()}`,
    });
    toast({ title: '📄 OD Letter ready', description: 'Downloading your printable letter.' });
  };


  const onSubmit = async (data: ODFormData) => {
    if (!studentId) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.from('od_requests').insert({
        student_id: studentId,
        reason: data.reason,
        start_date: data.startDate,
        end_date: data.endDate,
        status: 'submitted',
      });

      if (error) throw error;

      toast({
        title: 'OD Request Submitted',
        description: 'Your request has been sent to your tutor for verification.',
      });

      form.reset();
      setIsDialogOpen(false);
      fetchStudentAndRequests();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to submit OD request',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const renderStatusTracker = (status: keyof typeof statusConfig) => {
    const config = statusConfig[status];
    const steps = [
      { label: 'Submitted', step: 1 },
      { label: 'Tutor Verified', step: 2 },
      { label: 'Admin Approved', step: 3 },
      { label: 'Completed', step: 4 },
    ];

    if (status === 'rejected') {
      return (
        <div className="flex items-center gap-2 text-destructive">
          <X className="h-5 w-5" />
          <span className="font-medium">Request Rejected</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s.step} className="flex items-center">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                config.step >= s.step
                  ? 'bg-success text-success-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {config.step >= s.step ? <Check className="h-3 w-3" /> : s.step}
            </div>
            {i < steps.length - 1 && (
              <div
                className={`w-8 h-0.5 ${
                  config.step > s.step ? 'bg-success' : 'bg-muted'
                }`}
              />
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <StudentLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold flex items-center gap-2">
              <FileText className="h-8 w-8 text-info" />
              OD Submission
            </h1>
            <p className="text-muted-foreground">
              Submit and track On Duty requests
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-info hover:bg-info/90">
                <Upload className="mr-2 h-4 w-4" />
                New OD Request
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Submit OD Request</DialogTitle>
                <DialogDescription>
                  Your request will be sent to your tutor for verification
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="endDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="reason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reason</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Explain the purpose of your OD..."
                            rows={4}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={submitting}>
                      {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Submit Request
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Request List */}
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : requests.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No OD requests yet. Submit your first request above.
              </CardContent>
            </Card>
          ) : (
            requests.map((request) => {
              const config = statusConfig[request.status];
              const Icon = config.icon;

              return (
                <Card key={request.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          OD Request
                          <Badge className={config.color}>
                            <Icon className="h-3 w-3 mr-1" />
                            {config.label}
                          </Badge>
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {new Date(request.start_date).toLocaleDateString()} - {new Date(request.end_date).toLocaleDateString()}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(request.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Reason</p>
                      <p className="text-sm">{request.reason}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Status Tracking</p>
                      {renderStatusTracker(request.status)}
                    </div>
                    {request.tutor_remarks && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Tutor Remarks</p>
                        <p className="text-sm bg-muted p-2 rounded">{request.tutor_remarks}</p>
                      </div>
                    )}
                    {request.admin_remarks && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Admin Remarks</p>
                        <p className="text-sm bg-muted p-2 rounded">{request.admin_remarks}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </StudentLayout>
  );
}

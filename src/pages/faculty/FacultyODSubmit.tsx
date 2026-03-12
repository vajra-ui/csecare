import { useState, useEffect } from 'react';
import { CalendarOff, Plus, Loader2, Clock, CheckCircle, XCircle } from 'lucide-react';
import { FacultyLayout } from '@/components/layouts/FacultyLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
  pending: { color: 'bg-warning/20 text-warning border-warning/30', icon: Clock, label: 'Pending' },
  approved: { color: 'bg-success/20 text-success border-success/30', icon: CheckCircle, label: 'Approved' },
  rejected: { color: 'bg-destructive/20 text-destructive border-destructive/30', icon: XCircle, label: 'Rejected' },
};

export default function FacultyODSubmit() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [facultyId, setFacultyId] = useState<string | null>(null);
  const [form, setForm] = useState({ reason: '', start_date: '', end_date: '' });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;
      const { data: faculty } = await supabase.from('faculty').select('id').eq('user_id', authUser.id).single();
      if (!faculty) return;
      setFacultyId(faculty.id);

      const { data } = await supabase
        .from('faculty_od_requests')
        .select('*')
        .eq('faculty_id', faculty.id)
        .order('created_at', { ascending: false });

      setRequests(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!facultyId || !form.reason || !form.start_date || !form.end_date) {
      toast({ title: 'Error', description: 'All fields are required', variant: 'destructive' });
      return;
    }
    if (form.end_date < form.start_date) {
      toast({ title: 'Error', description: 'End date must be after start date', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from('faculty_od_requests').insert({
        faculty_id: facultyId,
        reason: form.reason,
        start_date: form.start_date,
        end_date: form.end_date,
      });
      if (error) throw error;
      toast({ title: 'OD Request Submitted', description: 'Your request has been sent to admin.' });
      setForm({ reason: '', start_date: '', end_date: '' });
      setDialogOpen(false);
      fetchData();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to submit request', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <FacultyLayout>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </FacultyLayout>
    );
  }

  return (
    <FacultyLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold flex items-center gap-2">
              <CalendarOff className="h-7 w-7 text-primary" />
              My OD Requests
            </h1>
            <p className="text-muted-foreground text-sm">Submit and track your on-duty requests</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> New Request</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-display">Submit OD Request</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Reason *</Label>
                  <Textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="Reason for on-duty..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Start Date *</Label>
                    <Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
                  </div>
                  <div>
                    <Label>End Date *</Label>
                    <Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
                  </div>
                </div>
                <Button onClick={handleSubmit} disabled={submitting} className="w-full">
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Submit Request
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {requests.length === 0 ? (
          <Card className="futuristic-card">
            <CardContent className="py-12 text-center text-muted-foreground">
              <CalendarOff className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No OD requests yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {requests.map(r => {
              const sc = statusConfig[r.status] || statusConfig.pending;
              const Icon = sc.icon;
              return (
                <Card key={r.id} className="futuristic-card">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={sc.color}><Icon className="h-3 w-3 mr-1" />{sc.label}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(r.start_date), 'MMM dd')} - {format(new Date(r.end_date), 'MMM dd, yyyy')}
                          </span>
                        </div>
                        <p className="text-sm">{r.reason}</p>
                        {r.admin_remarks && (
                          <p className="text-xs text-muted-foreground mt-2 italic">Admin: {r.admin_remarks}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </FacultyLayout>
  );
}

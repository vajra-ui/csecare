import { useState, useEffect } from 'react';
import { FileText, Check, X, Clock, CheckCircle, Loader2 } from 'lucide-react';
import { FacultyLayout } from '@/components/layouts/FacultyLayout';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { pushNotification, warmMessages } from '@/lib/notifyWarm';

interface ODRequest {
  id: string;
  reason: string;
  start_date: string;
  end_date: string;
  status: 'submitted' | 'tutor_verified' | 'admin_approved' | 'completed' | 'rejected';
  letter_url: string | null;
  tutor_remarks: string | null;
  created_at: string;
  student: {
    name: string;
    roll_number: string;
    section: string;
  };
}

const statusConfig = {
  submitted: { label: 'Pending Review', color: 'bg-warning/20 text-warning-foreground', icon: Clock },
  tutor_verified: { label: 'Tutor Verified', color: 'bg-info/20 text-info', icon: CheckCircle },
  admin_approved: { label: 'Admin Approved', color: 'bg-success/20 text-success', icon: Check },
  completed: { label: 'Completed', color: 'bg-success text-success-foreground', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'bg-destructive/20 text-destructive', icon: X },
};

export default function FacultyODRequests() {
  const { toast } = useToast();
  const [requests, setRequests] = useState<ODRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<ODRequest | null>(null);
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('od_requests')
        .select(`
          *,
          student:students(name, roll_number, section)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching OD requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (approve: boolean) => {
    if (!selectedRequest) return;

    setProcessing(selectedRequest.id);
    try {
      const { data: facultyData } = await supabase
        .from('faculty')
        .select('id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      const { error } = await supabase
        .from('od_requests')
        .update({
          status: approve ? 'tutor_verified' : 'rejected',
          tutor_id: facultyData?.id,
          tutor_verified_at: new Date().toISOString(),
          tutor_remarks: remarks || null,
        })
        .eq('id', selectedRequest.id);

      if (error) throw error;

      toast({
        title: approve ? 'OD Request Verified' : 'OD Request Rejected',
        description: `Request has been ${approve ? 'forwarded to admin' : 'rejected'}.`,
      });

      setSelectedRequest(null);
      setRemarks('');
      fetchRequests();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to process request',
        variant: 'destructive',
      });
    } finally {
      setProcessing(null);
    }
  };

  return (
    <FacultyLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-2">
            <FileText className="h-8 w-8 text-primary" />
            OD Requests
          </h1>
          <p className="text-muted-foreground">
            Review and verify On Duty requests from students
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Pending Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No OD requests found.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Roll Number</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((request) => {
                    const config = statusConfig[request.status];
                    const Icon = config.icon;
                    const canVerify = request.status === 'submitted';

                    return (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium">
                          {request.student?.name}
                        </TableCell>
                        <TableCell className="font-mono">
                          {request.student?.roll_number}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{request.student?.section}</Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(request.start_date).toLocaleDateString()} - {new Date(request.end_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {request.reason}
                        </TableCell>
                        <TableCell>
                          <Badge className={config.color}>
                            <Icon className="h-3 w-3 mr-1" />
                            {config.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {canVerify && (
                            <Button
                              size="sm"
                              onClick={() => setSelectedRequest(request)}
                            >
                              Review
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Review Dialog */}
        <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Review OD Request</DialogTitle>
              <DialogDescription>
                Verify or reject this On Duty request
              </DialogDescription>
            </DialogHeader>
            {selectedRequest && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Student</p>
                    <p className="font-medium">{selectedRequest.student?.name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Roll Number</p>
                    <p className="font-medium">{selectedRequest.student?.roll_number}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Duration</p>
                    <p className="font-medium">
                      {new Date(selectedRequest.start_date).toLocaleDateString()} - {new Date(selectedRequest.end_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Section</p>
                    <p className="font-medium">{selectedRequest.student?.section}</p>
                  </div>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm mb-1">Reason</p>
                  <p className="bg-muted p-3 rounded-lg text-sm">{selectedRequest.reason}</p>
                </div>
                {selectedRequest.letter_url && (
                  <div>
                    <p className="text-muted-foreground text-sm mb-1">Attached Letter</p>
                    <a
                      href={selectedRequest.letter_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-info hover:underline text-sm"
                    >
                      View Attachment
                    </a>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium mb-2">Remarks (Optional)</p>
                  <Textarea
                    placeholder="Add any remarks..."
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    rows={2}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="destructive"
                    onClick={() => handleVerify(false)}
                    disabled={!!processing}
                  >
                    {processing === selectedRequest?.id && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Reject
                  </Button>
                  <Button
                    onClick={() => handleVerify(true)}
                    disabled={!!processing}
                    className="bg-success hover:bg-success/90"
                  >
                    {processing === selectedRequest?.id && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Verify & Forward
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </FacultyLayout>
  );
}

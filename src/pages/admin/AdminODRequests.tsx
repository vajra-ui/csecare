import { useState, useEffect } from 'react';
import { ClipboardList, Check, X, Clock, CheckCircle, Loader2 } from 'lucide-react';
import { AdminLayout } from '@/components/layouts/AdminLayout';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { pushNotification, warmMessages } from '@/lib/notifyWarm';

interface ODRequest {
  id: string;
  student_id: string;
  reason: string;
  start_date: string;
  end_date: string;
  status: 'submitted' | 'tutor_verified' | 'admin_approved' | 'completed' | 'rejected';
  letter_url: string | null;
  tutor_remarks: string | null;
  admin_remarks: string | null;
  created_at: string;
  student: {
    name: string;
    roll_number: string;
    section: string;
    user_id: string | null;
  };
}

const statusConfig = {
  submitted: { label: 'Submitted', color: 'bg-warning/20 text-warning-foreground', icon: Clock },
  tutor_verified: { label: 'Tutor Verified', color: 'bg-info/20 text-info', icon: CheckCircle },
  admin_approved: { label: 'Approved', color: 'bg-success/20 text-success', icon: Check },
  completed: { label: 'Completed', color: 'bg-success text-success-foreground', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'bg-destructive/20 text-destructive', icon: X },
};

export default function AdminODRequests() {
  const { toast } = useToast();
  const [requests, setRequests] = useState<ODRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<ODRequest | null>(null);
  const [remarks, setRemarks] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

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

  const handleAction = async (action: 'approve' | 'reject' | 'complete') => {
    if (!selectedRequest) return;

    setProcessing(selectedRequest.id);
    try {
      const updateData: Record<string, any> = {
        admin_remarks: remarks || null,
      };

      if (action === 'approve') {
        updateData.status = 'admin_approved';
        updateData.admin_approved_at = new Date().toISOString();
      } else if (action === 'reject') {
        updateData.status = 'rejected';
      } else if (action === 'complete') {
        updateData.status = 'completed';
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('od_requests')
        .update(updateData)
        .eq('id', selectedRequest.id);

      if (error) throw error;

      toast({
        title: `OD Request ${action === 'approve' ? 'Approved' : action === 'reject' ? 'Rejected' : 'Completed'}`,
        description: `Request has been ${action}ed successfully.`,
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

  const filteredRequests = filterStatus === 'all'
    ? requests
    : requests.filter(r => r.status === filterStatus);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold flex items-center gap-2">
              <ClipboardList className="h-8 w-8 text-warning" />
              OD Requests
            </h1>
            <p className="text-muted-foreground">
              Review, approve, or reject On Duty requests
            </p>
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Requests</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="tutor_verified">Tutor Verified</SelectItem>
              <SelectItem value="admin_approved">Approved</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {filterStatus === 'all' ? 'All' : statusConfig[filterStatus as keyof typeof statusConfig]?.label} Requests
              <Badge variant="outline" className="ml-2">{filteredRequests.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredRequests.length === 0 ? (
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
                  {filteredRequests.map((request) => {
                    const config = statusConfig[request.status];
                    const Icon = config.icon;
                    const canApprove = request.status === 'tutor_verified';
                    const canComplete = request.status === 'admin_approved';
                    const canReject = ['submitted', 'tutor_verified'].includes(request.status);

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
                          {(canApprove || canReject || canComplete) && (
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
                Approve, reject, or mark as completed
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
                    <p className="text-muted-foreground">Current Status</p>
                    <Badge className={statusConfig[selectedRequest.status].color}>
                      {statusConfig[selectedRequest.status].label}
                    </Badge>
                  </div>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm mb-1">Reason</p>
                  <p className="bg-muted p-3 rounded-lg text-sm">{selectedRequest.reason}</p>
                </div>
                {selectedRequest.tutor_remarks && (
                  <div>
                    <p className="text-muted-foreground text-sm mb-1">Tutor Remarks</p>
                    <p className="bg-muted p-3 rounded-lg text-sm">{selectedRequest.tutor_remarks}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium mb-2">Admin Remarks (Optional)</p>
                  <Textarea
                    placeholder="Add any remarks..."
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    rows={2}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  {['submitted', 'tutor_verified'].includes(selectedRequest.status) && (
                    <Button
                      variant="destructive"
                      onClick={() => handleAction('reject')}
                      disabled={!!processing}
                    >
                      {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Reject
                    </Button>
                  )}
                  {selectedRequest.status === 'tutor_verified' && (
                    <Button
                      onClick={() => handleAction('approve')}
                      disabled={!!processing}
                      className="bg-success hover:bg-success/90"
                    >
                      {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Approve
                    </Button>
                  )}
                  {selectedRequest.status === 'admin_approved' && (
                    <Button
                      onClick={() => handleAction('complete')}
                      disabled={!!processing}
                    >
                      {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Mark Completed
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}

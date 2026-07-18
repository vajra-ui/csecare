import { useState } from 'react';
import { FileText, Download, Loader2, Users, GraduationCap, ClipboardList, FileSpreadsheet } from 'lucide-react';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  generateStudentListPDF,
  generateFacultyListPDF,
  generateODReportPDF,
  generateAuditLogPDF,
} from '@/lib/pdfReports';

export default function AdminReports() {
  const { toast } = useToast();
  const [generating, setGenerating] = useState<string | null>(null);

  const generate = async (type: string) => {
    setGenerating(type);
    try {
      switch (type) {
        case 'students': {
          const { data } = await supabase.from('students').select('*').order('name');
          generateStudentListPDF(data || []);
          break;
        }
        case 'faculty': {
          const { data, error } = await (supabase as any).rpc('get_admin_faculty_records');
          if (error) throw error;
          generateFacultyListPDF(data || []);
          break;
        }
        case 'od': {
          const { data: odData } = await supabase
            .from('od_requests')
            .select('*, students(name)')
            .order('created_at', { ascending: false });
          const mapped = (odData || []).map((o: any) => ({
            ...o,
            student_name: o.students?.name || 'Unknown',
          }));
          generateODReportPDF(mapped);
          break;
        }
        case 'audit': {
          const { data } = await supabase
            .from('audit_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(500);
          generateAuditLogPDF(data || []);
          break;
        }
      }
      toast({ title: 'Report Generated', description: 'PDF downloaded successfully.' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to generate report', variant: 'destructive' });
    } finally {
      setGenerating(null);
    }
  };

  const reports = [
    { key: 'students', icon: GraduationCap, title: 'Student List', desc: 'Complete list of all registered students with roll numbers, sections, and year', color: 'text-blue-500' },
    { key: 'faculty', icon: Users, title: 'Faculty List', desc: 'All faculty members with qualifications, sections, and tutor assignments', color: 'text-green-500' },
    { key: 'od', icon: ClipboardList, title: 'OD Requests', desc: 'All on-duty requests with student names, dates, reasons, and approval status', color: 'text-amber-500' },
    { key: 'audit', icon: FileSpreadsheet, title: 'Audit Logs', desc: 'System activity log with timestamps, actions, and details', color: 'text-red-500' },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold flex items-center gap-2">
            <FileText className="h-7 w-7 text-primary" />
            Reports
          </h1>
          <p className="text-muted-foreground text-sm">Generate and download PDF reports</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {reports.map((r) => (
            <Card key={r.key} className="relative overflow-hidden">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <r.icon className={`h-5 w-5 ${r.color}`} />
                  {r.title}
                </CardTitle>
                <CardDescription>{r.desc}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => generate(r.key)}
                  disabled={generating !== null}
                  className="w-full"
                >
                  {generating === r.key ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Download PDF
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}

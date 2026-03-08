import { useState } from 'react';
import { Brain, Loader2, AlertTriangle, RefreshCw, Users, TrendingDown } from 'lucide-react';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface StudentMetric {
  name: string;
  roll_number: string;
  section: string;
  year: string;
  attendance_percentage: number | null;
  latest_cgpa: number | null;
  total_classes: number;
  classes_present: number;
}

export default function AdminRiskAnalysis() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<StudentMetric[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [analyzedAt, setAnalyzedAt] = useState<string | null>(null);

  const runAnalysis = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('risk-analysis');
      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setAnalysis(data.analysis);
      setMetrics(data.student_metrics || []);
      setTotalStudents(data.total_students || 0);
      setAnalyzedAt(data.analyzed_at);
      toast({ title: 'Analysis Complete', description: 'AI risk analysis generated successfully.' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to run analysis', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const atRiskStudents = metrics.filter(m =>
    (m.attendance_percentage !== null && m.attendance_percentage < 75) ||
    (m.latest_cgpa !== null && m.latest_cgpa < 5)
  );

  const highRisk = metrics.filter(m =>
    (m.attendance_percentage !== null && m.attendance_percentage < 75) &&
    (m.latest_cgpa !== null && m.latest_cgpa < 5)
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold flex items-center gap-2">
              <Brain className="h-7 w-7 text-primary" />
              AI Risk Analysis
            </h1>
            <p className="text-muted-foreground text-sm">AI-powered identification of at-risk students</p>
          </div>
          <Button onClick={runAnalysis} disabled={loading} size="lg">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            {analysis ? 'Re-analyze' : 'Run Analysis'}
          </Button>
        </div>

        {!analysis && !loading && (
          <Card>
            <CardContent className="py-16 text-center space-y-4">
              <Brain className="h-16 w-16 mx-auto text-muted-foreground/30" />
              <div>
                <h3 className="text-lg font-semibold">No analysis yet</h3>
                <p className="text-muted-foreground text-sm">Click "Run Analysis" to let AI identify at-risk students based on attendance and CGPA data.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {loading && (
          <Card>
            <CardContent className="py-16 text-center space-y-4">
              <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
              <p className="text-muted-foreground">AI is analyzing student data...</p>
            </CardContent>
          </Card>
        )}

        {analysis && !loading && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card>
                <CardContent className="pt-4 pb-3 px-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <p className="text-2xl font-bold">{totalStudents}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">Total Students</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3 px-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <p className="text-2xl font-bold">{atRiskStudents.length}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">At Risk</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3 px-4">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-destructive" />
                    <p className="text-2xl font-bold">{highRisk.length}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">High Risk</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3 px-4">
                  <p className="text-xs text-muted-foreground">Analyzed at</p>
                  <p className="text-sm font-medium">{analyzedAt ? new Date(analyzedAt).toLocaleString() : '-'}</p>
                </CardContent>
              </Card>
            </div>

            {/* Student Risk Overview */}
            {atRiskStudents.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    At-Risk Students Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {atRiskStudents.map((s, i) => {
                      const isHigh = (s.attendance_percentage !== null && s.attendance_percentage < 75) &&
                                     (s.latest_cgpa !== null && s.latest_cgpa < 5);
                      return (
                        <div key={i} className="flex items-center gap-4 p-3 rounded-lg border bg-card">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm">{s.name}</p>
                              <Badge variant={isHigh ? 'destructive' : 'secondary'} className="text-xs">
                                {isHigh ? 'HIGH' : 'MEDIUM'}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">{s.roll_number} · {s.section} · Year {s.year}</p>
                          </div>
                          <div className="text-right space-y-1">
                            {s.attendance_percentage !== null && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground w-16 text-right">Att:</span>
                                <Progress value={s.attendance_percentage} className="w-20 h-2" />
                                <span className={`text-xs font-medium w-10 ${s.attendance_percentage < 75 ? 'text-destructive' : 'text-green-600'}`}>
                                  {s.attendance_percentage}%
                                </span>
                              </div>
                            )}
                            {s.latest_cgpa !== null && (
                              <p className={`text-xs ${s.latest_cgpa < 5 ? 'text-destructive' : 'text-green-600'}`}>
                                CGPA: {s.latest_cgpa}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* AI Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Brain className="h-5 w-5 text-primary" />
                  AI Analysis & Recommendations
                </CardTitle>
                <CardDescription>Generated by AI based on student attendance and academic data</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                  {analysis}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminLayout>
  );
}

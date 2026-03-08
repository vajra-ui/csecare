import { useState } from 'react';
import { StudentLayout } from '@/components/layouts/StudentLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calculator, Plus, Trash2 } from 'lucide-react';

interface Subject {
  name: string;
  credits: number;
  grade: string;
}

const GRADE_POINTS: Record<string, number> = { 'O': 10, 'A+': 9, 'A': 8, 'B+': 7, 'B': 6, 'C': 5, 'U': 0 };

export default function StudentGPACalc() {
  const [subjects, setSubjects] = useState<Subject[]>([{ name: '', credits: 3, grade: '' }]);
  const [previousCGPA, setPreviousCGPA] = useState('');
  const [previousCredits, setPreviousCredits] = useState('');

  const addSubject = () => setSubjects([...subjects, { name: '', credits: 3, grade: '' }]);
  const removeSubject = (i: number) => setSubjects(subjects.filter((_, idx) => idx !== i));
  const updateSubject = (i: number, field: keyof Subject, value: any) => {
    const updated = [...subjects];
    updated[i] = { ...updated[i], [field]: value };
    setSubjects(updated);
  };

  const validSubjects = subjects.filter(s => s.grade && GRADE_POINTS[s.grade] !== undefined);
  const totalCredits = validSubjects.reduce((sum, s) => sum + s.credits, 0);
  const totalPoints = validSubjects.reduce((sum, s) => sum + (s.credits * GRADE_POINTS[s.grade]), 0);
  const gpa = totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : '0.00';

  // CGPA calculation
  const prevCGPA = parseFloat(previousCGPA) || 0;
  const prevCreds = parseFloat(previousCredits) || 0;
  const cumulativeCredits = prevCreds + totalCredits;
  const cumulativePoints = (prevCGPA * prevCreds) + totalPoints;
  const cgpa = cumulativeCredits > 0 ? (cumulativePoints / cumulativeCredits).toFixed(2) : gpa;

  const gpaColor = () => {
    const g = parseFloat(gpa);
    if (g >= 8) return 'text-green-600';
    if (g >= 6) return 'text-primary';
    if (g >= 5) return 'text-warning-foreground';
    return 'text-destructive';
  };

  return (
    <StudentLayout>
      <div className="space-y-6">
        <h1 className="font-display text-2xl md:text-3xl font-bold">GPA Calculator</h1>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Subjects</CardTitle>
                <Button variant="outline" size="sm" onClick={addSubject}><Plus className="h-4 w-4 mr-1" /> Add</Button>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Subject</TableHead>
                        <TableHead className="w-24">Credits</TableHead>
                        <TableHead className="w-28">Grade</TableHead>
                        <TableHead className="w-20">Points</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {subjects.map((s, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            <Input placeholder="Subject name" value={s.name} onChange={e => updateSubject(i, 'name', e.target.value)} className="h-8" />
                          </TableCell>
                          <TableCell>
                            <Select value={s.credits.toString()} onValueChange={v => updateSubject(i, 'credits', parseInt(v))}>
                              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                              <SelectContent>{[1,2,3,4,5].map(c => <SelectItem key={c} value={c.toString()}>{c}</SelectItem>)}</SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Select value={s.grade} onValueChange={v => updateSubject(i, 'grade', v)}>
                              <SelectTrigger className="h-8"><SelectValue placeholder="-" /></SelectTrigger>
                              <SelectContent>{Object.keys(GRADE_POINTS).map(g => <SelectItem key={g} value={g}>{g} ({GRADE_POINTS[g]})</SelectItem>)}</SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-center font-mono">
                            {s.grade ? (s.credits * GRADE_POINTS[s.grade]) : '-'}
                          </TableCell>
                          <TableCell>
                            {subjects.length > 1 && (
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeSubject(i)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Previous Semesters (for CGPA)</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground">Previous CGPA</label>
                    <Input type="number" step="0.01" min="0" max="10" value={previousCGPA} onChange={e => setPreviousCGPA(e.target.value)} placeholder="e.g. 8.5" />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Total Previous Credits</label>
                    <Input type="number" min="0" value={previousCredits} onChange={e => setPreviousCredits(e.target.value)} placeholder="e.g. 60" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card className="border-primary/20">
              <CardContent className="pt-6 text-center space-y-4">
                <Calculator className="h-10 w-10 mx-auto text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Current Semester GPA</p>
                  <p className={`text-4xl font-bold ${gpaColor()}`}>{gpa}</p>
                </div>
                <div className="h-px bg-border" />
                <div>
                  <p className="text-sm text-muted-foreground">Cumulative CGPA</p>
                  <p className="text-3xl font-bold">{cgpa}</p>
                </div>
                <div className="h-px bg-border" />
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div>
                    <p className="text-lg font-bold">{totalCredits}</p>
                    <p className="text-xs text-muted-foreground">Credits</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold">{totalPoints}</p>
                    <p className="text-xs text-muted-foreground">Total Points</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Grade Scale</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {Object.entries(GRADE_POINTS).map(([g, p]) => (
                    <div key={g} className="flex justify-between text-sm">
                      <Badge variant="outline">{g}</Badge>
                      <span className="text-muted-foreground">{p} points</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </StudentLayout>
  );
}

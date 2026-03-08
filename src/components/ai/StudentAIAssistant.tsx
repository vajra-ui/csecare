import { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import ReactMarkdown from 'react-markdown';

type Message = { role: 'user' | 'assistant'; content: string };

interface StudentContext {
  name: string;
  rollNumber: string;
  section: string;
  year: string;
  attendancePercentage: number | null;
  cgpa: number | null;
  semesterCGPAs: { semester: number; cgpa: number }[];
  subjectScores: any[];
  pendingAssignments: number;
  submittedAssignments: number;
  achievements: any[];
  odRequests: any[];
}

export function StudentAIAssistant() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [studentContext, setStudentContext] = useState<StudentContext | null>(null);
  const [contextLoaded, setContextLoaded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Fetch student data when chat opens
  useEffect(() => {
    if (open && !contextLoaded) {
      fetchStudentContext();
    }
  }, [open]);

  const fetchStudentContext = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      // Fetch student record
      const { data: student } = await supabase
        .from('students')
        .select('*')
        .eq('user_id', authUser.id)
        .single();

      if (!student) return;

      // Fetch all data in parallel
      const [attRes, academicRes, scoresRes, assignmentsRes, submissionsRes, achievementsRes, odRes] = await Promise.all([
        supabase.rpc('get_attendance_percentage', { _student_id: student.id }),
        supabase.from('academic_records').select('semester, cgpa').eq('student_id', student.id).order('semester', { ascending: true }),
        supabase.from('subject_scores').select('subject_name, semester, internal_marks, external_marks, total_marks, grade').eq('student_id', student.id).order('semester', { ascending: false }).limit(20),
        supabase.from('assignments').select('id, title, due_date, section').eq('section', student.section),
        supabase.from('assignment_submissions').select('assignment_id').eq('student_id', student.id),
        supabase.from('student_achievements').select('title, category, date').eq('student_id', student.id).order('date', { ascending: false }).limit(5),
        supabase.from('od_requests').select('reason, status, start_date, end_date').eq('student_id', student.id).order('created_at', { ascending: false }).limit(5),
      ]);

      const academicRecords = academicRes.data || [];
      const latestCGPA = academicRecords.length > 0 ? academicRecords[academicRecords.length - 1].cgpa : null;
      
      const allAssignments = assignmentsRes.data || [];
      const submittedIds = new Set((submissionsRes.data || []).map((s: any) => s.assignment_id));
      const pendingAssignments = allAssignments.filter((a: any) => !submittedIds.has(a.id)).length;

      setStudentContext({
        name: student.name,
        rollNumber: student.roll_number,
        section: student.section,
        year: student.year,
        attendancePercentage: attRes.data !== null ? Number(attRes.data) : null,
        cgpa: latestCGPA ? Number(latestCGPA) : null,
        semesterCGPAs: academicRecords.map((r: any) => ({ semester: r.semester, cgpa: Number(r.cgpa) })),
        subjectScores: scoresRes.data || [],
        pendingAssignments,
        submittedAssignments: submittedIds.size,
        achievements: achievementsRes.data || [],
        odRequests: odRes.data || [],
      });
      setContextLoaded(true);
    } catch (error) {
      console.error('Error fetching student context:', error);
      setContextLoaded(true);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Message = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const resp = await supabase.functions.invoke('ai-student-advisor', {
        body: {
          messages: newMessages,
          studentName: user?.name || 'Student',
          studentContext: studentContext,
        },
      });

      if (resp.error) throw resp.error;

      const assistantContent = resp.data?.content || 'Sorry, I could not generate a response. Please try again.';
      setMessages(prev => [...prev, { role: 'assistant', content: assistantContent }]);
    } catch (e: any) {
      console.error('AI error:', e);
      const errorMsg = e?.message?.includes('429')
        ? 'Too many requests. Please wait a moment and try again.'
        : e?.message?.includes('402')
        ? 'AI usage limit reached. Please try again later.'
        : 'Something went wrong. Please try again.';
      setMessages(prev => [...prev, { role: 'assistant', content: errorMsg }]);
    } finally {
      setLoading(false);
    }
  };

  const quickQuestions = studentContext ? [
    `How is my attendance at ${studentContext.attendancePercentage ?? 'N/A'}%? What should I do?`,
    studentContext.cgpa ? `My CGPA is ${studentContext.cgpa}. How can I improve?` : 'How can I improve my CGPA?',
    studentContext.pendingAssignments > 0 ? `I have ${studentContext.pendingAssignments} pending assignments. Help me plan.` : 'Tips for time management',
  ] : [
    'How can I improve my CGPA?',
    'Tips for time management',
    'Career paths in CSE',
  ];

  return (
    <>
      {/* Floating Button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-gradient-to-br from-neon-cyan to-neon-purple flex items-center justify-center shadow-neon animate-glow hover:scale-110 transition-transform"
        >
          <Bot className="h-6 w-6 text-background" />
        </button>
      )}

      {/* Chat Panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[360px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[calc(100vh-4rem)] flex flex-col rounded-2xl overflow-hidden border border-neon-cyan/20 shadow-neon animate-scale-in"
          style={{ background: 'hsl(var(--card) / 0.95)', backdropFilter: 'blur(20px)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/50" style={{ background: 'linear-gradient(135deg, hsl(var(--neon-cyan) / 0.1), hsl(var(--neon-purple) / 0.1))' }}>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-neon-cyan to-neon-purple flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-background" />
              </div>
              <div>
                <p className="font-display text-xs font-semibold tracking-wider">AI ADVISOR</p>
                <p className="text-[10px] text-muted-foreground font-body">
                  {contextLoaded ? 'Connected to your data' : 'Loading your data...'}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.length === 0 && (
              <div className="text-center py-8 px-4">
                <Bot className="h-10 w-10 mx-auto text-neon-cyan/40 mb-3" />
                <p className="font-display text-sm font-semibold tracking-wide mb-1">Hi, {user?.name?.split(' ')[0] || 'there'}!</p>
                <p className="text-xs text-muted-foreground font-body mb-2">
                  I have access to your academic data — attendance, CGPA, scores, assignments, and more. Ask me anything!
                </p>
                {studentContext && (
                  <div className="text-xs text-left bg-muted/30 rounded-lg p-2 mb-3 space-y-1 border border-border/50">
                    <p className="text-muted-foreground">📊 <strong>Attendance:</strong> {studentContext.attendancePercentage ?? 'N/A'}%</p>
                    <p className="text-muted-foreground">📈 <strong>CGPA:</strong> {studentContext.cgpa ?? 'N/A'}</p>
                    <p className="text-muted-foreground">📝 <strong>Pending:</strong> {studentContext.pendingAssignments} assignments</p>
                    <p className="text-muted-foreground">🏆 <strong>Achievements:</strong> {studentContext.achievements.length}</p>
                  </div>
                )}
                <div className="space-y-2">
                  {quickQuestions.map((q) => (
                    <button
                      key={q}
                      onClick={() => { setInput(q); }}
                      className="w-full text-left text-xs p-2 rounded-lg border border-border/50 hover:border-neon-cyan/30 hover:bg-muted/30 transition-colors font-body text-muted-foreground"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-sm font-body ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 border border-neon-cyan/20'
                      : 'bg-muted/50 border border-border/50'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1 [&_li]:my-0.5 [&_h1]:text-sm [&_h2]:text-sm [&_h3]:text-xs">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-muted/50 border border-border/50 rounded-xl px-3 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-neon-cyan" />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-border/50">
            <form
              onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your grades, attendance..."
                className="flex-1 bg-muted/30 border border-border/50 rounded-lg px-3 py-2 text-sm font-body placeholder:text-muted-foreground/50 focus:outline-none focus:border-neon-cyan/40 transition-colors"
              />
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() || loading}
                className="h-9 w-9 rounded-lg bg-gradient-to-br from-neon-cyan to-neon-purple hover:opacity-90 transition-opacity"
              >
                <Send className="h-4 w-4 text-background" />
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

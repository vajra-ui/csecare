import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

// Pages
import HomePage from "./pages/HomePage";
import NotFound from "./pages/NotFound";

// Auth Components
import { AdminLogin } from "@/components/auth/AdminLogin";
import { FacultyLogin } from "@/components/auth/FacultyLogin";
import { StudentLogin } from "@/components/auth/StudentLogin";

// Admin Pages
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminAnalytics from "@/pages/admin/AdminAnalytics";
import AdminStudents from "@/pages/admin/AdminStudents";
import AdminFaculty from "@/pages/admin/AdminFaculty";
import AdminAnnouncements from "@/pages/admin/AdminAnnouncements";
import AdminODRequests from "@/pages/admin/AdminODRequests";
import AdminAuditLogs from "@/pages/admin/AdminAuditLogs";
import AdminReports from "@/pages/admin/AdminReports";
import AdminRiskAnalysis from "@/pages/admin/AdminRiskAnalysis";
import AdminSettings from "@/pages/admin/AdminSettings";

// Faculty Pages
import FacultyDashboard from "@/pages/faculty/FacultyDashboard";
import FacultyProfile from "@/pages/faculty/FacultyProfile";
import FacultyAttendance from "@/pages/faculty/FacultyAttendance";
import FacultyAssignments from "@/pages/faculty/FacultyAssignments";
import FacultyODRequests from "@/pages/faculty/FacultyODRequests";
import FacultyTimetable from "@/pages/faculty/FacultyTimetable";
import FacultyStudents from "@/pages/faculty/FacultyStudents";
import FacultyMarks from "@/pages/faculty/FacultyMarks";
import FacultyNotes from "@/pages/faculty/FacultyNotes";
import FacultyLeave from "@/pages/faculty/FacultyLeave";
import FacultyParentComm from "@/pages/faculty/FacultyParentComm";
import FacultyMentoring from "@/pages/faculty/FacultyMentoring";
import FacultyMessages from "@/pages/faculty/FacultyMessages";
import FacultyAchievements from "@/pages/faculty/FacultyAchievements";
import FacultyODSubmit from "@/pages/faculty/FacultyODSubmit";
import FacultyAnnouncements from "@/pages/faculty/FacultyAnnouncements";
import TutorAbsenceReports from "@/pages/faculty/TutorAbsenceReports";
import TutorWeeklyReports from "@/pages/faculty/TutorWeeklyReports";

// Admin extra
import AdminFacultyOD from "@/pages/admin/AdminFacultyOD";
import AdminAlumni from "@/pages/admin/AdminAlumni";
import AdminShowcase from "@/pages/admin/AdminShowcase";
import AdminSubstitutes from "@/pages/admin/AdminSubstitutes";
import AdminAbsenceReports from "@/pages/admin/AdminAbsenceReports";

// Student extra
import StudentActivities from "@/pages/student/StudentActivities";

// Student Pages
import StudentDashboard from "@/pages/student/StudentDashboard";
import StudentProfile from "@/pages/student/StudentProfile";
import StudentTimetable from "@/pages/student/StudentTimetable";
import StudentAssignments from "@/pages/student/StudentAssignments";
import StudentOD from "@/pages/student/StudentOD";
import StudentAttendance from "@/pages/student/StudentAttendance";
import StudentProgress from "@/pages/student/StudentProgress";
import StudentUpload from "@/pages/student/StudentUpload";
import StudentAchievements from "@/pages/student/StudentAchievements";
import StudentGPACalc from "@/pages/student/StudentGPACalc";
import StudentExamTimetable from "@/pages/student/StudentExamTimetable";
import StudentFeedback from "@/pages/student/StudentFeedback";
import StudentMessages from "@/pages/student/StudentMessages";

const queryClient = new QueryClient();

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: string[] }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login/admin" element={<AdminLogin />} />
      <Route path="/login/faculty" element={<FacultyLogin />} />
      <Route path="/login/student" element={<StudentLogin />} />
      
      {/* Admin Routes */}
      <Route path="/admin" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/analytics" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminAnalytics /></ProtectedRoute>} />
      <Route path="/admin/students" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminStudents /></ProtectedRoute>} />
      <Route path="/admin/faculty" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminFaculty /></ProtectedRoute>} />
      <Route path="/admin/announcements" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminAnnouncements /></ProtectedRoute>} />
      <Route path="/admin/od-requests" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminODRequests /></ProtectedRoute>} />
      <Route path="/admin/audit-logs" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminAuditLogs /></ProtectedRoute>} />
      <Route path="/admin/reports" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminReports /></ProtectedRoute>} />
      <Route path="/admin/risk-analysis" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminRiskAnalysis /></ProtectedRoute>} />
      <Route path="/admin/settings" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminSettings /></ProtectedRoute>} />
      <Route path="/admin/faculty-od" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminFacultyOD /></ProtectedRoute>} />
      <Route path="/admin/alumni" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminAlumni /></ProtectedRoute>} />
      <Route path="/admin/showcase" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminShowcase /></ProtectedRoute>} />
      <Route path="/admin/substitutes" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminSubstitutes /></ProtectedRoute>} />
      <Route path="/admin/absence-reports" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminAbsenceReports /></ProtectedRoute>} />
      
      {/* Faculty Routes */}
      <Route path="/faculty" element={<ProtectedRoute allowedRoles={['FACULTY', 'TUTOR']}><FacultyDashboard /></ProtectedRoute>} />
      <Route path="/faculty/profile" element={<ProtectedRoute allowedRoles={['FACULTY', 'TUTOR']}><FacultyProfile /></ProtectedRoute>} />
      <Route path="/faculty/timetable" element={<ProtectedRoute allowedRoles={['FACULTY', 'TUTOR']}><FacultyTimetable /></ProtectedRoute>} />
      <Route path="/faculty/attendance" element={<ProtectedRoute allowedRoles={['FACULTY', 'TUTOR']}><FacultyAttendance /></ProtectedRoute>} />
      <Route path="/faculty/assignments" element={<ProtectedRoute allowedRoles={['FACULTY', 'TUTOR']}><FacultyAssignments /></ProtectedRoute>} />
      <Route path="/faculty/students" element={<ProtectedRoute allowedRoles={['TUTOR']}><FacultyStudents /></ProtectedRoute>} />
      <Route path="/faculty/od-requests" element={<ProtectedRoute allowedRoles={['TUTOR']}><FacultyODRequests /></ProtectedRoute>} />
      <Route path="/faculty/marks" element={<ProtectedRoute allowedRoles={['FACULTY', 'TUTOR']}><FacultyMarks /></ProtectedRoute>} />
      <Route path="/faculty/notes" element={<ProtectedRoute allowedRoles={['FACULTY', 'TUTOR']}><FacultyNotes /></ProtectedRoute>} />
      <Route path="/faculty/leave" element={<ProtectedRoute allowedRoles={['FACULTY', 'TUTOR']}><FacultyLeave /></ProtectedRoute>} />
      <Route path="/faculty/parent-communication" element={<ProtectedRoute allowedRoles={['TUTOR']}><FacultyParentComm /></ProtectedRoute>} />
      <Route path="/faculty/mentoring" element={<ProtectedRoute allowedRoles={['TUTOR']}><FacultyMentoring /></ProtectedRoute>} />
      <Route path="/faculty/messages" element={<ProtectedRoute allowedRoles={['FACULTY', 'TUTOR']}><FacultyMessages /></ProtectedRoute>} />
      <Route path="/faculty/achievements" element={<ProtectedRoute allowedRoles={['FACULTY', 'TUTOR']}><FacultyAchievements /></ProtectedRoute>} />
      <Route path="/faculty/my-od" element={<ProtectedRoute allowedRoles={['FACULTY', 'TUTOR']}><FacultyODSubmit /></ProtectedRoute>} />
      <Route path="/faculty/announcements" element={<ProtectedRoute allowedRoles={['FACULTY', 'TUTOR']}><FacultyAnnouncements /></ProtectedRoute>} />
      <Route path="/faculty/absence-reports" element={<ProtectedRoute allowedRoles={['TUTOR']}><TutorAbsenceReports /></ProtectedRoute>} />
      <Route path="/faculty/weekly-reports" element={<ProtectedRoute allowedRoles={['TUTOR']}><TutorWeeklyReports /></ProtectedRoute>} />
      
      {/* Student Routes */}
      <Route path="/student" element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentDashboard /></ProtectedRoute>} />
      <Route path="/student/profile" element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentProfile /></ProtectedRoute>} />
      <Route path="/student/timetable" element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentTimetable /></ProtectedRoute>} />
      <Route path="/student/upload" element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentUpload /></ProtectedRoute>} />
      <Route path="/student/assignments" element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentAssignments /></ProtectedRoute>} />
      <Route path="/student/od" element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentOD /></ProtectedRoute>} />
      <Route path="/student/attendance" element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentAttendance /></ProtectedRoute>} />
      <Route path="/student/progress" element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentProgress /></ProtectedRoute>} />
      <Route path="/student/achievements" element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentAchievements /></ProtectedRoute>} />
      <Route path="/student/gpa-calculator" element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentGPACalc /></ProtectedRoute>} />
      <Route path="/student/exam-timetable" element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentExamTimetable /></ProtectedRoute>} />
      <Route path="/student/feedback" element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentFeedback /></ProtectedRoute>} />
      <Route path="/student/messages" element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentMessages /></ProtectedRoute>} />
      
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;

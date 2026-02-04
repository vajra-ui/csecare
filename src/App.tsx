import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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
import AdminStudents from "@/pages/admin/AdminStudents";
import AdminFaculty from "@/pages/admin/AdminFaculty";
import AdminAnnouncements from "@/pages/admin/AdminAnnouncements";

// Faculty Pages
import FacultyDashboard from "@/pages/faculty/FacultyDashboard";
import FacultyAttendance from "@/pages/faculty/FacultyAttendance";
import FacultyODRequests from "@/pages/faculty/FacultyODRequests";

// Student Pages
import StudentDashboard from "@/pages/student/StudentDashboard";
import StudentOD from "@/pages/student/StudentOD";
import StudentAttendance from "@/pages/student/StudentAttendance";
import StudentProgress from "@/pages/student/StudentProgress";

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
      <Route path="/admin/students" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminStudents /></ProtectedRoute>} />
      <Route path="/admin/faculty" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminFaculty /></ProtectedRoute>} />
      <Route path="/admin/announcements" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminAnnouncements /></ProtectedRoute>} />
      
      {/* Faculty Routes */}
      <Route path="/faculty" element={<ProtectedRoute allowedRoles={['FACULTY', 'TUTOR']}><FacultyDashboard /></ProtectedRoute>} />
      <Route path="/faculty/attendance" element={<ProtectedRoute allowedRoles={['FACULTY', 'TUTOR']}><FacultyAttendance /></ProtectedRoute>} />
      <Route path="/faculty/od-requests" element={<ProtectedRoute allowedRoles={['TUTOR']}><FacultyODRequests /></ProtectedRoute>} />
      
      {/* Student Routes */}
      <Route path="/student" element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentDashboard /></ProtectedRoute>} />
      <Route path="/student/od" element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentOD /></ProtectedRoute>} />
      <Route path="/student/attendance" element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentAttendance /></ProtectedRoute>} />
      <Route path="/student/progress" element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentProgress /></ProtectedRoute>} />
      
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
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
);

export default App;

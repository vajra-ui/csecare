import { useNavigate } from 'react-router-dom';
import { ShieldCheck, GraduationCap, Users, Crown, BookOpen, Building2 } from 'lucide-react';
import { PaavaiLogo } from '@/components/ui/PaavaiLogo';
import { RoleCard } from '@/components/RoleCard';
import { AnnouncementPanel } from '@/components/AnnouncementPanel';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function HomePage() {
  const navigate = useNavigate();

  const handleAdminLogin = (role: string) => {
    localStorage.setItem('admin_view_role', role);
    navigate('/login/admin');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="gradient-hero text-white relative">
        <div className="absolute top-4 right-4 z-10">
          <ThemeToggle />
        </div>
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="bg-white p-3 rounded-2xl shadow-lg animate-scale-in">
              <PaavaiLogo size="xl" />
            </div>
            <div className="animate-slide-up">
              <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">
                Paavai Engineering College
              </h1>
              <p className="text-lg md:text-xl opacity-90 font-medium">
                CSE Academic Management System
              </p>
              <p className="text-sm opacity-75 mt-1">
                Autonomous Institution | Approved by AICTE | Affiliated to Anna University
              </p>
            </div>
          </div>
        </div>
        <svg className="w-full h-16 -mb-1" viewBox="0 0 1440 54" fill="none" preserveAspectRatio="none">
          <path d="M0 22L60 16.7C120 11 240 1 360 0.7C480 1 600 11 720 22C840 33 960 44 1080 44C1200 44 1320 33 1380 27.5L1440 22V54H1380C1320 54 1200 54 1080 54C960 54 840 54 720 54C600 54 480 54 360 54C240 54 120 54 60 54H0V22Z" fill="hsl(var(--background))" />
        </svg>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 -mt-4">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Admin Roles */}
            <div>
              <h2 className="font-display text-2xl font-semibold mb-4 text-center lg:text-left">
                Administration
              </h2>
              <div className="grid sm:grid-cols-3 gap-4">
                <RoleCard
                  icon={<Crown className="h-8 w-8" />}
                  title="Principal"
                  description="Institutional oversight & governance"
                  onClick={() => handleAdminLogin('Principal')}
                  variant="admin"
                />
                <RoleCard
                  icon={<BookOpen className="h-8 w-8" />}
                  title="HOD"
                  description="Head of CSE Department"
                  onClick={() => handleAdminLogin('HOD')}
                  variant="admin"
                />
                <RoleCard
                  icon={<Building2 className="h-8 w-8" />}
                  title="COE Cell"
                  description="Controller of Examinations"
                  onClick={() => handleAdminLogin('COE Cell')}
                  variant="admin"
                />
              </div>
            </div>

            {/* Faculty & Student */}
            <div>
              <h2 className="font-display text-2xl font-semibold mb-4 text-center lg:text-left">
                Portal Access
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <RoleCard
                  icon={<Users className="h-8 w-8" />}
                  title="Faculty"
                  description="Teaching staff & tutors"
                  onClick={() => navigate('/login/faculty')}
                  variant="faculty"
                />
                <RoleCard
                  icon={<GraduationCap className="h-8 w-8" />}
                  title="Student"
                  description="CSE department students"
                  onClick={() => navigate('/login/student')}
                  variant="student"
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <AnnouncementPanel />
          </div>
        </div>
      </main>

      <footer className="border-t mt-auto">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <p>© 2024 Paavai Engineering College. All rights reserved.</p>
            <p>Department of Computer Science & Engineering</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

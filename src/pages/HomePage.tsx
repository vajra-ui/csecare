import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ShieldCheck, GraduationCap, Users, BookOpen, Sparkles, ArrowRight, Cpu } from 'lucide-react';
import { PaavaiLogo } from '@/components/ui/PaavaiLogo';
import { RoleCard } from '@/components/RoleCard';
import { AnnouncementPanel } from '@/components/AnnouncementPanel';
import { ThemeToggle } from '@/components/ThemeToggle';
import { AchievementGallery } from '@/components/AchievementGallery';
import { TechNewsBar } from '@/components/TechNewsBar';

export default function HomePage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      if (user.role === 'ADMIN') navigate('/admin', { replace: true });
      else if (user.role === 'FACULTY' || user.role === 'TUTOR') navigate('/faculty', { replace: true });
      else if (user.role === 'STUDENT') navigate('/student', { replace: true });
    }
  }, [user, loading, navigate]);

  const handleAdminLogin = (role: string) => {
    localStorage.setItem('admin_view_role', role);
    navigate('/login/admin');
  };

  return (
    <div className="min-h-screen bg-background relative">
      {/* Ambient grid */}
      <div className="fixed inset-0 grid-pattern opacity-40 pointer-events-none" />

      {/* Hero Header */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero" />
        <div className="absolute inset-0 grid-pattern opacity-20" />
        
        {/* Floating orbs */}
        <div className="absolute top-20 left-10 w-32 h-32 rounded-full bg-neon-cyan/10 blur-3xl animate-float" />
        <div className="absolute bottom-10 right-20 w-40 h-40 rounded-full bg-neon-purple/10 blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />
        <div className="absolute top-10 right-1/3 w-24 h-24 rounded-full bg-neon-pink/10 blur-3xl animate-float" style={{ animationDelay: '0.8s' }} />

        <div className="absolute top-4 right-4 z-10">
          <ThemeToggle />
        </div>
        
        <div className="container mx-auto px-4 py-12 md:py-16 relative z-10">
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="relative animate-scale-in">
              {/* Layered glow rings */}
              <div className="absolute -inset-6 rounded-full bg-gradient-to-r from-neon-cyan/30 via-neon-purple/30 to-neon-pink/30 blur-2xl animate-pulse" />
              <div className="absolute -inset-2 rounded-3xl bg-gradient-to-br from-neon-cyan/40 to-neon-purple/40 blur-md" />
              {/* Rotating conic ring */}
              <div
                className="absolute -inset-3 rounded-full opacity-70"
                style={{
                  background:
                    'conic-gradient(from 0deg, hsl(var(--neon-cyan)), hsl(var(--neon-purple)), hsl(var(--neon-pink)), hsl(var(--neon-cyan)))',
                  animation: 'spin 8s linear infinite',
                  padding: '2px',
                  WebkitMask:
                    'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px))',
                          mask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px))',
                }}
              />
              {/* Logo frame */}
              <div className="relative bg-gradient-to-br from-card/95 to-card/70 backdrop-blur-2xl p-6 rounded-3xl border-2 border-neon-cyan/40 shadow-[0_0_60px_hsl(var(--neon-cyan)/0.4)]">
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-transparent via-neon-cyan/5 to-neon-purple/10 pointer-events-none" />
                {/* Corner accents */}
                <span className="absolute top-2 left-2 h-3 w-3 border-t-2 border-l-2 border-neon-cyan rounded-tl-lg" />
                <span className="absolute top-2 right-2 h-3 w-3 border-t-2 border-r-2 border-neon-purple rounded-tr-lg" />
                <span className="absolute bottom-2 left-2 h-3 w-3 border-b-2 border-l-2 border-neon-purple rounded-bl-lg" />
                <span className="absolute bottom-2 right-2 h-3 w-3 border-b-2 border-r-2 border-neon-cyan rounded-br-lg" />
                <PaavaiLogo size="xl" />
              </div>
            </div>
            <div className="animate-slide-up space-y-3">
              <div className="flex items-center justify-center gap-2">
                <Cpu className="h-4 w-4 text-neon-cyan" />
                <span className="text-neon-cyan font-body text-xs tracking-[0.3em] uppercase">CSE Department</span>
              </div>
              <h1 className="font-display text-3xl md:text-5xl lg:text-6xl font-black text-primary-foreground tracking-[0.15em] uppercase drop-shadow-[0_0_25px_hsl(var(--neon-cyan)/0.5)]">
                PAAVAI ENGINEERING COLLEGE
              </h1>
              <p className="text-lg md:text-xl text-primary-foreground/80 font-body font-light uppercase tracking-widest">
                Academic Management System
              </p>
              <p className="text-xs text-primary-foreground/60 font-body tracking-[0.2em] uppercase">
                Autonomous Institution • AICTE Approved • Anna University
              </p>
            </div>
          </div>
        </div>

        {/* Wave divider */}
        <svg className="w-full h-20 -mb-1 relative z-10" viewBox="0 0 1440 80" fill="none" preserveAspectRatio="none">
          <path d="M0 40C240 10 480 70 720 40C960 10 1200 70 1440 40V80H0V40Z" fill="hsl(var(--background))" />
        </svg>
      </header>

      {/* Live Tech News Ticker */}
      <TechNewsBar />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 -mt-4 relative z-10">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-10">
            {/* Administration */}
            <section className="animate-slide-up" style={{ animationDelay: '100ms' }}>
              <div className="flex items-center gap-3 mb-5">
                <div className="h-8 w-1 rounded-full bg-gradient-to-b from-neon-cyan to-neon-purple" />
                <h2 className="font-display text-xl font-semibold tracking-wider">Administration</h2>
              </div>
              <div className="grid sm:grid-cols-1 gap-4">
                <RoleCard
                  icon={<BookOpen className="h-7 w-7" />}
                  title="HOD"
                  description="Head of CSE Department"
                  onClick={() => handleAdminLogin('HOD')}
                  variant="admin"
                />
              </div>
            </section>

            {/* Portal Access */}
            <section className="animate-slide-up" style={{ animationDelay: '200ms' }}>
              <div className="flex items-center gap-3 mb-5">
                <div className="h-8 w-1 rounded-full bg-gradient-to-b from-neon-pink to-secondary" />
                <h2 className="font-display text-xl font-semibold tracking-wider">Portal Access</h2>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <RoleCard
                  icon={<Users className="h-7 w-7" />}
                  title="Faculty"
                  description="Teaching staff & tutors"
                  onClick={() => navigate('/login/faculty')}
                  variant="faculty"
                />
                <RoleCard
                  icon={<GraduationCap className="h-7 w-7" />}
                  title="Student"
                  description="CSE department students"
                  onClick={() => navigate('/login/student')}
                  variant="student"
                />
              </div>
            </section>
          </div>

          <div className="lg:col-span-1 animate-slide-up" style={{ animationDelay: '300ms' }}>
            <AnnouncementPanel />
          </div>
        </div>

        {/* Achievement Gallery */}
        <div className="mt-10">
          <AchievementGallery />
        </div>
      </main>

      <footer className="border-t border-border/50 mt-auto relative z-10">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground font-body tracking-wider">
            <p>© 2026 Paavai Engineering College. All rights reserved.</p>
            <div className="flex items-center gap-2">
              <Sparkles className="h-3 w-3 text-neon-cyan" />
              <p>Department of Computer Science & Engineering</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

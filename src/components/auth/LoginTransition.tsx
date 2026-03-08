import { useEffect, useState } from 'react';
import { PaavaiLogo } from '@/components/ui/PaavaiLogo';

interface LoginTransitionProps {
  roleName: string;
  onComplete: () => void;
}

export function LoginTransition({ roleName, onComplete }: LoginTransitionProps) {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<'entering' | 'loading' | 'exiting'>('entering');

  useEffect(() => {
    // Start loading after enter animation
    const enterTimer = setTimeout(() => setPhase('loading'), 400);
    return () => clearTimeout(enterTimer);
  }, []);

  useEffect(() => {
    if (phase !== 'loading') return;
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          setPhase('exiting');
          setTimeout(onComplete, 600);
          return 100;
        }
        return p + Math.random() * 15 + 5;
      });
    }, 120);
    return () => clearInterval(interval);
  }, [phase, onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background transition-opacity duration-500 ${
        phase === 'exiting' ? 'opacity-0 scale-105' : 'opacity-100 scale-100'
      }`}
      style={{ transition: 'opacity 0.5s ease, transform 0.5s ease' }}
    >
      {/* Ambient background effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute inset-0 grid-pattern opacity-30" />
      </div>

      {/* Content */}
      <div className={`relative flex flex-col items-center gap-8 transition-all duration-500 ${
        phase === 'entering' ? 'opacity-0 translate-y-8' : 'opacity-100 translate-y-0'
      }`}>
        {/* Spinning logo ring */}
        <div className="relative">
          <div className="absolute -inset-4 rounded-full border-2 border-primary/20 animate-spin" style={{ animationDuration: '3s' }} />
          <div className="absolute -inset-8 rounded-full border border-primary/10 animate-spin" style={{ animationDuration: '5s', animationDirection: 'reverse' }} />
          <PaavaiLogo size="lg" />
        </div>

        {/* Welcome text */}
        <div className="text-center space-y-2">
          <h2 className="font-display text-2xl font-bold text-foreground">
            Welcome to {roleName} Portal
          </h2>
          <p className="text-muted-foreground text-sm">Preparing your dashboard...</p>
        </div>

        {/* Progress bar */}
        <div className="w-64 space-y-3">
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary via-primary/80 to-primary rounded-full transition-all duration-200 ease-out"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-center font-mono">
            {Math.min(Math.round(progress), 100)}%
          </p>
        </div>

        {/* Animated dots */}
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-primary/60 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

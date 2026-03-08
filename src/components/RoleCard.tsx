import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';

interface RoleCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  variant?: 'admin' | 'faculty' | 'student';
}

const variantStyles = {
  admin: {
    borderHover: 'hover:border-primary/40',
    iconGradient: 'from-primary/20 to-neon-pink/10',
    iconColor: 'text-primary',
    glowColor: 'group-hover:shadow-[0_0_20px_hsl(var(--primary)/0.15)]',
    accentLine: 'bg-gradient-to-r from-primary to-neon-pink',
  },
  faculty: {
    borderHover: 'hover:border-secondary/40',
    iconGradient: 'from-secondary/20 to-warning/10',
    iconColor: 'text-secondary',
    glowColor: 'group-hover:shadow-[0_0_20px_hsl(var(--secondary)/0.15)]',
    accentLine: 'bg-gradient-to-r from-secondary to-warning',
  },
  student: {
    borderHover: 'hover:border-neon-cyan/40',
    iconGradient: 'from-neon-cyan/20 to-neon-purple/10',
    iconColor: 'text-neon-cyan',
    glowColor: 'group-hover:shadow-[0_0_20px_hsl(var(--neon-cyan)/0.15)]',
    accentLine: 'bg-gradient-to-r from-neon-cyan to-neon-purple',
  },
};

export function RoleCard({ icon, title, description, onClick, variant = 'admin' }: RoleCardProps) {
  const styles = variantStyles[variant];

  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative cursor-pointer rounded-xl overflow-hidden transition-all duration-300',
        'bg-card/80 backdrop-blur-sm border border-border/50',
        'hover:-translate-y-1.5',
        styles.borderHover,
        styles.glowColor,
      )}
    >
      {/* Top accent line */}
      <div className={cn('h-0.5 w-full', styles.accentLine)} />
      
      <div className="p-5 md:p-6">
        <div className="flex flex-col items-center text-center space-y-3">
          {/* Icon container */}
          <div
            className={cn(
              'p-3.5 rounded-xl bg-gradient-to-br transition-all duration-300',
              styles.iconGradient,
              'group-hover:scale-110',
            )}
          >
            <div className={cn(styles.iconColor, 'transition-colors')}>{icon}</div>
          </div>
          
          <div>
            <h3 className="font-display font-semibold text-base tracking-wide mb-0.5">{title}</h3>
            <p className="text-xs text-muted-foreground font-body">{description}</p>
          </div>

          {/* Hover arrow */}
          <div className="flex items-center gap-1 text-xs font-body text-muted-foreground/0 group-hover:text-muted-foreground transition-all duration-300 group-hover:translate-x-1">
            <span>Enter</span>
            <ArrowRight className="h-3 w-3" />
          </div>
        </div>
      </div>
    </div>
  );
}

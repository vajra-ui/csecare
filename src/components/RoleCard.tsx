import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface RoleCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  variant?: 'admin' | 'faculty' | 'student';
}

const variantStyles = {
  admin: {
    gradient: 'from-primary to-primary/80',
    hoverShadow: 'hover:shadow-primary',
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
  },
  faculty: {
    gradient: 'from-secondary to-secondary/80',
    hoverShadow: 'hover:shadow-gold',
    iconBg: 'bg-secondary/10',
    iconColor: 'text-secondary-foreground',
  },
  student: {
    gradient: 'from-info to-info/80',
    hoverShadow: 'hover:shadow-lg',
    iconBg: 'bg-info/10',
    iconColor: 'text-info',
  },
};

export function RoleCard({ icon, title, description, onClick, variant = 'admin' }: RoleCardProps) {
  const styles = variantStyles[variant];

  return (
    <Card
      onClick={onClick}
      className={cn(
        'cursor-pointer transition-all duration-300 group',
        'hover:-translate-y-1 hover:shadow-lg',
        'border-2 border-transparent hover:border-primary/20',
        'bg-card'
      )}
    >
      <CardContent className="p-6">
        <div className="flex flex-col items-center text-center space-y-4">
          <div
            className={cn(
              'p-4 rounded-2xl transition-all duration-300',
              styles.iconBg,
              'group-hover:scale-110'
            )}
          >
            <div className={styles.iconColor}>{icon}</div>
          </div>
          <div>
            <h3 className="font-display font-semibold text-lg mb-1">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

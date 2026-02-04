import paavaiLogo from '@/assets/paavai-logo.png';

interface PaavaiLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  sm: 'h-10 w-10',
  md: 'h-16 w-16',
  lg: 'h-24 w-24',
  xl: 'h-32 w-32',
};

export function PaavaiLogo({ className = '', size = 'md' }: PaavaiLogoProps) {
  return (
    <img
      src={paavaiLogo}
      alt="Paavai Engineering College"
      className={`${sizeClasses[size]} object-contain ${className}`}
    />
  );
}

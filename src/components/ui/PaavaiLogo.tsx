import paavaiLogo from '@/assets/paavai-logo.png';

interface PaavaiLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

// Responsive sizes: smaller on mobile, larger on md+ screens.
// object-contain guarantees no cropping/distortion; aspect-square keeps whitespace even.
const sizeClasses = {
  sm: 'h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10',
  md: 'h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16',
  lg: 'h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24',
  xl: 'h-20 w-20 sm:h-24 sm:w-24 md:h-28 md:w-28 lg:h-32 lg:w-32',
};

export function PaavaiLogo({ className = '', size = 'md' }: PaavaiLogoProps) {
  return (
    <img
      src={paavaiLogo}
      alt="Paavai Engineering College"
      loading="eager"
      decoding="async"
      className={`${sizeClasses[size]} aspect-square object-contain shrink-0 select-none ${className}`}
    />
  );
}


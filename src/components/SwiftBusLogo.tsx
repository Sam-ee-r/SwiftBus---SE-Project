import { useNavigate } from 'react-router-dom';

interface SwiftBusLogoProps {
  /** Size variant */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** If true, clicking navigates to '/' */
  clickable?: boolean;
  className?: string;
}

const sizeMap: Record<NonNullable<SwiftBusLogoProps['size']>, string> = {
  sm: 'text-lg',
  md: 'text-2xl',
  lg: 'text-3xl',
  xl: 'text-5xl',
};

export function SwiftBusLogo({ size = 'md', clickable = false, className = '' }: SwiftBusLogoProps) {
  const navigate = useNavigate();

  return (
    <span
      className={[
        "font-['Space_Grotesk'] font-bold bg-gradient-to-r from-violet-400 to-emerald-400 bg-clip-text text-transparent select-none",
        sizeMap[size],
        clickable ? 'cursor-pointer' : '',
        className,
      ].join(' ')}
      onClick={clickable ? () => navigate('/') : undefined}
    >
      SwiftBus
    </span>
  );
}

import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  href?: string | null;
  priority?: boolean;
}

const heights: Record<NonNullable<LogoProps['size']>, number> = {
  sm: 32,
  md: 44,
  lg: 64,
  xl: 96,
};

export function Logo({ size = 'md', className, href = '/', priority = false }: LogoProps) {
  const height = heights[size];
  const width = Math.round(height * 1.15);

  const image = (
    <Image
      src="/logo.png"
      alt="Excellence Online College"
      width={width}
      height={height}
      priority={priority}
      className={cn('h-auto w-auto object-contain', className)}
      style={{ maxHeight: height }}
    />
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex shrink-0">
        {image}
      </Link>
    );
  }

  return <div className="inline-flex shrink-0">{image}</div>;
}

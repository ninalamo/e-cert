"use client"

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface IOSShimmerProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function IOSShimmer({ className, ...props }: IOSShimmerProps) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) return null

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg',
        '[mask-image:linear-gradient(120deg,transparent_0%,rgba(255,255,255,0.8)_50%,transparent_100%)]',
        '[background:linear-gradient(90deg,hsl(var(--color-surface-muted))_0%,hsl(var(--color-surface))_50%,hsl(var(--color-surface-muted))_100%)]',
        'animate-[shimmer_2s_ease-in-out_infinite]',
        className
      )}
      {...props}
    />
  )
}

const shimmerKeyframe = `
  @keyframes shimmer {
    0% { background-position: 100% 0; }
    100% { background-position: -100% 0; }
  }
  
  @media (prefers-reduced-motion: no-preference) {
    .shimmer-smooth {
      animation: shimmer 1.5s ease-in-out infinite;
      background: linear-gradient(
        90deg,
        hsl(var(--color-surface-muted)) 25%,
        hsl(var(--color-surface)) 50%,
        hsl(var(--color-surface-muted)) 75%
      );
      background-size: 200% 100%;
    }
  }
`

export const injectShimmerKeyframes = () => {
  const style = document.createElement('style')
  style.textContent = shimmerKeyframe
  document.head.appendChild(style)
}

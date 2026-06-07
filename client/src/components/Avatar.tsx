"use client";

import { useState } from "react";

interface AvatarProps {
  src?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export default function Avatar({ src, name, size = 'md', className = '' }: AvatarProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-16 h-16 text-2xl',
    xl: 'w-24 h-24 text-3xl'
  };

  const initial = name ? name.charAt(0).toUpperCase() : '?';

  const [error, setError] = useState(false);

  if (src && !error) {
    return (
      <img
        src={src}
        alt={`${name}'s avatar`}
        className={`${sizeClasses[size]} object-cover flex-shrink-0 ${className}`}
        onError={() => setError(true)}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} bg-black text-white flex items-center justify-center font-bold flex-shrink-0 ${className}`}
    >
      {initial}
    </div>
  );
}

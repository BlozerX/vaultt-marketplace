import React, { useState } from 'react';
import PlaceholderImage from './PlaceholderImage';

interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  category?: string;
  fallbackClassName?: string;
}

export default function ImageWithFallback({ src, category, fallbackClassName, className, alt, ...props }: ImageWithFallbackProps) {
  const [error, setError] = useState(false);

  if (!src || error) {
    return (
      <PlaceholderImage 
        category={category || 'Miscallaneous'} 
        className={fallbackClassName || className} 
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setError(true)}
      {...props}
    />
  );
}

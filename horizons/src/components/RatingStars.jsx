import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

const RatingStars = ({ count = 5, initialValue = 0, onChange, size = 24, readonly = false }) => {
  const [rating, setRating] = useState(initialValue);
  const [hover, setHover] = useState(0);

  const handleClick = (ratingValue) => {
    if (readonly) return;
    setRating(ratingValue);
    if (onChange) {
      onChange(ratingValue);
    }
  };

  return (
    <div className="flex items-center" dir="ltr">
      {[...Array(count)].map((_, index) => {
        const ratingValue = index + 1;
        return (
          <label key={index}>
            <input
              type="radio"
              name="rating"
              value={ratingValue}
              onClick={() => handleClick(ratingValue)}
              className="hidden"
              disabled={readonly}
            />
            <Star
              className={cn(
                'cursor-pointer transition-colors',
                readonly && 'cursor-default'
              )}
              color={ratingValue <= (hover || rating) ? '#ffc107' : '#e4e5e9'}
              fill={ratingValue <= (hover || rating) ? '#ffc107' : '#e4e5e9'}
              size={size}
              onMouseEnter={() => !readonly && setHover(ratingValue)}
              onMouseLeave={() => !readonly && setHover(0)}
            />
          </label>
        );
      })}
    </div>
  );
};

export default RatingStars;
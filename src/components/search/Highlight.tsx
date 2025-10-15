
'use client';

import React from 'react';

interface HighlightProps {
  text: string;
  highlight: string;
}

export function Highlight({ text, highlight }: HighlightProps) {
  if (!highlight.trim()) {
    return <span>{text}</span>;
  }
  const regex = new RegExp(`(${highlight})`, 'gi');
  const parts = text.split(regex);

  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === highlight.toLowerCase() ? (
          <mark key={i} className="bg-primary/20 text-primary-foreground p-0 rounded">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </span>
  );
}

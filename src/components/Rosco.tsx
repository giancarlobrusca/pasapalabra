import type { CSSProperties, ReactNode } from 'react';
import type { LetterSlot } from '../lib/types';

interface Props {
  slots: LetterSlot[];
  currentIndex?: number;
  showCurrent?: boolean;
  children?: ReactNode;
  className?: string;
  testid?: string;
}

export default function Rosco({ slots, currentIndex = -1, showCurrent = true, children, className = '', testid }: Props) {
  const n = slots.length;
  return (
    <div className={`rosco ${className}`} data-testid={testid} style={{ '--n': n } as CSSProperties}>
      {slots.map((s, i) => {
        const current = showCurrent && i === currentIndex;
        return (
          <div
            key={s.letter}
            className={`letter ${s.status} ${current ? 'current' : ''}`}
            style={{ '--i': i } as CSSProperties}
            data-letter={s.letter}
            data-status={s.status}
            aria-label={`${s.letter}: ${s.status}`}
          >
            <span key={s.status}>{s.letter}</span>
          </div>
        );
      })}
      <div className="rosco-center">{children}</div>
    </div>
  );
}

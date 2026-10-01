import { useState } from 'react';
import type { InputHTMLAttributes } from 'react';
import './sensitive-input.css';

type SensitiveInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

export function SensitiveInput({ className = '', ...props }: SensitiveInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="sensitive-input">
      <input {...props} type={visible ? 'text' : 'password'} className={className} />

      <button
        type="button"
        className="sensitive-input-toggle"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? 'Hide value' : 'Show value'}
        aria-pressed={visible}
        title={visible ? 'Hide' : 'Show'}
      >
        {visible ? (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 3l18 18M10.6 10.7a2 2 0 002.7 2.7M9.9 4.2A10.7 10.7 0 0112 4c5.5 0 9.5 5 9.5 5s-1.2 1.5-3.1 2.9M6.2 6.2C3.9 7.6 2.5 10 2.5 10s4 5 9.5 5c1.2 0 2.3-.2 3.3-.6" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M2.5 12s3.5-5 9.5-5 9.5 5 9.5 5-3.5 5-9.5 5-9.5-5-9.5-5z" />
            <circle cx="12" cy="12" r="2.5" />
          </svg>
        )}
      </button>
    </div>
  );
}
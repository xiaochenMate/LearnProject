import React from 'react';

interface BrandLogoProps {
  compact?: boolean;
  className?: string;
  inverse?: boolean;
}

export const BrandMark: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    viewBox="0 0 40 40"
    aria-hidden="true"
    className={className}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect width="40" height="40" rx="10" fill="#0F172A" />
    <path d="M10 11L20 20L10 29" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M20 20H32" stroke="#4F7CFF" strokeWidth="3.5" strokeLinecap="round" />
    <circle cx="32" cy="20" r="2.5" fill="#67E8F9" />
  </svg>
);

const BrandLogo: React.FC<BrandLogoProps> = ({ compact = false, className = '', inverse = false }) => (
  <div className={`flex min-w-0 items-center gap-3 ${className}`}>
    <BrandMark className="h-9 w-9 shrink-0" />
    {!compact && (
      <div className="min-w-0">
        <div className={`text-[18px] font-semibold leading-none ${inverse ? 'text-white' : 'text-[#111318] dark:text-white'}`}>
          ExBeam
        </div>
      </div>
    )}
  </div>
);

export default BrandLogo;

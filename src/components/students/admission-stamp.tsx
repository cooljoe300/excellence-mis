'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

interface AdmissionStampProps {
  className?: string;
}

export function AdmissionStamp({ className = '' }: AdmissionStampProps) {
  const [currentDate, setCurrentDate] = useState('');

  useEffect(() => {
    // Format current date as DD MMM YYYY
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const month = months[now.getMonth()];
    const year = now.getFullYear();
    setCurrentDate(`${day} ${month} ${year}`);
  }, []);

  return (
    <div className={`relative inline-block ${className}`} style={{ width: '170px', height: '113px' }}>
      <div className="relative w-full h-full">
        <Image
          src="/eoc.png"
          alt="Excellence Online College Admissions Office Stamp"
          width={170}
          height={113}
          className="w-full h-full object-contain"
          priority
          unoptimized
        />
        {/* Dynamic date overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-[10px] font-bold text-red-700" style={{ marginTop: '2px' }}>
            {currentDate}
          </span>
        </div>
      </div>
    </div>
  );
}

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
    <div className={`relative inline-block ${className}`}>
      <div className="relative">
        <Image
          src="/eoc.png"
          alt="Excellence Online College Admissions Office Stamp"
          width={170}
          height={113}
          className="drop-shadow-md"
          priority
        />
        {/* Dynamic date overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[10px] font-bold text-red-700" style={{ marginTop: '2px' }}>
            {currentDate}
          </span>
        </div>
      </div>
    </div>
  );
}

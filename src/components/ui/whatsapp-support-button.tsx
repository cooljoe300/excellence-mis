'use client';

import { MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WhatsAppSupportButtonProps {
  phoneNumber?: string;
  message?: string;
  label?: string;
  className?: string;
}

const DEFAULT_PHONE_NUMBER = '254707155748';
const DEFAULT_MESSAGE = 'Hello Excellence Online College, I need assistance with student registration. I am currently on the student registration page and would like help.';

export function WhatsAppSupportButton({
  phoneNumber = DEFAULT_PHONE_NUMBER,
  message = DEFAULT_MESSAGE,
  label,
  className,
}: WhatsAppSupportButtonProps) {
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-green-500 px-4 py-3 text-white shadow-lg transition-all hover:bg-green-600 hover:scale-105 hover:shadow-xl',
        className
      )}
      aria-label="Get registration assistance on WhatsApp"
      title="Need help? Chat with us on WhatsApp"
    >
      <MessageCircle className="h-5 w-5" />
      {label && <span className="text-sm font-medium">{label}</span>}
    </a>
  );
}

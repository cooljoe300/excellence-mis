import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  BookOpen,
  CreditCard,
  Award,
  Calendar,
  IdCard,
  FileText,
  ExternalLink,
  User,
  Lock
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export function QuickServices({ onlineClassesLocked = false }: { onlineClassesLocked?: boolean }) {
  const services = [
    {
      title: 'Registration',
      description: 'Register or update academic units',
      icon: BookOpen,
      href: '/student/enroll',
      color: 'bg-blue-100 text-blue-700',
    },
    {
      title: 'Fees',
      description: 'View fee statement and make payments',
      icon: CreditCard,
      href: '/student/fees',
      color: 'bg-emerald-100 text-emerald-700',
    },
    {
      title: 'Results',
      description: 'View examination grades and performance',
      icon: Award,
      href: '/student/exam-results',
      color: 'bg-purple-100 text-purple-700',
    },
    {
      title: 'Timetable',
      description: 'View class schedule',
      icon: Calendar,
      href: '/student/timetable',
      color: 'bg-amber-100 text-amber-700',
    },
    {
      title: 'ID Card',
      description: 'View or download student ID card',
      icon: IdCard,
      href: '/student/id-card',
      color: 'bg-red-100 text-red-700',
    },
    {
      title: 'Documents',
      description: 'Access admission letters and documents',
      icon: FileText,
      href: '/student/admission-letter',
      color: 'bg-indigo-100 text-indigo-700',
    },
    {
      title: 'Moodle',
      description: 'Access learning management system',
      icon: ExternalLink,
      href: 'https://lms.excellenceonlinecollege.com/',
      external: true,
      color: 'bg-teal-100 text-teal-700',
    },
    {
      title: 'Profile',
      description: 'Update personal information',
      icon: User,
      href: '/student/register',
      color: 'bg-slate-100 text-slate-700',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Services</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((service) => {
            const Icon = service.icon;
            const linkProps = service.external
              ? { href: service.href, target: '_blank', rel: 'noopener noreferrer' }
              : { href: service.href };

            if (service.external && onlineClassesLocked) {
              return (
                <div key={service.title} className="relative">
                  <Link href="/student/fees">
                    <Button
                      variant="secondary"
                      className="h-full w-full flex-col items-start gap-3 p-4 hover:bg-slate-50"
                    >
                      <div className={`rounded-lg p-2 ${service.color} opacity-60`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="text-left">
                        <p className="flex items-center gap-1.5 font-semibold text-slate-900">
                          {service.title}
                          <Lock className="h-3.5 w-3.5 text-accent" />
                        </p>
                        <p className="text-xs text-slate-600">
                          Online Classes Locked — You need to make a payment before you can access online classes.
                        </p>
                      </div>
                    </Button>
                  </Link>
                </div>
              );
            }

            return (
              <Link key={service.title} {...linkProps}>
                <Button
                  variant="secondary"
                  className="h-full flex-col items-start gap-3 p-4 hover:bg-slate-50"
                >
                  <div className={`rounded-lg p-2 ${service.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-slate-900">{service.title}</p>
                    <p className="text-xs text-slate-600">{service.description}</p>
                  </div>
                </Button>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
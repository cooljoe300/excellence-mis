'use client';

import { useEffect, useRef, useState } from 'react';
import { Database, FileCode2, FileJson, Loader2, Download } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const EXPORTS = [
  {
    id: 'backup',
    href: '/api/database/backup',
    label: 'Full backup',
    format: 'JSON',
    description: 'Schema, every table row, account metadata and storage bucket list.',
    icon: Database,
  },
  {
    id: 'schema-sql',
    href: '/api/database/schema?format=sql',
    label: 'Schema',
    format: 'SQL',
    description: 'DDL for tables, indexes, functions, triggers, views and RLS policies.',
    icon: FileCode2,
  },
  {
    id: 'schema-json',
    href: '/api/database/schema?format=json',
    label: 'Schema',
    format: 'JSON',
    description: 'Machine-readable snapshot for diffing or tooling.',
    icon: FileJson,
  },
] as const;

export function DatabaseToolsCard() {
  const [busy, setBusy] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  function handleDownload(id: string) {
    setBusy(id);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setBusy(null), 20000);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Backup &amp; export</CardTitle>
        <CardDescription>
          Backups are generated on the server from the live database. The full backup can take a
          few seconds to prepare.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {EXPORTS.map((item) => {
          const Icon = item.icon;
          const isBusy = busy === item.id;

          return (
            <a
              key={item.id}
              href={item.href}
              download
              onClick={() => handleDownload(item.id)}
              className={cn(
                'flex items-start gap-3 rounded-lg border border-slate-200 p-4 transition-colors',
                'hover:border-slate-300 hover:bg-slate-50',
                isBusy && 'pointer-events-none opacity-70'
              )}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                {isBusy ? (
                  <Loader2 className="h-5 w-5 animate-spin text-slate-600" />
                ) : (
                  <Icon className="h-5 w-5 text-slate-600" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-slate-900">{item.label}</p>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                    {item.format}
                  </span>
                  {isBusy && (
                    <span className="text-xs font-medium text-slate-500">Preparing…</span>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-slate-500">{item.description}</p>
              </div>
              <Download className="mt-1 h-4 w-4 shrink-0 text-slate-400" />
            </a>
          );
        })}
      </CardContent>
    </Card>
  );
}

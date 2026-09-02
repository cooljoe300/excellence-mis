'use client';

import { Component, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

function SectionErrorFallback({ title, onRetry }: { title: string; onRetry: () => void }) {
  const router = useRouter();
  return (
    <section
      aria-label={title}
      role="alert"
      className="flex min-h-[160px] flex-col items-center justify-center rounded-xl border border-border bg-white p-6 text-center shadow-sm"
    >
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-amber-50 text-amber-600">
        <AlertTriangle className="h-5 w-5" aria-hidden />
      </div>
      <p className="text-sm font-semibold text-slate-900">Unable to load this information</p>
      <p className="mt-1 text-xs text-muted">{title} could not be loaded right now.</p>
      <Button
        variant="secondary"
        size="sm"
        className="mt-4"
        onClick={() => {
          onRetry();
          router.refresh();
        }}
      >
        <RotateCcw className="h-3.5 w-3.5" aria-hidden />
        Retry
      </Button>
    </section>
  );
}

interface Props {
  title: string;
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class SectionErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error(`[dashboard] ${this.props.title} failed`, error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <SectionErrorFallback title={this.props.title} onRetry={() => this.setState({ hasError: false })} />
      );
    }
    return this.props.children;
  }
}

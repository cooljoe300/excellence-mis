import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';
import Link from 'next/link';
import type { DashboardAction } from '@/app/actions/student-dashboard';
import { cn } from '@/lib/utils';

interface ActionCenterProps {
  actions: DashboardAction[];
}

export function ActionCenter({ actions }: ActionCenterProps) {
  if (actions.length === 0) return null;

  const highPriorityActions = actions.filter(a => a.priority === 'high');
  const otherActions = actions.filter(a => a.priority !== 'high');

  return (
    <Card className="border-amber-200 bg-amber-50/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          Action Required
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {highPriorityActions.map((action) => (
          <ActionItem key={action.id} action={action} />
        ))}
        
        {otherActions.length > 0 && (
          <div className="pt-2 border-t border-amber-200">
            {otherActions.map((action) => (
              <ActionItem key={action.id} action={action} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ActionItem({ action }: { action: DashboardAction }) {
  const getIcon = () => {
    switch (action.priority) {
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-amber-600" />;
      case 'medium':
        return <AlertCircle className="h-4 w-4 text-blue-600" />;
      default:
        return <Info className="h-4 w-4 text-slate-600" />;
    }
  };

  const getBadgeVariant = () => {
    switch (action.priority) {
      case 'high':
        return 'bg-amber-100 text-amber-800';
      case 'medium':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <div className="flex items-start justify-between gap-4 rounded-lg bg-white p-4 border border-amber-100">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          {getIcon()}
          <h4 className="font-semibold text-slate-900">{action.title}</h4>
          <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize", getBadgeVariant())}>
            {action.priority}
          </span>
        </div>
        <p className="text-sm text-slate-600">{action.description}</p>
      </div>
      <Link href={action.actionHref}>
        <Button size="sm">{action.actionLabel}</Button>
      </Link>
    </div>
  );
}
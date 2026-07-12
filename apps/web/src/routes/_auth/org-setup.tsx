import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_auth/org-setup')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-neutral-100">Organization Setup</h1>
          <p className="text-sm text-neutral-500">Manage departments, asset categories, and the employee directory.</p>
        </div>
        <span className="inline-flex items-center rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 text-xs font-medium text-amber-400">
          Coming Soon
        </span>
      </div>
      <div className="flex gap-2 border-b border-neutral-800">
        {['Departments', 'Asset Categories', 'Employee Directory'].map((tab) => (
          <button
            key={tab}
            className="px-4 py-2 text-sm text-neutral-500 border-b-2 border-transparent hover:text-neutral-300 transition-colors"
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-8 flex items-center justify-center min-h-[360px]">
        <p className="text-sm text-neutral-600">This module is under development.</p>
      </div>
    </div>
  );
}

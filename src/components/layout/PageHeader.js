/**
 * Consistent page title block: heading, optional description, and
 * optional right-aligned actions (buttons, filters).
 */
export default function PageHeader({ title, description, actions }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between lg:mb-8">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-loop-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-loop-500">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div>}
    </div>
  );
}

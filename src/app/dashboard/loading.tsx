// Shown while a dashboard page is rendering on the server. The shell stays in place.
export default function DashboardLoading() {
  return (
    <div className="page space-y-6" role="status" aria-busy="true">
      <span className="sr-only">Loading…</span>
      <div className="space-y-2" aria-hidden="true">
        <div className="skeleton h-8 w-48" />
        <div className="skeleton h-4 w-64 max-w-full" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
        {[0, 1, 2].map((index) => (
          <div key={index} className="panel space-y-3 p-4">
            <div className="skeleton h-4 w-24" />
            <div className="skeleton h-7 w-16" />
          </div>
        ))}
      </div>
      <div className="panel space-y-4 p-5" aria-hidden="true">
        <div className="skeleton h-5 w-32" />
        <div className="skeleton h-12 w-full" />
        <div className="skeleton h-12 w-full" />
        <div className="skeleton h-12 w-full" />
      </div>
    </div>
  );
}

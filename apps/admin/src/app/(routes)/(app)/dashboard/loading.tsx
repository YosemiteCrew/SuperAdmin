export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      <div className="h-8 w-48 bg-neutral-100 rounded-xl" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-neutral-100 rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-[290px] bg-neutral-100 rounded-2xl" />
        <div className="h-[290px] bg-neutral-100 rounded-2xl" />
      </div>
      <div className="h-64 bg-neutral-100 rounded-2xl" />
    </div>
  );
}

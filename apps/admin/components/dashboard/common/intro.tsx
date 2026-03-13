export function DashboardIntro() {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-normal text-gray-500">Welcome</p>
        <h1 className="text-3xl font-medium text-[#302F2E]">
          Super Admin Dashboard
        </h1>
      </div>
      <button
        type="button"
        className="mt-4 flex w-fit items-center gap-2 rounded-[25px] bg-blue-50 px-4 py-2.5 text-sm font-medium text-blue-700 sm:mt-0"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        8 New Notification
      </button>
    </div>
  );
}

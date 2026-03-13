const ACTIVITY_DATA = [
  {
    events:
      "European Pet Foundation(new business) onboarding. meeting at 3pm",
    department: "CRM",
    startDate: "10:15 AM",
    date: "24 July 2025",
    assignedBy: "Surbhi",
    avatar: "S",
  },
  {
    events:
      "Blog on Food diets for pets, posted on animal blogs- http/webapp/blog.com",
    department: "CMS",
    startDate: "10:15 AM",
    date: "24 July 2025",
    assignedBy: "Suryansh",
    avatar: "S",
  },
  {
    events: "Salaries sent to employees account with 8% hike",
    department: "Finance",
    startDate: "10:30 AM",
    date: "24 July 2025",
    assignedBy: "Varun",
    avatar: "V",
  },
];

export function ActivityLogs() {
  return (
    <div className="rounded-[25px] border border-gray-100 bg-white p-6 shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="pb-3 text-left font-normal text-gray-500">Events</th>
              <th className="pb-3 text-left font-normal text-gray-500">
                Department
              </th>
              <th className="pb-3 text-left font-normal text-gray-500">
                Start Date
              </th>
              <th className="pb-3 text-left font-normal text-gray-500">
                Assigned by
              </th>
            </tr>
          </thead>
          <tbody>
            {ACTIVITY_DATA.map((row, i) => (
              <tr key={i} className="border-b border-gray-50">
                <td className="max-w-xs py-3 font-normal text-[#302F2E]">
                  {row.events}
                </td>
                <td className="py-3 font-normal text-[#302F2E]">
                  {row.department}
                </td>
                <td className="py-3 font-normal text-[#302F2E]">
                  <div>
                    <div>{row.startDate}</div>
                    <div className="text-gray-500">{row.date}</div>
                  </div>
                </td>
                <td className="py-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-medium text-[#302F2E]">
                      {row.avatar}
                    </span>
                    <span className="font-normal text-[#302F2E]">
                      Assignee:{row.assignedBy}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

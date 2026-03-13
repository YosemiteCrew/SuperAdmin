const SOCIAL_DATA = [
  { type: "Instagram", likes: "700", follower: "1840" },
  { type: "TikTok", likes: "501", follower: "42" },
  { type: "X", likes: "492", follower: "234" },
  { type: "LinkedIn", likes: "560", follower: "1345" },
];

export function SocialMediaTable() {
  return (
    <div className="rounded-[25px] border border-gray-100 bg-white p-6 shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="pb-3 text-left font-normal text-gray-500">Type</th>
              <th className="pb-3 text-left font-normal text-gray-500">Likes</th>
              <th className="pb-3 text-left font-normal text-gray-500">Follower</th>
            </tr>
          </thead>
          <tbody>
            {SOCIAL_DATA.map((row) => (
              <tr key={row.type} className="border-b border-gray-50">
                <td className="flex items-center gap-2 py-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-[#302F2E] text-xs font-medium text-white">
                    {row.type.charAt(0)}
                  </span>
                  <span className="font-normal text-[#302F2E]">{row.type}</span>
                </td>
                <td className="py-3">
                  <span className="flex items-center gap-1.5 font-normal text-[#302F2E]">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-gray-500"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    {row.likes}
                  </span>
                </td>
                <td className="py-3 font-normal text-[#302F2E]">{row.follower}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

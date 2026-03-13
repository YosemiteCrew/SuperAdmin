import Link from "next/link";

type SectionHeaderProps = {
  title: string;
  seeAllHref?: string;
  rightElement?: React.ReactNode;
};

export function SectionHeader({
  title,
  seeAllHref = "#",
  rightElement,
}: SectionHeaderProps) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h3 className="text-2xl font-medium text-[#302F2E]">{title}</h3>
      <div className="flex items-center gap-4">
        {rightElement}
        <Link
          href={seeAllHref}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-normal text-[#302F2E] hover:bg-gray-50"
        >
          See All
        </Link>
      </div>
    </div>
  );
}

import { DeveloperDetail } from "@/app/features/developers";

export default async function DeveloperDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DeveloperDetail id={id} />;
}

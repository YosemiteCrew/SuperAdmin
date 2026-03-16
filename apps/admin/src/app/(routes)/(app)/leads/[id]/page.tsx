import { LeadDetail } from "@/app/features/leads";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function LeadDetailPage({ params }: Props) {
  const { id } = await params;
  return <LeadDetail id={id} />;
}

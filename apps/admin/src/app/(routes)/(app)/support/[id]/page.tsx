import { TicketDetail } from "@/app/features/support";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function SupportTicketDetailPage({ params }: Props) {
  const { id } = await params;
  return <TicketDetail id={id} />;
}

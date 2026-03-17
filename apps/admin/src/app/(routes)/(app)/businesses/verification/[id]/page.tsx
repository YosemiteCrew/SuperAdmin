import { VerificationDetail } from "@/app/features/businesses";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function VerificationDetailPage({ params }: Props) {
  const { id } = await params;
  return <VerificationDetail id={id} />;
}

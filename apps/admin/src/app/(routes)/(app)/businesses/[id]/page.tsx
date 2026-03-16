import { BusinessDetail } from "@/app/features/businesses";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function BusinessDetailPage({ params }: Props) {
  const { id } = await params;
  return <BusinessDetail id={id} />;
}

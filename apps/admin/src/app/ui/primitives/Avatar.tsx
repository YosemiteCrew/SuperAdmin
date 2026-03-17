"use client";
import Image from "next/image";

type AvatarSize = 16 | 24 | 32 | 40 | 48 | 56 | 64 | 100;

type Props = {
  name: string;
  size?: AvatarSize;
  src?: string;
  className?: string;
};

const MOCK_PHOTOS = [
  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop&crop=face",
];

function getMockImageUrl(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return MOCK_PHOTOS[Math.abs(hash) % MOCK_PHOTOS.length];
}

export default function Avatar({ name, size = 40, src, className }: Props) {
  const imageUrl = src ?? getMockImageUrl(name);

  return (
    <Image
      src={imageUrl}
      alt={name}
      width={size}
      height={size}
      className={`rounded-full object-cover shrink-0 ${className ?? ""}`}
      style={{ width: size, height: size }}
    />
  );
}

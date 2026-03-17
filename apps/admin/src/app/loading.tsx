import Image from "next/image";

export default function Loading() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-white">
      <Image
        src="/assets/yosemiteLoader.gif"
        alt="Loading"
        width={120}
        height={120}
        unoptimized
      />
    </div>
  );
}

import Image from "next/image";
import { Navbar } from "../navbar/navbar";

type AuthLayoutProps = {
  imageSrc: string;
  imageAlt: string;
  children: React.ReactNode;
};

export function AuthLayout({ imageSrc, imageAlt, children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <div className="flex flex-1">
        <div className="relative hidden w-[45%] lg:block">
          <Image
            src={imageSrc}
            alt={imageAlt}
            fill
            className="object-cover"
            priority
            sizes="45vw"
          />
        </div>
        <div className="flex flex-1 items-center justify-center bg-white px-8 py-12">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </div>
    </div>
  );
}

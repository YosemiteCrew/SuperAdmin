import Link from "next/link";
import { AuthLayout } from "../../components/auth-layout/auth-layout";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";

export default function LoginPage() {
  return (
    <AuthLayout
      imageSrc="/assets/login.png"
      imageAlt="Login"
    >
      <h1 className="mb-8 font-heading">Log In now</h1>
      <div className="space-y-5">
        <Input
          type="email"
          placeholder="admin@yosemitecrew.com"
          defaultValue="admin@yosemitecrew.com"
        />
        <div>
          <Input type="password" placeholder="Password" />
          <div className="mt-2 flex justify-end">
            <Link
              href="#"
              className="text-sm font-normal text-[#302F2E] hover:text-gray-900"
            >
              Forgot Password?
            </Link>
          </div>
        </div>
        <Button href="/scan-qr" icon={
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
            <svg width="14" height="10" viewBox="0 0 14 10" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 5h12M9 1l4 4-4 4" />
            </svg>
          </span>
        } iconPosition="left">
          Log In
        </Button>
      </div>
      <p className="mt-6 text-center text-sm font-normal text-gray-600">
        Don&apos;t have an account?{" "}
        <Link href="#" className="font-normal text-blue-600 hover:underline">
          Sign up.
        </Link>
      </p>
    </AuthLayout>
  );
}

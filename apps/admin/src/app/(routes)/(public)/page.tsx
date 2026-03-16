import { redirect } from "next/navigation";

export default function PublicHome() {
  redirect("/login");
}

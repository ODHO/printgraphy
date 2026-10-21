import { redirect } from "next/navigation";

export default function VendorLoginPage() {
  redirect("/auth/signin?redirect=/vendor/dashboard");
}

import { Suspense } from "react";
import ForgotPasswordClient from "./ForgotPasswordClient";

export const dynamic = "force-dynamic";

export default function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: { email?: string | string[] };
}) {
  const email =
    typeof searchParams?.email === "string"
      ? searchParams.email
      : Array.isArray(searchParams?.email)
      ? searchParams.email[0]
      : "";

  return (
    <Suspense fallback={null}>
      <ForgotPasswordClient initialEmail={email} />
    </Suspense>
  );
}
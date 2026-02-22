import { Suspense } from "react";
import ResetPasswordClient from "./ResetPasswordClient";

export const dynamic = "force-dynamic";

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams: { token?: string | string[] };
}) {
  const token =
    typeof searchParams?.token === "string"
      ? searchParams.token
      : Array.isArray(searchParams?.token)
      ? searchParams.token[0]
      : "";

  return (
    <Suspense fallback={null}>
      <ResetPasswordClient token={token} />
    </Suspense>
  );
}
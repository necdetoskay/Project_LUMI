import { redirect } from "next/navigation";

import { getParentSessionCookie } from "@/lib/auth/http";
import { getParentFromSessionToken } from "@/lib/auth/service";

import "./canonical-dashboard-tuning.module.css";
import CanonicalTestLabDashboard from "./canonical-dashboard";

export default async function TestLabPage() {
  const parent = await getParentFromSessionToken(
    await getParentSessionCookie(),
  );
  if (!parent) redirect("/login");
  return <CanonicalTestLabDashboard />;
}

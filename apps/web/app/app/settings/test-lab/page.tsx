import { redirect } from "next/navigation";

import { loadCanonicalTestLabDashboardData } from "@/lib/ai/test-lab-dashboard-data";
import { getParentSessionCookie } from "@/lib/auth/http";
import { getParentFromSessionToken } from "@/lib/auth/service";

import tuningStyles from "./canonical-dashboard-tuning.module.css";
import CanonicalTestLabDashboard from "./canonical-dashboard";

export default async function TestLabPage() {
  const parent = await getParentFromSessionToken(
    await getParentSessionCookie(),
  );
  if (!parent) redirect("/login");

  const dashboardData = await loadCanonicalTestLabDashboardData(parent.id);

  return (
    <div className={tuningStyles.tuned}>
      <CanonicalTestLabDashboard data={dashboardData} />
    </div>
  );
}

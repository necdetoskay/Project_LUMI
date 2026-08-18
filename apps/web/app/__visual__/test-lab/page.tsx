import { notFound } from "next/navigation";

import CanonicalTestLabDashboard from "../../app/settings/test-lab/canonical-dashboard";

export const dynamic = "force-dynamic";

export default function TestLabVisualPage() {
  if (process.env.LUMI_VISUAL_TEST !== "1") notFound();
  return <CanonicalTestLabDashboard />;
}

import { notFound } from "next/navigation";

import CanonicalTestLabDashboard from "../canonical-dashboard";

export const dynamic = "force-dynamic";

export default function TestLabVisualPage() {
  const visualTestEnabled =
    process.env.LUMI_VISUAL_TEST === "1" ||
    process.env.NEXT_DIST_DIR === ".next-e2e";
  if (!visualTestEnabled) notFound();
  return <CanonicalTestLabDashboard />;
}

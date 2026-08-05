import { redirect } from "next/navigation";

import { StoryReaderClient } from "@/components/story/story-reader-client";
import { getParentSessionCookie } from "@/lib/auth/http";
import { getParentFromSessionToken } from "@/lib/auth/service";

export default async function StoryReaderPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const parent = await getParentFromSessionToken(
    await getParentSessionCookie(),
  );

  if (!parent) {
    redirect("/login");
  }

  const { sessionId } = await params;
  return <StoryReaderClient sessionId={sessionId} />;
}

import { headers } from "next/headers";
import { auth } from "@/auth";
import {
  AuthenticationError,
  type AuthContext,
} from "./auth-context";
import { createRequestId } from "../http/request-id";

export async function getAuthContext(): Promise<AuthContext> {
  const session = await auth();

  if (!session?.user?.id || !session.user.email) {
    throw new AuthenticationError();
  }

  const headerStore = await headers();
  const requestId =
    headerStore.get("x-request-id") ??
    createRequestId();

  return {
    user: {
      id: session.user.id,
      email: session.user.email,
      roles: session.user.roles ?? [],
    },
    requestId,
  };
}

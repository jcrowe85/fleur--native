// src/services/apiClient.ts
import { API_BASE } from "@/config/env";
import { supabase } from "./supabase";

/**
 * Shared client for our own API server.
 *
 * Every route that costs money or touches a user's data requires a Supabase
 * JWT. Getting that token is not simply "read the current session": onboarding
 * runs in the root route group, outside `app/(app)/_layout.tsx`, so
 * `bootstrap()` has not been called yet and there is no session at all when the
 * plan builder is first invoked. Callers therefore have to be able to create the
 * guest account on demand.
 */

/** Returns an access token, bootstrapping a guest session if there isn't one. */
export async function getAccessToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  if (data.session?.access_token) return data.session.access_token;

  const { useAuthStore } = await import("@/state/authStore");
  await useAuthStore.getState().bootstrap();

  const { data: after } = await supabase.auth.getSession();
  if (!after.session?.access_token) {
    throw new Error("Could not sign in. Please check your connection and try again.");
  }
  return after.session.access_token;
}

/** fetch() against the API server with the caller's bearer token attached. */
export async function authedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getAccessToken();

  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  });
}

/** Read `{ error }` off a failed response without throwing on a non-JSON body. */
export async function readApiError(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json();
    if (typeof body?.error === "string") return body.error;
  } catch {
    // Fall through to the generic message.
  }
  return fallback;
}

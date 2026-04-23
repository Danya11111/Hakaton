import { cookies } from "next/headers";
import { ADMIN_USER_COOKIE } from "@/lib/admin-auth-constants";

export async function getActorUsername(): Promise<string> {
  return (await cookies()).get(ADMIN_USER_COOKIE)?.value ?? "unknown";
}

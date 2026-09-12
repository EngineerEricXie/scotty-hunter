export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { getEventRepository } = await import("@/lib/db");
  await getEventRepository().listEvents({}).catch(() => undefined);
}

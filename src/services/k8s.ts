import { SubscriptionPlan, db, k8sClusterConfigs } from "@/db";
import { and, eq } from "drizzle-orm";

export async function getClusters(userId: string) {
  return db
    .select()
    .from(k8sClusterConfigs)
    .where(eq(k8sClusterConfigs.authUserId, userId));
}

export async function createCluster(userId: string, params: { name: string; location: string }) {
  const [created] = await db
    .insert(k8sClusterConfigs)
    .values({
      name: params.name,
      location: params.location,
      network: "Default",
      plan: SubscriptionPlan.FREE,
      authUserId: userId,
    })
    .returning({ id: k8sClusterConfigs.id });

  return created ?? null;
}

export async function updateCluster(
  userId: string,
  params: { id: number; name?: string; location?: string }
) {
  const [cluster] = await db
    .select()
    .from(k8sClusterConfigs)
    .where(eq(k8sClusterConfigs.id, params.id))
    .limit(1);

  if (!cluster) {
    return { success: false, reason: "NOT_FOUND" } as const;
  }

  if (cluster.authUserId && cluster.authUserId !== userId) {
    return { success: false, reason: "FORBIDDEN" } as const;
  }

  const updates: Record<string, string> = {};
  if (params.name) updates.name = params.name;
  if (params.location) updates.location = params.location;

  if (Object.keys(updates).length > 0) {
    await db
      .update(k8sClusterConfigs)
      .set(updates)
      .where(and(eq(k8sClusterConfigs.id, params.id)));
  }

  return { success: true } as const;
}

export async function deleteCluster(userId: string, id: number) {
  const [cluster] = await db
    .select()
    .from(k8sClusterConfigs)
    .where(eq(k8sClusterConfigs.id, id))
    .limit(1);

  if (!cluster) {
    return { success: false, reason: "NOT_FOUND" } as const;
  }

  if (cluster.authUserId && cluster.authUserId !== userId) {
    return { success: false, reason: "FORBIDDEN" } as const;
  }

  await db
    .delete(k8sClusterConfigs)
    .where(eq(k8sClusterConfigs.id, id));

  return { success: true } as const;
}

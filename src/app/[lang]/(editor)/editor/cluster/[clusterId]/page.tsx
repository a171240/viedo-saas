import { notFound, redirect } from "next/navigation";

import { getCurrentUser, type User } from "@/lib/auth";
import { db, k8sClusterConfigs } from "@/db";
import { and, eq } from "drizzle-orm";

import { ClusterConfig } from "@/components/k8s/cluster-config";
import type { Cluster } from "@/types/k8s";

async function getClusterForUser(clusterId: Cluster["id"], userId: User["id"]) {
  const [cluster] = await db
    .select()
    .from(k8sClusterConfigs)
    .where(
      and(
        eq(k8sClusterConfigs.id, Number(clusterId)),
        eq(k8sClusterConfigs.authUserId, userId)
      )
    )
    .limit(1);
  return cluster ?? null;
}

interface EditorClusterProps {
  params: Promise<{
    clusterId: number;
    lang: string;
  }>;
}

export default async function EditorClusterPage({
  params,
}: EditorClusterProps) {
  const resolvedParams = await params;
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const cluster = await getClusterForUser(resolvedParams.clusterId, user.id);

  if (!cluster) {
    notFound();
  }
  return (
    <ClusterConfig
      cluster={{
        id: cluster.id,
        name: cluster.name,
        location: cluster.location,
      }}
      params={{ lang: resolvedParams.lang }}
    />
  );
}

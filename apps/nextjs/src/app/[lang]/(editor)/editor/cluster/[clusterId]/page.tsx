import { notFound, redirect } from "next/navigation";

import { getCurrentUser, type User } from "@videofly/auth";
import { db } from "@videofly/db";

import { ClusterConfig } from "~/components/k8s/cluster-config";
import type { Cluster } from "~/types/k8s";

async function getClusterForUser(clusterId: Cluster["id"], userId: User["id"]) {
  return await db
    .selectFrom("K8sClusterConfig")
    .selectAll()
    .where("id", "=", Number(clusterId))
    .where("authUserId", "=", userId)
    .executeTakeFirst();
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

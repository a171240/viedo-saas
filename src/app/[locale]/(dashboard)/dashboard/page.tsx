import React from "react";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import {
  Table,
  TableCaption,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { EmptyPlaceholder } from "@/components/empty-placeholder";
import { DashboardHeader } from "@/components/header";
import { K8sCreateButton } from "@/components/k8s/cluster-create-button";
import { ClusterItem } from "@/components/k8s/cluster-item";
import { DashboardShell } from "@/components/shell";
import type { Locale } from "@/config/i18n-config";
import { getDictionary } from "@/lib/get-dictionary";
import { ensureCustomer } from "@/services/customer";
import { getClusters } from "@/services/k8s";
import type { ClustersArray } from "@/types/k8s";

export const metadata = {
  title: "Dashboard",
};

// export type ClusterType = RouterOutputs["k8s"]["getClusters"][number];
export default async function DashboardPage({
  params,
}: {
  params: Promise<{
    locale: Locale;
  }>;
}) {
  const { locale } = await params;
  //don't need to check auth here, because we have a global auth check in _app.tsx
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/${locale}/signin`);
  }
  await ensureCustomer(user.id);
  const clusters = (await getClusters(user.id)) as ClustersArray;
  if (clusters) {
    const dict = await getDictionary(locale);
    return (
      <DashboardShell>
        <DashboardHeader
          heading="kubernetes"
          text={dict.common.dashboard.title_text}
        >
          <K8sCreateButton dict={dict.business} />
        </DashboardHeader>
        <div>
          {clusters.length ? (
            <div className="divide-y divide-border rounded-md border">
              <div className="flex items-center justify-between p-4">
                <Table className="divide-y divide-gray-200">
                  <TableCaption>A list of your k8s cluster .</TableCaption>
                  <TableHeader>
                    <TableRow className="hover:bg-gray-50">
                      <TableHead className="w-[100px]">Name</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>UpdatedAt</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>ACTION</TableHead>
                    </TableRow>
                  </TableHeader>
                  {clusters.map((cluster) => (
                    <ClusterItem
                      key={String(cluster.id)}
                      cluster={cluster}
                    />
                  ))}
                </Table>
              </div>
            </div>
          ) : (
            <EmptyPlaceholder>
              {/*<EmptyPlaceholder.Icon />*/}
              <EmptyPlaceholder.Title>
                {dict.business.k8s.no_cluster_title}
              </EmptyPlaceholder.Title>
              <EmptyPlaceholder.Description>
                {dict.business.k8s.no_cluster_content}
              </EmptyPlaceholder.Description>
              <K8sCreateButton variant="outline" dict={dict.business} />
            </EmptyPlaceholder>
          )}
        </div>
      </DashboardShell>
    );
  }
}

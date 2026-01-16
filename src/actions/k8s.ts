"use server";

import { z } from "zod";

import { userActionClient } from "@/lib/safe-action";
import { createCluster, deleteCluster, getClusters, updateCluster } from "@/services/k8s";

export const getClustersAction = userActionClient
  .schema(z.object({}))
  .action(async ({ ctx }) => {
    const clusters = await getClusters(ctx.user.id);
    return { success: true, clusters };
  });

export const createClusterAction = userActionClient
  .schema(z.object({ name: z.string().min(1), location: z.string().min(1) }))
  .action(async ({ parsedInput, ctx }) => {
    const created = await createCluster(ctx.user.id, parsedInput);
    if (!created) {
      return { success: false, reason: "CREATE_FAILED" };
    }
    return { success: true, id: created.id };
  });

export const updateClusterAction = userActionClient
  .schema(
    z.object({
      id: z.number(),
      name: z.string().optional(),
      location: z.string().optional(),
    })
  )
  .action(async ({ parsedInput, ctx }) => {
    return updateCluster(ctx.user.id, parsedInput);
  });

export const deleteClusterAction = userActionClient
  .schema(z.object({ id: z.number() }))
  .action(async ({ parsedInput, ctx }) => {
    return deleteCluster(ctx.user.id, parsedInput.id);
  });

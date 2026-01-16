// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
"use client";

import * as React from "react";
//navigate to new page
import { useRouter } from "next/navigation";

import { cn } from "@/components/ui";
//button self design
import { buttonVariants, type ButtonProps } from "@/components/ui/button";
import * as Icons from "@/components/ui/icons";
import { toast } from "sonner";

import { useAction } from "next-safe-action/hooks";
import { createClusterAction } from "@/actions/k8s";

interface K8sCreateButtonProps extends ButtonProps {
  customProp?: string;
  dict: Record<string, unknown>;
}

export function K8sCreateButton({
  className,
  variant,
  dict,
  ...props
}: K8sCreateButtonProps) {
  const router = useRouter();
  const { executeAsync, status } = useAction(createClusterAction);
  const isLoading = status === "executing";

  async function onClick() {
    const res = await executeAsync({
      name: "Default Cluster",
      location: "Hong Kong",
    });

    if (!res?.data?.success) {
      // if (response.status === 402) {
      //   return toast({
      //     title: "Limit of 1 cluster reached.",
      //     description: "Please upgrade to the PROD plan.",
      //     variant: "destructive",
      //   });
      // }
      return toast.error("Something went wrong.", {
        description: "Your cluster was not created. Please try again.",
      });
    }
    if (res?.data?.success) {
      const cluster = res.data;

      // This forces a cache invalidation.
      router.refresh();

      if (cluster?.id) {
        router.push(`/editor/cluster/${cluster.id}`);
      }
    } else {
      // console.log("error ");
    }
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        buttonVariants({ variant }),
        {
          "cursor-not-allowed opacity-60": isLoading,
        },
        className,
      )}
      disabled={isLoading}
      {...props}
    >
      {isLoading ? (
        <Icons.Spinner className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Icons.Add className="mr-2 h-4 w-4" />
      )}
      {dict.k8s?.new_cluster}
    </button>
  );
}

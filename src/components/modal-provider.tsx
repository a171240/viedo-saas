"use client";

import { SignInModal } from "@/components/sign-in-modal";
import { useMounted } from "@/hooks/use-mounted";

export const ModalProvider = ({
  dict,
  locale,
  children,
}: {
  dict: Record<string, unknown>;
  locale: string;
  children: React.ReactNode;
}) => {
  const mounted = useMounted();

  return (
    <>
      {/* 始终渲染 children，不管是否 mounted */}
      {children}
      {/* 只在客户端挂载后渲染 modal */}
      {mounted && <SignInModal lang={locale} dict={dict as Record<string, string>} />}
    </>
  );
};

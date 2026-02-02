"use client";

import { SignInModalContent } from "@/components/sign-in-modal";
import { useSigninModal } from "@/hooks/use-signin-modal";
import { useMounted } from "@/hooks/use-mounted";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

export const ModalProvider = ({
  locale,
  children,
}: {
  locale: string;
  children: React.ReactNode;
}) => {
  const mounted = useMounted();
  const signInModal = useSigninModal();
  const t = useTranslations("SignInModal");

  return (
    <>
      {children}
      {mounted && (
        <Dialog open={signInModal.isOpen} onOpenChange={(open) => {
          if (open) {
            signInModal.onOpen();
          } else {
            signInModal.onClose();
          }
        }}>
          <DialogContent className="p-0 gap-0 max-w-md">
            {/* Hidden title for accessibility */}
            <DialogTitle className="sr-only">
              {t("signin_title")}
            </DialogTitle>
            <SignInModalContent lang={locale} />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

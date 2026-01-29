"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { authClient } from "@/lib/auth/client";
import { cn } from "@/components/ui";
import { buttonVariants } from "@/components/ui/button";
import * as Icons from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface UserAuthFormProps extends React.HTMLAttributes<HTMLDivElement> {
  lang: string;
  disabled?: boolean;
}

export function UserAuthForm({
  className,
  lang,
  disabled,
  ...props
}: UserAuthFormProps) {
  const t = useTranslations("Auth");
  const userAuthSchema = React.useMemo(
    () =>
      z.object({
        email: z.string().email(t("form.invalidEmail")),
      }),
    [t]
  );
  type FormData = z.infer<typeof userAuthSchema>;
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(userAuthSchema),
  });
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [isGoogleLoading, setIsGoogleLoading] = React.useState<boolean>(false);
  const searchParams = useSearchParams();

  async function onSubmit(data: FormData) {
    setIsLoading(true);

    try {
      await authClient.signIn.magicLink({
        email: data.email.toLowerCase(),
        callbackURL: searchParams?.get("from") ?? `/${lang}/my-creations`,
      });

      toast.success(t("form.magicLinkSentTitle"), {
        description: t("form.magicLinkSentDescription"),
      });
    } catch (error) {
      console.error("Error during sign in:", error);
      toast.error(t("form.errorTitle"), {
        description: t("form.errorDescription"),
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className={cn("grid gap-6", className)} {...props}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-2">
          <div className="grid gap-1">
            <Label className="sr-only" htmlFor="email">
              {t("form.emailLabel")}
            </Label>
            <Input
              id="email"
              placeholder={t("form.emailPlaceholder")}
              type="email"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect="off"
              disabled={isLoading || isGoogleLoading || disabled}
              {...register("email")}
            />
            {errors?.email && (
              <p className="px-1 text-xs text-red-600">
                {errors.email.message}
              </p>
            )}
          </div>
          <button
            type="submit"
            className={cn(buttonVariants())}
            disabled={isLoading}
          >
            {isLoading && (
              <Icons.Spinner className="mr-2 h-4 w-4 animate-spin" />
            )}
            {t("form.submit")}
          </button>
        </div>
      </form>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            {t("form.orContinueWith")}
          </span>
        </div>
      </div>
      <button
        type="button"
        className={cn(buttonVariants({ variant: "outline" }))}
        onClick={() => {
          setIsGoogleLoading(true);
          authClient.signIn
            .social({
              provider: "google",
              callbackURL: searchParams?.get("from") ?? `/${lang}/my-creations`,
            })
            .catch((error) => {
              console.error("Google signIn error:", error);
              setIsGoogleLoading(false);
            });
        }}
        disabled={isLoading || isGoogleLoading}
      >
        {isGoogleLoading ? (
          <Icons.Spinner className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Icons.Google className="mr-2 h-4 w-4" />
        )}{" "}
        {t("form.continueGoogle")}
      </button>
    </div>
  );
}


"use client";

import { TweetProps, useTweet } from "react-tweet";
import { useTranslations } from "next-intl";

import {
  MagicTweet,
  TweetNotFound,
  TweetSkeleton,
  type TweetLabels,
} from "@/components/magicui/twitter-card";

export const ClientTweetCard = ({
  id,
  apiUrl,
  fallback = <TweetSkeleton />,
  components,
  fetchOptions,
  onError,
  ...props
}: TweetProps & { className?: string }) => {
  const t = useTranslations("TwitterCard");
  const labels: TweetLabels = {
    verifiedAccount: t("verifiedAccount"),
    tweetNotFound: t("tweetNotFound"),
    linkToTweet: t("linkToTweet"),
    browserUnsupported: t("browserUnsupported"),
    profilePictureOf: t("profilePictureOf", { name: "{name}" }),
    photoBy: t("photoBy", { name: "{name}" }),
  };
  const { data, error, isLoading } = useTweet(id, apiUrl, fetchOptions);

  if (isLoading) return fallback;
  if (error || !data) {
    const NotFound = components?.TweetNotFound || TweetNotFound;
    return <NotFound labels={labels} error={onError ? onError(error) : error} />;
  }

  return <MagicTweet tweet={data} components={components} labels={labels} {...props} />;
};

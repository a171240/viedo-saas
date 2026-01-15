export const SubscriptionPlan = {
  FREE: "FREE",
  PRO: "PRO",
  BUSINESS: "BUSINESS",
} as const;
export type SubscriptionPlan =
  (typeof SubscriptionPlan)[keyof typeof SubscriptionPlan];
export const Status = {
  PENDING: "PENDING",
  CREATING: "CREATING",
  INITING: "INITING",
  RUNNING: "RUNNING",
  STOPPED: "STOPPED",
  DELETED: "DELETED",
} as const;
export type Status = (typeof Status)[keyof typeof Status];
export const CreditTransType = {
  NEW_USER: "NEW_USER",
  ORDER_PAY: "ORDER_PAY",
  SUBSCRIPTION: "SUBSCRIPTION",
  VIDEO_CONSUME: "VIDEO_CONSUME",
  REFUND: "REFUND",
  EXPIRED: "EXPIRED",
  SYSTEM_ADJUST: "SYSTEM_ADJUST",
} as const;
export type CreditTransType =
  (typeof CreditTransType)[keyof typeof CreditTransType];
export const CreditPackageStatus = {
  ACTIVE: "ACTIVE",
  DEPLETED: "DEPLETED",
  EXPIRED: "EXPIRED",
} as const;
export type CreditPackageStatus =
  (typeof CreditPackageStatus)[keyof typeof CreditPackageStatus];
export const VideoStatus = {
  PENDING: "PENDING",
  GENERATING: "GENERATING",
  UPLOADING: "UPLOADING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
} as const;
export type VideoStatus = (typeof VideoStatus)[keyof typeof VideoStatus];

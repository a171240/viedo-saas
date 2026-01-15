import type { ColumnType } from "kysely";
export type Generated<T> =
  T extends ColumnType<infer S, infer I, infer U>
    ? ColumnType<S, I | undefined, U>
    : ColumnType<T, T | undefined, T>;
export type Timestamp = ColumnType<Date, Date | string, Date | string>;

import type {
  SubscriptionPlan,
  Status,
  CreditTransType,
  CreditPackageStatus,
  VideoStatus,
} from "./enums";

export type Account = {
  id: Generated<string>;
  userId: string;
  type: string;
  provider: string;
  providerAccountId: string;
  refresh_token: string | null;
  access_token: string | null;
  expires_at: number | null;
  token_type: string | null;
  scope: string | null;
  id_token: string | null;
  session_state: string | null;
};
export type BetterAuthAccount = {
  id: Generated<string>;
  userId: string;
  accountId: string;
  providerId: string;
  accessToken: string | null;
  refreshToken: string | null;
  accessTokenExpiresAt: Timestamp | null;
  refreshTokenExpiresAt: Timestamp | null;
  scope: string | null;
  idToken: string | null;
  password: string | null;
  createdAt: Generated<Timestamp>;
  updatedAt: Generated<Timestamp>;
};
export type BetterAuthSession = {
  id: Generated<string>;
  userId: string;
  token: string;
  expiresAt: Timestamp;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Generated<Timestamp>;
  updatedAt: Generated<Timestamp>;
};
export type BetterAuthUser = {
  id: Generated<string>;
  name: string | null;
  email: string;
  emailVerified: Generated<boolean>;
  image: string | null;
  createdAt: Generated<Timestamp>;
  updatedAt: Generated<Timestamp>;
  isAdmin: Generated<boolean>;
};
export type CreemSubscription = {
  id: Generated<string>;
  user_id: string;
  product_id: string;
  subscription_id: string;
  status: string;
  current_period_end: Timestamp | null;
  created_at: Generated<Timestamp>;
  updated_at: Timestamp;
};
export type BetterAuthVerification = {
  id: Generated<string>;
  identifier: string;
  value: string;
  expiresAt: Timestamp;
  createdAt: Generated<Timestamp>;
  updatedAt: Generated<Timestamp>;
};
export type CreditHold = {
  id: Generated<number>;
  user_id: string;
  video_uuid: string;
  credits: number;
  status: Generated<string>;
  package_allocation: unknown;
  package_id: number | null;
  created_at: Generated<Timestamp>;
  settled_at: Timestamp | null;
};
export type CreditPackage = {
  id: Generated<number>;
  user_id: string;
  initial_credits: number;
  remaining_credits: number;
  frozen_credits: Generated<number>;
  trans_type: CreditTransType;
  order_no: string | null;
  status: Generated<CreditPackageStatus>;
  expired_at: Timestamp | null;
  created_at: Generated<Timestamp>;
  updated_at: Timestamp;
};
export type CreditTransaction = {
  id: Generated<number>;
  trans_no: string;
  user_id: string;
  trans_type: CreditTransType;
  credits: number;
  balance_after: number;
  package_id: number | null;
  video_uuid: string | null;
  order_no: string | null;
  hold_id: number | null;
  remark: string | null;
  created_at: Generated<Timestamp>;
};
export type Customer = {
  id: Generated<number>;
  authUserId: string;
  name: string | null;
  plan: SubscriptionPlan | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
  stripeCurrentPeriodEnd: Timestamp | null;
  createdAt: Generated<Timestamp>;
  updatedAt: Generated<Timestamp>;
};
export type K8sClusterConfig = {
  id: Generated<number>;
  name: string;
  location: string;
  authUserId: string;
  plan: Generated<SubscriptionPlan | null>;
  network: string | null;
  createdAt: Generated<Timestamp>;
  updatedAt: Generated<Timestamp>;
  status: Generated<Status | null>;
  delete: Generated<boolean | null>;
};
export type Session = {
  id: Generated<string>;
  sessionToken: string;
  userId: string;
  expires: Timestamp;
};
export type User = {
  id: Generated<string>;
  name: string | null;
  email: string | null;
  emailVerified: Timestamp | null;
  image: string | null;
};
export type VerificationToken = {
  identifier: string;
  token: string;
  expires: Timestamp;
};
export type Video = {
  id: Generated<number>;
  uuid: string;
  user_id: string;
  prompt: string;
  model: string;
  parameters: unknown | null;
  status: Generated<VideoStatus>;
  provider: string | null;
  external_task_id: string | null;
  error_message: string | null;
  start_image_url: string | null;
  original_video_url: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  duration: number | null;
  resolution: string | null;
  aspect_ratio: string | null;
  file_size: number | null;
  credits_used: Generated<number>;
  created_at: Generated<Timestamp>;
  updated_at: Timestamp;
  completed_at: Timestamp | null;
  generation_time: number | null;
  is_deleted: Generated<boolean>;
};
export type DB = {
  account: BetterAuthAccount;
  Account: Account;
  creem_subscriptions: CreemSubscription;
  credit_holds: CreditHold;
  credit_packages: CreditPackage;
  credit_transactions: CreditTransaction;
  Customer: Customer;
  K8sClusterConfig: K8sClusterConfig;
  session: BetterAuthSession;
  Session: Session;
  user: BetterAuthUser;
  User: User;
  verification: BetterAuthVerification;
  VerificationToken: VerificationToken;
  videos: Video;
};

import { NextRequest } from "next/server";

import { creditService, type CreditTransType } from "@/services/credit";

import { requireAuth } from "@/lib/api/auth";
import { apiSuccess, handleApiError } from "@/lib/api/response";

// Map database enum values to frontend expected format
const transTypeMapping: Record<CreditTransType, string> = {
  NEW_USER: "new_user",
  ORDER_PAY: "order_pay",
  SUBSCRIPTION: "subscription",
  VIDEO_CONSUME: "video_generate",
  REFUND: "video_refund",
  EXPIRED: "expired",
  SYSTEM_ADJUST: "admin_adjust",
};

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const { searchParams } = new URL(request.url);

    const result = await creditService.getHistory(user.id, {
      limit: Number.parseInt(searchParams.get("limit") || "20"),
      offset: Number.parseInt(searchParams.get("offset") || "0"),
      transType: searchParams.get("type") as CreditTransType | undefined,
    });

    // Transform transType to frontend-expected format
    const transformedRecords = result.records.map((record) => ({
      ...record,
      transType: transTypeMapping[record.transType] ?? record.transType.toLowerCase(),
    }));

    return apiSuccess({ records: transformedRecords, total: result.total });
  } catch (error) {
    return handleApiError(error);
  }
}

import { NextRequest } from "next/server";

import { creditService, type CreditTransType } from "@/services/credit";

import { requireAuth } from "@/lib/api/auth";
import { apiSuccess, handleApiError } from "@/lib/api/response";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const { searchParams } = new URL(request.url);

    const result = await creditService.getHistory(user.id, {
      limit: Number.parseInt(searchParams.get("limit") || "20"),
      offset: Number.parseInt(searchParams.get("offset") || "0"),
      transType: searchParams.get("type") as CreditTransType | undefined,
    });

    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * API: 检查并自动设置管理员状态
 *
 * GET /api/auth/check-admin
 *
 * 用户登录后调用此端点，如果用户邮箱匹配 .env.local 中的 ADMIN_EMAIL，
 * 系统会自动将其设置为管理员（isAdmin = true）
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { autoSetAdmin } from "@/middleware/auto-set-admin";

export async function GET(request: NextRequest) {
  return autoSetAdmin(request);
}

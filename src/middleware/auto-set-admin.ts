/**
 * ============================================
 * 管理员自动设置中间件
 * ============================================
 *
 * 当用户使用 ADMIN_EMAIL 配置的邮箱登录时，
 * 自动将其设置为管理员（isAdmin = true）
 *
 * 使用方法：
 * 1. 在 .env.local 中配置 ADMIN_EMAIL="your-email@example.com"
 * 2. 用该邮箱登录
 * 3. 系统自动设置管理员权限
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { env } from "@/lib/auth/env.mjs";

/**
 * 中间件：自动将 ADMIN_EMAIL 设置为管理员
 *
 * 在需要管理员权限的页面调用此中间件
 */
export async function autoSetAdmin(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const adminEmail = env.ADMIN_EMAIL;
  if (!adminEmail) {
    // 未配置管理员邮箱，跳过
    return NextResponse.json({ isAdmin: session.user.isAdmin });
  }

  const userEmail = session.user.email;

  // 检查是否是配置的管理员邮箱
  if (userEmail.toLowerCase() === adminEmail.toLowerCase()) {
    // 检查用户是否已经是管理员
    if (!session.user.isAdmin) {
      // 设置为管理员
      await db
        .update(users)
        .set({ isAdmin: true })
        .where(eq(users.id, session.user.id));

      console.log(`✅ Auto-set admin for: ${userEmail}`);

      return NextResponse.json({ isAdmin: true, justSet: true });
    }

    return NextResponse.json({ isAdmin: true, alreadyAdmin: true });
  }

  return NextResponse.json({ isAdmin: false });
}

/**
 * API 路由：检查并设置管理员状态
 *
 * GET /api/auth/check-admin
 *
 * 用户登录后调用此端点，系统会自动检查并设置管理员权限
 */
export async function GET(request: NextRequest) {
  return autoSetAdmin(request);
}

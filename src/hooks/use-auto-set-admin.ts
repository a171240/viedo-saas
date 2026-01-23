import { useEffect } from "react";

/**
 * Hook: 自动检查并设置管理员权限
 *
 * 使用方法：
 * 1. 在 .env.local 中配置 ADMIN_EMAIL="your-email@example.com"
 * 2. 用户登录后，在布局或页面中调用此 hook
 *
 * @example
 * ```tsx
 * import { useAutoSetAdmin } from "@/hooks/use-auto-set-admin";
 *
 * function Dashboard() {
 *   useAutoSetAdmin(); // 自动检查并设置管理员
 *   // ...
 * }
 * ```
 */
export function useAutoSetAdmin() {
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const res = await fetch("/api/auth/check-admin");
        if (res.ok) {
          const data = await res.json();
          if (data.justSet) {
            console.log("✅ Admin permissions granted");
            // 可以刷新页面或更新状态
            window.location.reload();
          }
        }
      } catch (error) {
        console.error("Failed to check admin status:", error);
      }
    };

    checkAdmin();
  }, []);
}

/**
 * 手动检查并设置管理员权限
 *
 * @example
 * ```tsx
 * import { checkAndSetAdmin } from "@/hooks/use-auto-set-admin";
 *
 * // 用户登录后调用
 * await checkAndSetAdmin();
 * ```
 */
export async function checkAndSetAdmin(): Promise<boolean> {
  try {
    const res = await fetch("/api/auth/check-admin");
    if (res.ok) {
      const data = await res.json();
      return data.isAdmin || false;
    }
  } catch (error) {
    console.error("Failed to check admin status:", error);
  }
  return false;
}

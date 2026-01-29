import { db } from "@/db";
import { users, creditPackages, videos } from "@/db/schema";
import { eq, count, sql, desc } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Shield,
} from "@/components/ui/icons";
import { getTranslations } from "next-intl/server";

interface UsersPageProps {
  params: Promise<{
    locale: string;
  }>;
  searchParams: Promise<{
    page?: string;
    search?: string;
  }>;
}

export default async function UsersPage({ params, searchParams }: UsersPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Admin" });

  const paramsResolved = await searchParams;
  const page = Math.max(1, Number(paramsResolved.page) || 1);
  const search = paramsResolved.search || "";
  const limit = 20;
  const offset = (page - 1) * limit;

  const totalUsersResult = search
    ? await db
        .select({ count: count() })
        .from(users)
        .where(sql`${users.email} ILIKE ${`%${search}%`} OR ${users.name} ILIKE ${`%${search}%`}`)
    : await db.select({ count: count() }).from(users);
  const totalUsers = totalUsersResult[0]?.count || 0;
  const totalPages = Math.ceil(totalUsers / limit);

  const usersList = search
    ? await db
        .select()
        .from(users)
        .where(sql`${users.email} ILIKE ${`%${search}%`} OR ${users.name} ILIKE ${`%${search}%`}`)
        .orderBy(desc(users.createdAt))
        .limit(limit)
        .offset(offset)
    : await db
        .select()
        .from(users)
        .orderBy(desc(users.createdAt))
        .limit(limit)
        .offset(offset);

  const usersWithStats = await Promise.all(
    usersList.map(async (user) => {
      const [videoCountResult, creditPackagesResult] = await Promise.all([
        db.select({ count: count() }).from(videos).where(eq(videos.userId, user.id)),
        db
          .select({ count: count(), sum: sql<number>`COALESCE(SUM(${creditPackages.remainingCredits}), 0)` })
          .from(creditPackages)
          .where(eq(creditPackages.userId, user.id)),
      ]);

      const videoCount = videoCountResult[0]?.count || 0;
      const packageCount = creditPackagesResult[0]?.count || 0;
      const totalCredits = Number(creditPackagesResult[0]?.sum || 0);

      return {
        ...user,
        videoCount,
        packageCount,
        totalCredits,
      };
    })
  );

  const dateLocale = locale === "zh" ? "zh-CN" : "en-US";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("users.title")}</h1>
          <p className="text-muted-foreground">
            {t("users.subtitle", { count: totalUsers })}
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                name="search"
                placeholder={t("users.searchPlaceholder")}
                defaultValue={search}
                className="pl-10"
              />
            </div>
            <Button type="submit">{t("users.searchButton")}</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("users.table.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("users.table.user")}</TableHead>
                  <TableHead>{t("users.table.email")}</TableHead>
                  <TableHead>{t("users.table.videos")}</TableHead>
                  <TableHead>{t("users.table.packages")}</TableHead>
                  <TableHead>{t("users.table.credits")}</TableHead>
                  <TableHead>{t("users.table.status")}</TableHead>
                  <TableHead>{t("users.table.createdAt")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersWithStats.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      {t("users.empty")}
                    </TableCell>
                  </TableRow>
                ) : (
                  usersWithStats.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          {user.image ? (
                            <img
                              src={user.image}
                              alt={user.name || t("users.userAlt")}
                              className="h-8 w-8 rounded-full"
                            />
                          ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                              <span className="text-xs">
                                {(user.name || user.email || "?").charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <span className="max-w-[200px] truncate">
                            {user.name || t("users.unsetName")}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground">
                        {user.email}
                      </TableCell>
                      <TableCell>{user.videoCount}</TableCell>
                      <TableCell>{user.packageCount}</TableCell>
                      <TableCell>
                        <span className="font-medium">{user.totalCredits}</span>
                      </TableCell>
                      <TableCell>
                        {user.isAdmin ? (
                          <Badge variant="default" className="gap-1">
                            <Shield className="h-3 w-3" />
                            {t("users.status.admin")}
                          </Badge>
                        ) : (
                          <Badge variant="outline">{t("users.status.user")}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString(dateLocale)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                {t("users.pagination", { current: page, total: totalPages })}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  asChild={page > 1}
                  disabled={page <= 1}
                >
                  <a
                    href={`?page=${page - 1}${search ? `&search=${encodeURIComponent(search)}` : ""}`}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    {t("users.prev")}
                  </a>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                >
                  <a
                    href={`?page=${page + 1}${search ? `&search=${encodeURIComponent(search)}` : ""}`}
                  >
                    {t("users.next")}
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </a>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

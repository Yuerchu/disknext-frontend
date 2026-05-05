import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { FileIcon, Users, Share2, Database } from "lucide-react";
import { admin, resolveErrorMessage } from "@/api";
import type { AdminSummaryResponse } from "@/api";

export default function AdminHomePage() {
  const { t } = useTranslation();
  const [data, setData] = useState<AdminSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await admin.summary();
        setData(res);
      } catch (e) {
        toast.error(resolveErrorMessage(e));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const chartConfig: ChartConfig = {
    files: { label: t("adminHome.files"), color: "oklch(0.6 0.18 250)" },
    users: { label: t("adminHome.users"), color: "oklch(0.6 0.18 150)" },
    shares: { label: t("adminHome.shares"), color: "oklch(0.6 0.18 30)" },
  };

  const chartData = data?.metrics_summary.dates.map((date, i) => ({
    date,
    files: data.metrics_summary.files[i],
    users: data.metrics_summary.users[i],
    shares: data.metrics_summary.shares[i],
  })) ?? [];

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getDate().toString().padStart(2, "0")}`;
  };

  const formatDateTime = (iso: string) =>
    new Date(iso).toLocaleString(undefined, {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });

  const isLicenseExpired = data ? new Date(data.license.expired_at) < new Date() : false;

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-72" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const stats = [
    { label: t("adminHome.totalFiles"), value: data.metrics_summary.file_total, icon: FileIcon },
    { label: t("adminHome.totalUsers"), value: data.metrics_summary.user_total, icon: Users },
    { label: t("adminHome.totalShares"), value: data.metrics_summary.share_total, icon: Share2 },
    { label: t("adminHome.totalEntities"), value: data.metrics_summary.entities_total, icon: Database },
  ];

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">{t("adminHome.title")}</h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardDescription className="text-sm font-medium">{stat.label}</CardDescription>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value.toLocaleString()}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Trend Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("adminHome.trendChart")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-64 w-full">
              <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                />
                <YAxis tickLine={false} axisLine={false} fontSize={12} width={40} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Area
                  type="monotone"
                  dataKey="files"
                  stroke="var(--color-files)"
                  fill="var(--color-files)"
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="users"
                  stroke="var(--color-users)"
                  fill="var(--color-users)"
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="shares"
                  stroke="var(--color-shares)"
                  fill="var(--color-shares)"
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* Info Cards */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* License Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {t("adminHome.license")}
              <Badge variant={isLicenseExpired ? "destructive" : "secondary"}>
                {isLicenseExpired ? t("adminHome.expired") : t("adminHome.valid")}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("adminHome.expiredAt")}</span>
              <span>{formatDateTime(data.license.expired_at)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("adminHome.signedAt")}</span>
              <span>{formatDateTime(data.license.signed_at)}</span>
            </div>
            {data.license.root_domains.length > 0 && (
              <div>
                <span className="text-muted-foreground">{t("adminHome.rootDomains")}</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {data.license.root_domains.map((d) => (
                    <Badge key={d} variant="outline">{d}</Badge>
                  ))}
                </div>
              </div>
            )}
            {data.license.domains.length > 0 && (
              <div>
                <span className="text-muted-foreground">{t("adminHome.domains")}</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {data.license.domains.map((d) => (
                    <Badge key={d} variant="outline">{d}</Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Version Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {t("adminHome.version")}
              <Badge variant={data.version.pro ? "default" : "secondary"}>
                {data.version.pro ? t("adminHome.pro") : t("adminHome.community")}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("adminHome.version")}</span>
              <span className="font-mono">{data.version.version}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("adminHome.commit")}</span>
              <span className="font-mono text-xs">{data.version.commit}</span>
            </div>
            {data.site_urls.length > 0 && (
              <div>
                <span className="text-muted-foreground">{t("adminHome.siteUrls")}</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {data.site_urls.map((url) => (
                    <Badge key={url} variant="outline">{url}</Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <p className="text-xs text-muted-foreground">
        {t("adminHome.generatedAt", { time: formatDateTime(data.metrics_summary.generated_at) })}
      </p>
    </div>
  );
}

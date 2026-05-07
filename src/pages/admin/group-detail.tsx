import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import {
  Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious,
} from "@/components/ui/pagination";
import { Loader2, Save, Users, Plus } from "lucide-react";
import { adminGroup } from "@/api";
import type { AdminGroupCreateRequest, AdminGroupUpdateRequest } from "@/api";
import { ScopePicker } from "@/components/admin/scope-picker";
import { cn } from "@/lib/utils";

const MEMBERS_PAGE_SIZE = 20;

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function AdminGroupDetailPage() {
  const { t } = useTranslation();
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const isCreate = groupId === "new";

  const groupQuery = useQuery({
    queryKey: queryKeys.adminGroup(groupId!),
    queryFn: () => adminGroup.get(groupId!),
    enabled: !!groupId && !isCreate,
  });

  // Form state
  const [formName, setFormName] = useState("");
  const [formMaxStorage, setFormMaxStorage] = useState("0");
  const [formSpeedLimit, setFormSpeedLimit] = useState("0");
  const [formAdmin, setFormAdmin] = useState(false);
  const [formScopes, setFormScopes] = useState<string[]>([]);
  const [formPolicyIds, setFormPolicyIds] = useState("");

  // Members
  const [membersPage, setMembersPage] = useState(0);

  const membersQuery = useQuery({
    queryKey: queryKeys.adminGroupMembers(groupId!, {
      offset: membersPage * MEMBERS_PAGE_SIZE,
      limit: MEMBERS_PAGE_SIZE,
    }),
    queryFn: () => adminGroup.members(groupId!, {
      offset: membersPage * MEMBERS_PAGE_SIZE,
      limit: MEMBERS_PAGE_SIZE,
    }),
    enabled: !!groupId && !isCreate,
    placeholderData: keepPreviousData,
  });

  const members = membersQuery.data?.items ?? [];
  const membersTotal = membersQuery.data?.count ?? 0;

  // Initialize form from query data
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!groupQuery.data) return;
    const data = groupQuery.data;
    setFormName(data.name);
    setFormMaxStorage(String(data.max_storage));
    setFormSpeedLimit(String(data.speed_limit));
    setFormAdmin(data.admin);
    setFormScopes([...data.scopes]);
    setFormPolicyIds(data.policy_ids.join(", "));
  }, [groupQuery.data]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const updateMutation = useMutation({
    mutationFn: (req: AdminGroupUpdateRequest) => adminGroup.update(groupId!, req),
    onSuccess: () => {
      toast.success(t("adminGroup.updateSuccess"));
      queryClient.invalidateQueries({ queryKey: queryKeys.adminGroup(groupId!) });
      queryClient.invalidateQueries({ queryKey: ["admin", "groups"] });
    },
  });

  const createMutation = useMutation({
    mutationFn: (req: AdminGroupCreateRequest) => adminGroup.create(req),
    onSuccess: () => {
      toast.success(t("adminGroup.createSuccess"));
      queryClient.invalidateQueries({ queryKey: ["admin", "groups"] });
      navigate("/admin/groups");
    },
  });

  const buildPolicyIds = () =>
    formPolicyIds.trim() ? formPolicyIds.split(",").map((s) => s.trim()).filter(Boolean) : [];

  const handleSave = () => {
    if (!formName.trim()) return;
    if (isCreate) {
      createMutation.mutate({
        name: formName.trim(),
        max_storage: parseInt(formMaxStorage) || 0,
        speed_limit: parseInt(formSpeedLimit) || 0,
        admin: formAdmin,
        scopes: formScopes,
        policy_ids: buildPolicyIds(),
      });
    } else {
      updateMutation.mutate({
        name: formName.trim(),
        max_storage: parseInt(formMaxStorage) || 0,
        speed_limit: parseInt(formSpeedLimit) || 0,
        admin: formAdmin,
        scopes: formScopes,
        policy_ids: buildPolicyIds(),
      });
    }
  };

  const isPending = isCreate ? createMutation.isPending : updateMutation.isPending;

  if (!isCreate && (groupQuery.isLoading || !groupQuery.data)) {
    return (
      <div className="max-w-4xl flex flex-col gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-48 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  const membersTotalPages = Math.ceil(membersTotal / MEMBERS_PAGE_SIZE);

  const getMemberPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    if (membersTotalPages <= 7) {
      for (let i = 0; i < membersTotalPages; i++) pages.push(i);
    } else {
      pages.push(0);
      if (membersPage > 2) pages.push("ellipsis");
      const start = Math.max(1, membersPage - 1);
      const end = Math.min(membersTotalPages - 2, membersPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (membersPage < membersTotalPages - 3) pages.push("ellipsis");
      pages.push(membersTotalPages - 1);
    }
    return pages;
  };

  return (
    <div className="max-w-4xl flex flex-col gap-6">
      {/* Basic info */}
      <Card>
        <CardHeader>
          <CardTitle>{isCreate ? t("adminGroup.createGroup") : t("adminGroup.basicInfo")}</CardTitle>
          <CardDescription>{isCreate ? t("adminGroup.noGroupsHint") : t("adminGroup.basicInfoDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label>{t("adminGroup.name")}</Label>
            <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder={t("adminGroup.namePlaceholder")} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>{t("adminGroup.maxStorage")}</Label>
              <Input type="number" min="0" value={formMaxStorage} onChange={(e) => setFormMaxStorage(e.target.value)} />
              <p className="text-xs text-muted-foreground">{t("adminGroup.maxStorageHint")}</p>
            </div>
            <div className="grid gap-2">
              <Label>{t("adminGroup.speedLimit")}</Label>
              <Input type="number" min="0" value={formSpeedLimit} onChange={(e) => setFormSpeedLimit(e.target.value)} />
              <p className="text-xs text-muted-foreground">{t("adminGroup.speedLimitHint")}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={formAdmin} onCheckedChange={setFormAdmin} />
            <div>
              <Label>{t("adminGroup.admin")}</Label>
              <p className="text-xs text-muted-foreground">{t("adminGroup.adminDesc")}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Permissions */}
      <Card>
        <CardHeader>
          <CardTitle>{t("adminGroup.permissions")}</CardTitle>
          <CardDescription>{t("adminGroup.permissionsDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <ScopePicker value={formScopes} onChange={setFormScopes} />
        </CardContent>
      </Card>

      {/* Storage Policies */}
      <Card>
        <CardHeader>
          <CardTitle>{t("adminGroup.policies")}</CardTitle>
          <CardDescription>{t("adminGroup.policiesDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label>{t("adminGroup.policyIds")}</Label>
            <Input value={formPolicyIds} onChange={(e) => setFormPolicyIds(e.target.value)} placeholder={t("adminGroup.policyIdsPlaceholder")} />
          </div>
        </CardContent>
      </Card>

      {/* Save / Create button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isPending || !formName.trim()}>
          {isPending ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : isCreate ? (
            <Plus className="mr-2 size-4" />
          ) : (
            <Save className="mr-2 size-4" />
          )}
          {isCreate ? t("common.create") : t("common.save")}
        </Button>
      </div>

      {/* Members (only for existing groups) */}
      {!isCreate && (
        <Card>
          <CardHeader>
            <CardTitle>{t("adminGroup.members")} ({membersTotal})</CardTitle>
          </CardHeader>
          <CardContent>
            {membersQuery.isLoading ? (
              <div className="flex flex-col gap-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-5 w-full" />
                ))}
              </div>
            ) : members.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Users />
                  </EmptyMedia>
                  <EmptyTitle>{t("adminGroup.noMembers")}</EmptyTitle>
                  <EmptyDescription />
                </EmptyHeader>
              </Empty>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("adminUser.email")}</TableHead>
                      <TableHead>{t("adminUser.nickname")}</TableHead>
                      <TableHead className="w-28 text-right">{t("adminUser.storage")}</TableHead>
                      <TableHead className="w-40 text-right">{t("adminUser.registeredAt")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell>
                          <button
                            className="hover:underline cursor-pointer text-left"
                            onClick={() => navigate(`/admin/users/${member.id}`)}
                          >
                            {member.email}
                          </button>
                        </TableCell>
                        <TableCell>{member.nickname}</TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatBytes(member.storage)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatDate(member.created_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {membersTotalPages > 1 && (
                  <Pagination className="mt-4">
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          text={t("common.previousPage")}
                          onClick={() => setMembersPage(Math.max(0, membersPage - 1))}
                          className={cn(membersPage === 0 && "pointer-events-none opacity-50")}
                        />
                      </PaginationItem>
                      {getMemberPageNumbers().map((p, i) =>
                        p === "ellipsis" ? (
                          <PaginationItem key={`e${i}`}>
                            <PaginationEllipsis />
                          </PaginationItem>
                        ) : (
                          <PaginationItem key={p}>
                            <PaginationLink
                              isActive={p === membersPage}
                              onClick={() => setMembersPage(p)}
                            >
                              {p + 1}
                            </PaginationLink>
                          </PaginationItem>
                        )
                      )}
                      <PaginationItem>
                        <PaginationNext
                          text={t("common.nextPage")}
                          onClick={() => setMembersPage(Math.min(membersTotalPages - 1, membersPage + 1))}
                          className={cn(membersPage >= membersTotalPages - 1 && "pointer-events-none opacity-50")}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

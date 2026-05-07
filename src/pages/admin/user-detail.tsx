import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ChevronsUpDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Loader2, Save, RotateCw, CalendarIcon, X } from "lucide-react";
import { adminUser, adminGroup } from "@/api";
import type { AdminUserUpdateRequest, UserStatus } from "@/api";
import { ScopePicker } from "@/components/admin/scope-picker";
import { cn } from "@/lib/utils";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function AdminUserDetailPage() {
  const { t } = useTranslation();
  const { userId } = useParams<{ userId: string }>();
  const queryClient = useQueryClient();

  const userQuery = useQuery({
    queryKey: queryKeys.adminUser(userId!),
    queryFn: () => adminUser.get(userId!),
    enabled: !!userId,
  });

  const groupsQuery = useQuery({
    queryKey: queryKeys.adminGroups({ limit: 100 }),
    queryFn: () => adminGroup.list({ limit: 100 }),
  });

  const groups = groupsQuery.data?.items ?? [];

  // Form state
  const [formEmail, setFormEmail] = useState("");
  const [formNickname, setFormNickname] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formGroupId, setFormGroupId] = useState("");
  const [formStatus, setFormStatus] = useState<UserStatus>("active");
  const [formScore, setFormScore] = useState("0");
  const [formScopes, setFormScopes] = useState<string[]>([]);
  const [formGroupExpiresDate, setFormGroupExpiresDate] = useState<Date | undefined>(undefined);
  const [formGroupExpiresHour, setFormGroupExpiresHour] = useState("00");
  const [formGroupExpiresMinute, setFormGroupExpiresMinute] = useState("00");
  const [groupOpen, setGroupOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Storage is display-only, updated by calibrate
  const [storageDisplay, setStorageDisplay] = useState(0);

  // Initialize form from query data — legitimate use of setState in effect for form sync
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!userQuery.data) return;
    const data = userQuery.data;
    setFormEmail(data.email);
    setFormNickname(data.nickname);
    setFormGroupId(data.group_id);
    setStorageDisplay(data.storage);
    setFormScopes([...data.scopes]);
    if (data.group_expires) {
      const d = new Date(data.group_expires);
      setFormGroupExpiresDate(d);
      setFormGroupExpiresHour(String(d.getHours()).padStart(2, "0"));
      setFormGroupExpiresMinute(String(d.getMinutes()).padStart(2, "0"));
    } else {
      setFormGroupExpiresDate(undefined);
      setFormGroupExpiresHour("00");
      setFormGroupExpiresMinute("00");
    }
  }, [userQuery.data]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const updateMutation = useMutation({
    mutationFn: (req: AdminUserUpdateRequest) => adminUser.update(userId!, req),
    onSuccess: () => {
      toast.success(t("adminUser.updateSuccess"));
      queryClient.invalidateQueries({ queryKey: queryKeys.adminUser(userId!) });
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });

  const calibrateMutation = useMutation({
    mutationFn: () => adminUser.calibrate(userId!),
    onSuccess: (result) => {
      toast.success(t("adminUser.calibrateSuccess", {
        difference: result.difference,
        fileCount: result.file_count,
      }));
      setStorageDisplay(result.current_storage);
    },
  });

  const getGroupExpiresISO = (): string | null => {
    if (!formGroupExpiresDate) return null;
    const d = new Date(formGroupExpiresDate);
    d.setHours(parseInt(formGroupExpiresHour) || 0);
    d.setMinutes(parseInt(formGroupExpiresMinute) || 0);
    d.setSeconds(0, 0);
    return d.toISOString();
  };

  const handleSave = () => {
    if (!userId) return;
    const req: AdminUserUpdateRequest = {
      email: formEmail.trim() || null,
      nickname: formNickname.trim() || null,
      phone: formPhone.trim() || null,
      group_id: formGroupId || null,
      status: formStatus,
      score: parseInt(formScore) || 0,
      scopes: formScopes,
      group_expires: getGroupExpiresISO(),
    };
    updateMutation.mutate(req);
  };

  const handleCalibrate = () => {
    if (!userId) return;
    calibrateMutation.mutate();
  };

  const groupName = groups.find((g) => g.id === formGroupId)?.name ?? formGroupId;

  const statusLabel = (status: string) => {
    const map: Record<string, string> = {
      active: t("adminUser.statusActive"),
      admin_banned: t("adminUser.statusAdminBanned"),
      system_banned: t("adminUser.statusSystemBanned"),
    };
    return map[status] ?? status;
  };

  if (userQuery.isLoading || !userQuery.data) {
    return (
      <div className="max-w-4xl flex flex-col gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-48 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-4xl flex flex-col gap-6">
      {/* Basic info */}
      <Card>
        <CardHeader>
          <CardTitle>{t("adminUser.basicInfo")}</CardTitle>
          <CardDescription>{t("adminUser.basicInfoDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>{t("adminUser.email")}</Label>
              <Input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder={t("adminUser.emailPlaceholder")} />
            </div>
            <div className="grid gap-2">
              <Label>{t("adminUser.nickname")}</Label>
              <Input value={formNickname} onChange={(e) => setFormNickname(e.target.value)} placeholder={t("adminUser.nicknamePlaceholder")} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>{t("adminUser.phone")}</Label>
            <Input value={formPhone} onChange={(e) => setFormPhone(e.target.value)} placeholder={t("adminUser.phonePlaceholder")} />
          </div>
        </CardContent>
      </Card>

      {/* Group & Permissions */}
      <Card>
        <CardHeader>
          <CardTitle>{t("adminUser.groupAndPermissions")}</CardTitle>
          <CardDescription>{t("adminUser.groupAndPermissionsDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>{t("adminUser.group")}</Label>
              <Popover open={groupOpen} onOpenChange={setGroupOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={groupOpen}
                    className="w-full justify-between font-normal"
                  >
                    <span className="truncate">{groupName}</span>
                    <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder={t("common.searchGroup")} />
                    <CommandList>
                      <CommandEmpty>{t("common.noData")}</CommandEmpty>
                      <CommandGroup>
                        {groups.map((g) => (
                          <CommandItem
                            key={g.id}
                            value={g.name}
                            data-checked={formGroupId === g.id}
                            onSelect={() => {
                              setFormGroupId(g.id);
                              setGroupOpen(false);
                            }}
                          >
                            {g.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid gap-2">
              <Label>{t("adminUser.status")}</Label>
              <Select value={formStatus} onValueChange={(v) => { if (v) setFormStatus(v as UserStatus); }}>
                <SelectTrigger>
                  {statusLabel(formStatus)}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t("adminUser.statusActive")}</SelectItem>
                  <SelectItem value="admin_banned">{t("adminUser.statusAdminBanned")}</SelectItem>
                  <SelectItem value="system_banned">{t("adminUser.statusSystemBanned")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>{t("adminUser.score")}</Label>
              <Input type="number" min="0" value={formScore} onChange={(e) => setFormScore(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>{t("adminUser.groupExpires")}</Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formGroupExpiresDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 size-4" />
                    {formGroupExpiresDate
                      ? formatDateTime(getGroupExpiresISO()!)
                      : t("adminUser.groupExpiresNever")}
                    {formGroupExpiresDate && (
                      <X
                        className="ml-auto size-4 opacity-50 hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFormGroupExpiresDate(undefined);
                          setFormGroupExpiresHour("00");
                          setFormGroupExpiresMinute("00");
                        }}
                      />
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formGroupExpiresDate}
                    onSelect={(date) => {
                      setFormGroupExpiresDate(date);
                    }}
                    initialFocus
                  />
                  <div className="flex items-center gap-2 border-t px-3 py-2">
                    <Label className="text-xs">{t("adminUser.time")}</Label>
                    <Input
                      type="number"
                      min="0"
                      max="23"
                      className="h-7 w-14 text-center"
                      value={formGroupExpiresHour}
                      onChange={(e) => setFormGroupExpiresHour(e.target.value.padStart(2, "0"))}
                    />
                    <span>:</span>
                    <Input
                      type="number"
                      min="0"
                      max="59"
                      className="h-7 w-14 text-center"
                      value={formGroupExpiresMinute}
                      onChange={(e) => setFormGroupExpiresMinute(e.target.value.padStart(2, "0"))}
                    />
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="grid gap-2">
            <Label>{t("adminUser.scopes")}</Label>
            <ScopePicker value={formScopes} onChange={setFormScopes} />
          </div>
        </CardContent>
      </Card>

      {/* Storage */}
      <Card>
        <CardHeader>
          <CardTitle>{t("adminUser.storageSection")}</CardTitle>
          <CardDescription>{t("adminUser.storageSectionDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{t("adminUser.storage")}</p>
              <p className="text-2xl font-semibold">{formatBytes(storageDisplay)}</p>
            </div>
            <Button variant="outline" onClick={handleCalibrate} disabled={calibrateMutation.isPending}>
              {calibrateMutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <RotateCw className="mr-2 size-4" />}
              {t("adminUser.calibrateStorage")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={updateMutation.isPending}>
          {updateMutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
          {t("common.save")}
        </Button>
      </div>
    </div>
  );
}

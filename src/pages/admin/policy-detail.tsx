import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Save, Plus, FlaskConical } from "lucide-react";
import { adminPolicy, resolveErrorMessage } from "@/api";
import type { PolicyType } from "@/api";

const POLICY_TYPES: PolicyType[] = ["local", "s3", "cos", "oss", "onedrive", "onedrive_cn", "google_drive", "upyun"];

export default function AdminPolicyDetailPage() {
  const { t } = useTranslation();
  const { policyId } = useParams<{ policyId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const isCreate = policyId === "new";

  const policyQuery = useQuery({
    queryKey: queryKeys.adminPolicy(policyId!),
    queryFn: () => adminPolicy.get(policyId!),
    enabled: !!policyId && !isCreate,
  });

  // Type
  const [policyType, setPolicyType] = useState<PolicyType>("local");

  // Common fields
  const [formName, setFormName] = useState("");
  const [formMaxSize, setFormMaxSize] = useState("1073741824");
  const [formAutoRename, setFormAutoRename] = useState(false);
  const [formDirNameRule, setFormDirNameRule] = useState("");
  const [formFileNameRule, setFormFileNameRule] = useState("");
  const [formIsPrivate, setFormIsPrivate] = useState(true);
  const [formBaseUrl, setFormBaseUrl] = useState("");
  const [formOriginLink, setFormOriginLink] = useState(false);
  const [formToken, setFormToken] = useState("");
  const [formFileType, setFormFileType] = useState("");
  const [formMimetype, setFormMimetype] = useState("");
  const [formChunkSize, setFormChunkSize] = useState("52428800");

  // Provider-specific fields (superset)
  const [formServer, setFormServer] = useState("");
  const [formBucketName, setFormBucketName] = useState("");
  const [formAccessKey, setFormAccessKey] = useState("");
  const [formSecretKey, setFormSecretKey] = useState("");
  const [formS3Region, setFormS3Region] = useState("");
  const [formS3PathStyle, setFormS3PathStyle] = useState(false);
  const [formOdRedirect, setFormOdRedirect] = useState("");
  const [formClientId, setFormClientId] = useState("");
  const [formClientSecret, setFormClientSecret] = useState("");
  const [formDriveId, setFormDriveId] = useState("");
  const [formTenantId, setFormTenantId] = useState("");
  const [formFolderId, setFormFolderId] = useState("");
  const [formOperator, setFormOperator] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formDomain, setFormDomain] = useState("");

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!policyQuery.data) return;
    const d = policyQuery.data;
    setPolicyType(d.policy_type);
    setFormName(d.name);
    setFormMaxSize(String(d.max_size));
    setFormAutoRename(d.auto_rename);
    setFormDirNameRule(d.dir_name_rule ?? "");
    setFormFileNameRule(d.file_name_rule ?? "");
    setFormIsPrivate(d.is_private);
    setFormBaseUrl(d.base_url ?? "");
    setFormOriginLink(d.is_origin_link_enable);
    setFormToken(d.token ?? "");
    setFormFileType(d.file_type ?? "");
    setFormMimetype(d.mimetype ?? "");
    setFormChunkSize(String(d.chunk_size));
    // Provider-specific
    setFormServer(d.server ?? "");
    setFormBucketName(d.bucket_name ?? "");
    setFormAccessKey(d.access_key ?? "");
    setFormSecretKey(d.secret_key ?? "");
    setFormS3Region(d.s3_region ?? "");
    setFormS3PathStyle(d.s3_path_style ?? false);
    setFormOdRedirect(d.od_redirect ?? "");
    setFormClientId(d.client_id ?? "");
    setFormClientSecret(d.client_secret ?? "");
    setFormDriveId(d.drive_id ?? "");
    setFormTenantId(d.tenant_id ?? "");
    setFormFolderId(d.folder_id ?? "");
    setFormOperator(d.operator ?? "");
    setFormPassword(d.password ?? "");
    setFormDomain(d.domain ?? "");
  }, [policyQuery.data]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const buildCommon = () => ({
    name: formName.trim(),
    max_size: parseInt(formMaxSize) || 0,
    auto_rename: formAutoRename,
    dir_name_rule: formDirNameRule || null,
    file_name_rule: formFileNameRule || null,
    is_private: formIsPrivate,
    base_url: formBaseUrl || null,
    is_origin_link_enable: formOriginLink,
    token: formToken || null,
    file_type: formFileType || null,
    mimetype: formMimetype || null,
    chunk_size: parseInt(formChunkSize) || 52428800,
  });

  const buildPayload = () => {
    const common = buildCommon();
    switch (policyType) {
      case "local":
        return { ...common, server: formServer };
      case "s3":
        return { ...common, server: formServer, bucket_name: formBucketName, access_key: formAccessKey, secret_key: formSecretKey, s3_region: formS3Region || "us-east-1", s3_path_style: formS3PathStyle };
      case "cos":
        return { ...common, server: formServer, bucket_name: formBucketName, access_key: formAccessKey, secret_key: formSecretKey, s3_region: formS3Region || "ap-guangzhou" };
      case "oss":
        return { ...common, server: formServer, bucket_name: formBucketName, access_key: formAccessKey, secret_key: formSecretKey, s3_region: formS3Region || "oss-cn-hangzhou" };
      case "onedrive":
      case "onedrive_cn":
        return { ...common, client_id: formClientId, client_secret: formClientSecret, server: formServer || null, od_redirect: formOdRedirect || null, drive_id: formDriveId || null, tenant_id: formTenantId || null };
      case "google_drive":
        return { ...common, client_id: formClientId, client_secret: formClientSecret, folder_id: formFolderId || null };
      case "upyun":
        return { ...common, operator: formOperator, password: formPassword, bucket_name: formBucketName, domain: formDomain || null };
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const callCreate = (type: PolicyType, payload: any) => {
    const fn = {
      local: adminPolicy.createLocal,
      s3: adminPolicy.createS3,
      cos: adminPolicy.createCos,
      oss: adminPolicy.createOss,
      onedrive: adminPolicy.createOnedrive,
      onedrive_cn: adminPolicy.createOnedriveCn,
      google_drive: adminPolicy.createGoogleDrive,
      upyun: adminPolicy.createUpyun,
    }[type];
    return fn(payload);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const callUpdate = (id: string, type: PolicyType, payload: any) => {
    const fn = {
      local: adminPolicy.updateLocal,
      s3: adminPolicy.updateS3,
      cos: adminPolicy.updateCos,
      oss: adminPolicy.updateOss,
      onedrive: adminPolicy.updateOnedrive,
      onedrive_cn: adminPolicy.updateOnedriveCn,
      google_drive: adminPolicy.updateGoogleDrive,
      upyun: adminPolicy.updateUpyun,
    }[type];
    return fn(id, payload);
  };

  const createMutation = useMutation({
    mutationFn: () => callCreate(policyType, buildPayload()),
    onSuccess: () => {
      toast.success(t("adminPolicy.createSuccess"));
      queryClient.invalidateQueries({ queryKey: ["admin", "policies"] });
      navigate("/admin/policies");
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => callUpdate(policyId!, policyType, buildPayload()),
    onSuccess: () => {
      toast.success(t("adminPolicy.updateSuccess"));
      queryClient.invalidateQueries({ queryKey: queryKeys.adminPolicy(policyId!) });
      queryClient.invalidateQueries({ queryKey: ["admin", "policies"] });
    },
  });

  // Test mutations
  const testPathMutation = useMutation({
    mutationFn: () => adminPolicy.testPath({ path: formServer }),
    onSuccess: (data) => {
      if (!data.is_exists) toast.warning(t("adminPolicy.testPathNotExist"));
      else if (!data.is_writable) toast.warning(t("adminPolicy.testPathNotWritable"));
      else toast.success(t("adminPolicy.testPathSuccess"));
    },
    onError: (err) => toast.error(resolveErrorMessage(err)),
  });

  const testS3Mutation = useMutation({
    mutationFn: () => adminPolicy.testS3({
      server: formServer,
      bucket_name: formBucketName,
      access_key: formAccessKey,
      secret_key: formSecretKey,
      s3_region: formS3Region,
      s3_path_style: formS3PathStyle,
    }),
    onSuccess: (data) => {
      if (data.is_connected) toast.success(t("adminPolicy.testS3Success"));
      else toast.error(data.message);
    },
    onError: (err) => toast.error(resolveErrorMessage(err)),
  });

  const corsMutation = useMutation({
    mutationFn: () => adminPolicy.createCors(),
    onSuccess: () => toast.success(t("adminPolicy.corsSuccess")),
    onError: (err) => toast.error(resolveErrorMessage(err)),
  });

  const scfMutation = useMutation({
    mutationFn: () => adminPolicy.createScf(),
    onSuccess: () => toast.success(t("adminPolicy.scfSuccess")),
    onError: (err) => toast.error(resolveErrorMessage(err)),
  });

  const oauthMutation = useMutation({
    mutationFn: () => adminPolicy.getOAuthUrl(policyId!),
    onSuccess: (data) => {
      if (data.instance_id) window.open(data.instance_id, "_blank");
    },
    onError: (err) => toast.error(resolveErrorMessage(err)),
  });

  const handleSave = () => {
    if (!formName.trim()) return;
    if (isCreate) createMutation.mutate();
    else updateMutation.mutate();
  };

  const isPending = isCreate ? createMutation.isPending : updateMutation.isPending;
  const policyTypeLabel = (type: PolicyType) => t(`adminPolicy.type_${type}`);

  if (!isCreate && (policyQuery.isLoading || !policyQuery.data)) {
    return (
      <div className="max-w-4xl flex flex-col gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-48 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  const renderProviderFields = () => {
    switch (policyType) {
      case "local":
        return (
          <>
            <div className="grid gap-2">
              <Label>{t("adminPolicy.server")}</Label>
              <Input value={formServer} onChange={(e) => setFormServer(e.target.value)} placeholder="/data/uploads" />
              <p className="text-xs text-muted-foreground">{t("adminPolicy.localServerHint")}</p>
            </div>
            <Button type="button" variant="outline" onClick={() => testPathMutation.mutate()} disabled={testPathMutation.isPending || !formServer}>
              {testPathMutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <FlaskConical className="mr-2 size-4" />}
              {t("adminPolicy.testPath")}
            </Button>
          </>
        );

      case "s3":
      case "cos":
      case "oss":
        return (
          <>
            <div className="grid gap-2">
              <Label>{t("adminPolicy.server")}</Label>
              <Input value={formServer} onChange={(e) => setFormServer(e.target.value)} placeholder={policyType === "cos" ? "cos.ap-guangzhou.myqcloud.com" : policyType === "oss" ? "s3.oss-cn-hangzhou.aliyuncs.com" : "s3.amazonaws.com"} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{t("adminPolicy.bucketName")}</Label>
                <Input value={formBucketName} onChange={(e) => setFormBucketName(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>{t("adminPolicy.s3Region")}</Label>
                <Input value={formS3Region} onChange={(e) => setFormS3Region(e.target.value)} placeholder={policyType === "cos" ? "ap-guangzhou" : policyType === "oss" ? "oss-cn-hangzhou" : "us-east-1"} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{t("adminPolicy.accessKey")}</Label>
                <Input value={formAccessKey} onChange={(e) => setFormAccessKey(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>{t("adminPolicy.secretKey")}</Label>
                <Input type="password" value={formSecretKey} onChange={(e) => setFormSecretKey(e.target.value)} />
              </div>
            </div>
            {policyType === "s3" && (
              <div className="flex items-center gap-3">
                <Switch checked={formS3PathStyle} onCheckedChange={setFormS3PathStyle} />
                <div>
                  <Label>{t("adminPolicy.s3PathStyle")}</Label>
                  <p className="text-xs text-muted-foreground">{t("adminPolicy.s3PathStyleDesc")}</p>
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => testS3Mutation.mutate()} disabled={testS3Mutation.isPending || !formServer || !formBucketName}>
                {testS3Mutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <FlaskConical className="mr-2 size-4" />}
                {t("adminPolicy.testConnection")}
              </Button>
              <Button type="button" variant="outline" onClick={() => corsMutation.mutate()} disabled={corsMutation.isPending}>
                {corsMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                {t("adminPolicy.createCors")}
              </Button>
              {policyType === "cos" && (
                <Button type="button" variant="outline" onClick={() => scfMutation.mutate()} disabled={scfMutation.isPending}>
                  {scfMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                  {t("adminPolicy.createScf")}
                </Button>
              )}
            </div>
          </>
        );

      case "onedrive":
      case "onedrive_cn":
        return (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{t("adminPolicy.clientId")}</Label>
                <Input value={formClientId} onChange={(e) => setFormClientId(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>{t("adminPolicy.clientSecret")}</Label>
                <Input type="password" value={formClientSecret} onChange={(e) => setFormClientSecret(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{t("adminPolicy.tenantId")}</Label>
                <Input value={formTenantId} onChange={(e) => setFormTenantId(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>{t("adminPolicy.driveId")}</Label>
                <Input value={formDriveId} onChange={(e) => setFormDriveId(e.target.value)} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>{t("adminPolicy.odRedirect")}</Label>
              <Input value={formOdRedirect} onChange={(e) => setFormOdRedirect(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>{t("adminPolicy.server")}</Label>
              <Input value={formServer} onChange={(e) => setFormServer(e.target.value)} placeholder="graph.microsoft.com" />
            </div>
            {!isCreate && (
              <Button type="button" variant="outline" onClick={() => oauthMutation.mutate()} disabled={oauthMutation.isPending}>
                {oauthMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                {t("adminPolicy.getOAuthUrl")}
              </Button>
            )}
          </>
        );

      case "google_drive":
        return (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{t("adminPolicy.clientId")}</Label>
                <Input value={formClientId} onChange={(e) => setFormClientId(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>{t("adminPolicy.clientSecret")}</Label>
                <Input type="password" value={formClientSecret} onChange={(e) => setFormClientSecret(e.target.value)} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>{t("adminPolicy.folderId")}</Label>
              <Input value={formFolderId} onChange={(e) => setFormFolderId(e.target.value)} />
            </div>
          </>
        );

      case "upyun":
        return (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{t("adminPolicy.operator")}</Label>
                <Input value={formOperator} onChange={(e) => setFormOperator(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>{t("adminPolicy.password")}</Label>
                <Input type="password" value={formPassword} onChange={(e) => setFormPassword(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{t("adminPolicy.bucketName")}</Label>
                <Input value={formBucketName} onChange={(e) => setFormBucketName(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>{t("adminPolicy.domain")}</Label>
                <Input value={formDomain} onChange={(e) => setFormDomain(e.target.value)} />
              </div>
            </div>
          </>
        );
    }
  };

  return (
    <div className="max-w-4xl flex flex-col gap-6">
      {/* Card 1: Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>{isCreate ? t("adminPolicy.createPolicy") : t("adminPolicy.basicInfo")}</CardTitle>
          <CardDescription>{isCreate ? t("adminPolicy.noPoliciesHint") : t("adminPolicy.basicInfoDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label>{t("adminPolicy.policyType")}</Label>
            {isCreate ? (
              <Select value={policyType} onValueChange={(v) => setPolicyType(v as PolicyType)}>
                <SelectTrigger>
                  {policyTypeLabel(policyType)}
                </SelectTrigger>
                <SelectContent>
                  {POLICY_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>{policyTypeLabel(type)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Badge variant="secondary" className="w-fit">{policyTypeLabel(policyType)}</Badge>
            )}
          </div>
          <div className="grid gap-2">
            <Label>{t("adminPolicy.name")}</Label>
            <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder={t("adminPolicy.namePlaceholder")} />
          </div>
        </CardContent>
      </Card>

      {/* Card 2: Provider Settings */}
      <Card>
        <CardHeader>
          <CardTitle>{t("adminPolicy.providerSettings")}</CardTitle>
          <CardDescription>{t("adminPolicy.providerSettingsDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {renderProviderFields()}
        </CardContent>
      </Card>

      {/* Card 3: Upload & File Rules */}
      <Card>
        <CardHeader>
          <CardTitle>{t("adminPolicy.uploadRules")}</CardTitle>
          <CardDescription>{t("adminPolicy.uploadRulesDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>{t("adminPolicy.maxSize")}</Label>
              <Input type="number" min="0" value={formMaxSize} onChange={(e) => setFormMaxSize(e.target.value)} />
              <p className="text-xs text-muted-foreground">{t("adminPolicy.maxSizeHint")}</p>
            </div>
            <div className="grid gap-2">
              <Label>{t("adminPolicy.chunkSize")}</Label>
              <Input type="number" min="1" value={formChunkSize} onChange={(e) => setFormChunkSize(e.target.value)} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={formAutoRename} onCheckedChange={setFormAutoRename} />
            <div>
              <Label>{t("adminPolicy.autoRename")}</Label>
              <p className="text-xs text-muted-foreground">{t("adminPolicy.autoRenameDesc")}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>{t("adminPolicy.dirNameRule")}</Label>
              <Input value={formDirNameRule} onChange={(e) => setFormDirNameRule(e.target.value)} />
              <p className="text-xs text-muted-foreground">{t("adminPolicy.dirNameRuleHint")}</p>
            </div>
            <div className="grid gap-2">
              <Label>{t("adminPolicy.fileNameRule")}</Label>
              <Input value={formFileNameRule} onChange={(e) => setFormFileNameRule(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>{t("adminPolicy.fileType")}</Label>
              <Input value={formFileType} onChange={(e) => setFormFileType(e.target.value)} placeholder={t("adminPolicy.fileTypePlaceholder")} />
            </div>
            <div className="grid gap-2">
              <Label>{t("adminPolicy.mimetype")}</Label>
              <Input value={formMimetype} onChange={(e) => setFormMimetype(e.target.value)} placeholder={t("adminPolicy.mimetypePlaceholder")} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 4: Access Settings */}
      <Card>
        <CardHeader>
          <CardTitle>{t("adminPolicy.accessSettings")}</CardTitle>
          <CardDescription>{t("adminPolicy.accessSettingsDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex items-center gap-3">
            <Switch checked={formIsPrivate} onCheckedChange={setFormIsPrivate} />
            <div>
              <Label>{t("adminPolicy.private")}</Label>
              <p className="text-xs text-muted-foreground">{t("adminPolicy.privateDesc")}</p>
            </div>
          </div>
          <div className="grid gap-2">
            <Label>{t("adminPolicy.baseUrl")}</Label>
            <Input value={formBaseUrl} onChange={(e) => setFormBaseUrl(e.target.value)} />
            <p className="text-xs text-muted-foreground">{t("adminPolicy.baseUrlHint")}</p>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={formOriginLink} onCheckedChange={setFormOriginLink} />
            <div>
              <Label>{t("adminPolicy.originLink")}</Label>
              <p className="text-xs text-muted-foreground">{t("adminPolicy.originLinkDesc")}</p>
            </div>
          </div>
          <div className="grid gap-2">
            <Label>{t("adminPolicy.token")}</Label>
            <Input value={formToken} onChange={(e) => setFormToken(e.target.value)} />
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
    </div>
  );
}

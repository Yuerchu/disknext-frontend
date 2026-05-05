import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Trash2, KeyRound, ShieldCheck, ShieldOff } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription,
} from "@/components/ui/empty";
import { userSettings, resolveErrorMessage } from "@/api";
import type { AuthnDetailResponse, UserSettingResponse } from "@/api";

function extractSecretFromUri(uri: string): string {
  try {
    const url = new URL(uri);
    return url.searchParams.get("secret") ?? "";
  } catch {
    return "";
  }
}

function bufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlToBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function decodeCreationOptions(options: any): PublicKeyCredentialCreationOptions {
  return {
    ...options,
    challenge: base64urlToBuffer(options.challenge),
    user: {
      ...options.user,
      id: base64urlToBuffer(options.user.id),
    },
    excludeCredentials: (options.excludeCredentials ?? []).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (cred: any) => ({
        ...cred,
        id: base64urlToBuffer(cred.id),
      }),
    ),
  };
}

function serializeCredential(credential: PublicKeyCredential): string {
  const response = credential.response as AuthenticatorAttestationResponse;
  return JSON.stringify({
    id: credential.id,
    rawId: bufferToBase64url(credential.rawId),
    type: credential.type,
    response: {
      attestationObject: bufferToBase64url(response.attestationObject),
      clientDataJSON: bufferToBase64url(response.clientDataJSON),
    },
  });
}

interface SecuritySectionProps {
  settingsData?: UserSettingResponse | null;
}

export default function SecuritySection({ settingsData }: SecuritySectionProps) {
  // Load settings data if not provided
  const [localSettings, setLocalSettings] = useState<UserSettingResponse | null>(settingsData ?? null);
  const [settingsLoading, setSettingsLoading] = useState(!settingsData);

  useEffect(() => {
    if (settingsData) {
      setLocalSettings(settingsData);
      return;
    }
    setSettingsLoading(true);
    userSettings.get().then((data) => {
      setLocalSettings(data);
    }).catch((err) => {
      toast.error(resolveErrorMessage(err));
    }).finally(() => {
      setSettingsLoading(false);
    });
  }, [settingsData]);

  if (settingsLoading || !localSettings) {
    return (
      <div className="flex flex-col gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-48 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <ChangePasswordCard />
      <TwoFactorCard
        enabled={localSettings.two_factor}
        onEnabledChange={() => {
          setLocalSettings({ ...localSettings, two_factor: true });
        }}
      />
      <WebAuthnCard />
    </div>
  );
}

// ─── Change Password Card ──────────────────────────────────────────

function ChangePasswordCard() {
  const { t } = useTranslation();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (newPassword.length < 8) {
      toast.error(t("userSettings.security.passwordMinLength"));
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t("userSettings.security.passwordMismatch"));
      return;
    }
    setSaving(true);
    try {
      await userSettings.changePassword({ old_password: oldPassword, new_password: newPassword });
      toast.success(t("userSettings.security.passwordChanged"));
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(resolveErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("userSettings.security.passwordTitle")}</CardTitle>
        <CardDescription>{t("userSettings.security.passwordDesc")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2">
          <Label>{t("userSettings.security.oldPassword")}</Label>
          <Input
            type="password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label>{t("userSettings.security.newPassword")}</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div className="grid gap-2">
            <Label>{t("userSettings.security.confirmPassword")}</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={saving || !oldPassword || !newPassword}>
            {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
            {t("userSettings.security.changePassword")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Two-Factor Authentication Card ────────────────────────────────

function TwoFactorCard({ enabled, onEnabledChange }: { enabled: boolean; onEnabledChange: () => void }) {
  const { t } = useTranslation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [setupToken, setSetupToken] = useState("");
  const [uri, setUri] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const handleEnable = async () => {
    setLoading(true);
    try {
      const data = await userSettings.get2FASetup();
      setSetupToken(data.setup_token);
      setUri(data.uri);
      setCode("");
      setDialogOpen(true);
    } catch (err) {
      toast.error(resolveErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (code.length !== 6) return;
    setVerifying(true);
    try {
      await userSettings.enable2FA({ setup_token: setupToken, code });
      toast.success(t("userSettings.security.twoFactorSuccess"));
      setDialogOpen(false);
      onEnabledChange();
    } catch (err) {
      toast.error(resolveErrorMessage(err));
    } finally {
      setVerifying(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="grid gap-1">
              <CardTitle>{t("userSettings.security.twoFactorTitle")}</CardTitle>
              <CardDescription>{t("userSettings.security.twoFactorDesc")}</CardDescription>
            </div>
            <Badge variant={enabled ? "default" : "secondary"}>
              {enabled ? (
                <><ShieldCheck className="mr-1 size-3" />{t("userSettings.security.twoFactorEnabled")}</>
              ) : (
                <><ShieldOff className="mr-1 size-3" />{t("userSettings.security.twoFactorDisabled")}</>
              )}
            </Badge>
          </div>
        </CardHeader>
        {!enabled && (
          <CardContent>
            <Button onClick={handleEnable} disabled={loading}>
              {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
              {t("userSettings.security.enable2FA")}
            </Button>
          </CardContent>
        )}
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("userSettings.security.setup2FATitle")}</DialogTitle>
            <DialogDescription>{t("userSettings.security.setup2FADesc")}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            {uri && (
              <div className="rounded-lg bg-white p-3">
                <QRCodeSVG value={uri} size={200} />
              </div>
            )}
            <div className="w-full">
              <Label className="text-xs text-muted-foreground">{t("userSettings.security.manualEntry")}</Label>
              <code className="block mt-1 text-xs bg-muted p-2 rounded break-all select-all">
                {extractSecretFromUri(uri)}
              </code>
            </div>
            <div className="w-full grid gap-2">
              <Label>{t("userSettings.security.verificationCode")}</Label>
              <Input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder={t("userSettings.security.verificationCodePlaceholder")}
                className="text-center text-2xl tracking-[0.5em] font-mono"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                onKeyDown={(e) => { if (e.key === "Enter") handleVerify(); }}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleVerify} disabled={verifying || code.length !== 6}>
              {verifying && <Loader2 className="mr-2 size-4 animate-spin" />}
              {t("userSettings.security.verifyAndEnable")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── WebAuthn / Passkeys Card ──────────────────────────────────────

function WebAuthnCard() {
  const { t } = useTranslation();
  const [credentials, setCredentials] = useState<AuthnDetailResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);

  // Rename dialog
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<AuthnDetailResponse | null>(null);
  const [renameName, setRenameName] = useState("");
  const [renaming, setRenaming] = useState(false);

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AuthnDetailResponse | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Name dialog (after registration)
  const [nameDialogOpen, setNameDialogOpen] = useState(false);
  const [newCredentialJson, setNewCredentialJson] = useState("");
  const [newPasskeyName, setNewPasskeyName] = useState("");
  const [nameSaving, setNameSaving] = useState(false);

  const loadCredentials = useCallback(async () => {
    setLoading(true);
    try {
      const data = await userSettings.listAuthns();
      setCredentials(data);
    } catch (err) {
      toast.error(resolveErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCredentials(); }, [loadCredentials]);

  const handleRegister = async () => {
    if (!window.PublicKeyCredential) {
      toast.error(t("userSettings.security.webauthnNotSupported"));
      return;
    }
    setRegistering(true);
    try {
      const options = await userSettings.startPasskeyRegistration();
      const publicKeyOptions = decodeCreationOptions(options);
      const credential = await navigator.credentials.create({
        publicKey: publicKeyOptions,
      }) as PublicKeyCredential | null;
      if (!credential) {
        setRegistering(false);
        return;
      }
      const serialized = serializeCredential(credential);
      setNewCredentialJson(serialized);
      setNewPasskeyName("");
      setNameDialogOpen(true);
    } catch (err) {
      toast.error(resolveErrorMessage(err));
    } finally {
      setRegistering(false);
    }
  };

  const handleFinishRegistration = async () => {
    setNameSaving(true);
    try {
      await userSettings.finishPasskeyRegistration({
        credential: newCredentialJson,
        name: newPasskeyName.trim() || null,
      });
      toast.success(t("userSettings.security.passkeyAdded"));
      setNameDialogOpen(false);
      loadCredentials();
    } catch (err) {
      toast.error(resolveErrorMessage(err));
    } finally {
      setNameSaving(false);
    }
  };

  const handleRename = async () => {
    if (!renameTarget || !renameName.trim()) return;
    setRenaming(true);
    try {
      await userSettings.renameAuthn(renameTarget.id, { name: renameName.trim() });
      toast.success(t("userSettings.security.passkeyRenamed"));
      setRenameDialogOpen(false);
      loadCredentials();
    } catch (err) {
      toast.error(resolveErrorMessage(err));
    } finally {
      setRenaming(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await userSettings.deleteAuthn(deleteTarget.id);
      toast.success(t("userSettings.security.passkeyDeleted"));
      setDeleteDialogOpen(false);
      loadCredentials();
    } catch (err) {
      toast.error(resolveErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString();
    } catch {
      return dateStr;
    }
  };

  const webauthnSupported = typeof window !== "undefined" && !!window.PublicKeyCredential;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="grid gap-1">
              <CardTitle>{t("userSettings.security.webauthnTitle")}</CardTitle>
              <CardDescription>{t("userSettings.security.webauthnDesc")}</CardDescription>
            </div>
            {webauthnSupported && (
              <Button size="sm" onClick={handleRegister} disabled={registering}>
                {registering ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Plus className="mr-2 size-4" />}
                {t("userSettings.security.addPasskey")}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !webauthnSupported ? (
            <p className="text-sm text-muted-foreground">{t("userSettings.security.webauthnNotSupported")}</p>
          ) : credentials.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <KeyRound />
                </EmptyMedia>
                <EmptyTitle>{t("userSettings.security.noPasskeys")}</EmptyTitle>
                <EmptyDescription>{t("userSettings.security.noPasskeysHint")}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("userSettings.security.passkeyName")}</TableHead>
                  <TableHead>{t("userSettings.security.deviceType")}</TableHead>
                  <TableHead>{t("userSettings.security.backedUp")}</TableHead>
                  <TableHead>{t("userSettings.security.createdAt")}</TableHead>
                  <TableHead className="text-right">{t("userSettings.security.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {credentials.map((cred) => (
                  <TableRow key={cred.id}>
                    <TableCell className="font-medium">{cred.name || cred.credential_id.slice(0, 12) + "..."}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{cred.credential_device_type}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={cred.credential_backed_up ? "default" : "secondary"}>
                        {cred.credential_backed_up ? t("userSettings.security.backedUpYes") : t("userSettings.security.backedUpNo")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(cred.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setRenameTarget(cred);
                            setRenameName(cred.name ?? "");
                            setRenameDialogOpen(true);
                          }}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setDeleteTarget(cred);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Name Passkey Dialog (after registration) */}
      <Dialog open={nameDialogOpen} onOpenChange={setNameDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("userSettings.security.passkeyNameTitle")}</DialogTitle>
            <DialogDescription>{t("userSettings.security.passkeyNameDesc")}</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newPasskeyName}
              onChange={(e) => setNewPasskeyName(e.target.value)}
              placeholder={t("userSettings.security.passkeyNamePlaceholder")}
              onKeyDown={(e) => { if (e.key === "Enter") handleFinishRegistration(); }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setNameDialogOpen(false); handleFinishRegistration(); }}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleFinishRegistration} disabled={nameSaving}>
              {nameSaving && <Loader2 className="mr-2 size-4 animate-spin" />}
              {t("common.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("userSettings.security.renamePasskey")}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={renameName}
              onChange={(e) => setRenameName(e.target.value)}
              placeholder={t("userSettings.security.passkeyNamePlaceholder")}
              onKeyDown={(e) => { if (e.key === "Enter") handleRename(); }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleRename} disabled={renaming || !renameName.trim()}>
              {renaming && <Loader2 className="mr-2 size-4 animate-spin" />}
              {t("common.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("userSettings.security.deletePasskeyTitle")}</DialogTitle>
            <DialogDescription>{t("userSettings.security.deletePasskeyConfirm")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>{t("common.cancel")}</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="mr-2 size-4 animate-spin" />}
              {t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

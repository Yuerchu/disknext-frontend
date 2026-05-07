import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
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
import type { AuthnDetailResponse } from "@/api";
import { SudoDialog } from "@/components/sudo-dialog";
import { VerificationCodeInput } from "@/components/verification-code-input";

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

export default function SecuritySection() {
  const queryClient = useQueryClient();

  const settingsQuery = useQuery({
    queryKey: queryKeys.userSettings(),
    queryFn: () => userSettings.get(),
  });

  if (settingsQuery.isLoading || !settingsQuery.data) {
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
      <ChangeEmailCard
        currentEmail={settingsQuery.data.email}
        onChanged={() => {
          queryClient.invalidateQueries({ queryKey: queryKeys.userSettings() });
        }}
      />
      <ChangePhoneCard
        currentPhone={settingsQuery.data.phone}
        onChanged={() => {
          queryClient.invalidateQueries({ queryKey: queryKeys.userSettings() });
        }}
      />
      <ChangePasswordCard />
      <TwoFactorCard
        enabled={settingsQuery.data.two_factor}
        onEnabledChange={() => {
          queryClient.invalidateQueries({ queryKey: queryKeys.userSettings() });
        }}
      />
      <WebAuthnCard />
    </div>
  );
}

// ─── Change Email Card ────────────────────────────────────────────

function ChangeEmailCard({ currentEmail, onChanged }: { currentEmail: string; onChanged: () => void }) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [sudoOpen, setSudoOpen] = useState(false);
  const [sudoToken, setSudoToken] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [sendingCode, setSendingCode] = useState(false);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleStartChange = () => {
    setSudoOpen(true);
  };

  const handleSudoSuccess = (token: string) => {
    setSudoToken(token);
    setEditing(true);
    setNewEmail("");
    setCode("");
    setCooldown(0);
  };

  const handleSendCode = async () => {
    if (!newEmail) return;
    setSendingCode(true);
    try {
      await userSettings.sendChangeEmailCode({ new_email: newEmail }, sudoToken);
      toast.success(t("userSettings.security.codeSent"));
      setCooldown(60);
    } catch (err) {
      toast.error(resolveErrorMessage(err));
    } finally {
      setSendingCode(false);
    }
  };

  const changeEmailMutation = useMutation({
    mutationFn: () =>
      userSettings.changeEmail({ new_email: newEmail, new_email_code: code }, sudoToken),
    onSuccess: () => {
      toast.success(t("userSettings.security.emailChanged"));
      setEditing(false);
      setSudoToken("");
      onChanged();
    },
  });

  const handleCancel = () => {
    setEditing(false);
    setSudoToken("");
    setNewEmail("");
    setCode("");
    setCooldown(0);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t("userSettings.security.changeEmail")}</CardTitle>
          <CardDescription>{t("userSettings.security.changeEmailDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label>{t("userSettings.security.currentEmail")}</Label>
            <p className="text-sm text-muted-foreground">{currentEmail}</p>
          </div>
          {editing ? (
            <>
              <div className="grid gap-2">
                <Label>{t("userSettings.security.newEmail")}</Label>
                <Input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="name@example.com"
                  autoFocus
                />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSendCode}
                  disabled={sendingCode || cooldown > 0 || !newEmail}
                >
                  {sendingCode && <Loader2 className="mr-2 size-4 animate-spin" />}
                  {cooldown > 0
                    ? t("userSettings.security.resendIn", { seconds: cooldown })
                    : t("userSettings.security.sendCode")}
                </Button>
              </div>
              <VerificationCodeInput
                value={code}
                onChange={setCode}
                onComplete={() => changeEmailMutation.mutate()}
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleCancel}>
                  {t("common.cancel")}
                </Button>
                <Button
                  onClick={() => changeEmailMutation.mutate()}
                  disabled={changeEmailMutation.isPending || code.length !== 6 || !newEmail}
                >
                  {changeEmailMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                  {t("userSettings.security.submit")}
                </Button>
              </div>
            </>
          ) : (
            <div className="flex justify-end">
              <Button onClick={handleStartChange}>
                {t("userSettings.security.changeEmail")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      <SudoDialog open={sudoOpen} onOpenChange={setSudoOpen} onSuccess={handleSudoSuccess} />
    </>
  );
}

// ─── Change Phone Card ────────────────────────────────────────────

function ChangePhoneCard({ currentPhone, onChanged }: { currentPhone: string | null; onChanged: () => void }) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [sudoOpen, setSudoOpen] = useState(false);
  const [sudoToken, setSudoToken] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [sendingCode, setSendingCode] = useState(false);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleStartChange = () => {
    setSudoOpen(true);
  };

  const handleSudoSuccess = (token: string) => {
    setSudoToken(token);
    setEditing(true);
    setNewPhone("");
    setCode("");
    setCooldown(0);
  };

  const handleSendCode = async () => {
    if (!newPhone) return;
    setSendingCode(true);
    try {
      await userSettings.sendChangePhoneCode({ new_phone: newPhone }, sudoToken);
      toast.success(t("userSettings.security.codeSent"));
      setCooldown(60);
    } catch (err) {
      toast.error(resolveErrorMessage(err));
    } finally {
      setSendingCode(false);
    }
  };

  const changePhoneMutation = useMutation({
    mutationFn: () =>
      userSettings.changePhone({ new_phone: newPhone, new_phone_code: code }, sudoToken),
    onSuccess: () => {
      toast.success(t("userSettings.security.phoneChanged"));
      setEditing(false);
      setSudoToken("");
      onChanged();
    },
  });

  const handleCancel = () => {
    setEditing(false);
    setSudoToken("");
    setNewPhone("");
    setCode("");
    setCooldown(0);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t("userSettings.security.changePhone")}</CardTitle>
          <CardDescription>{t("userSettings.security.changePhoneDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label>{t("userSettings.security.currentPhone")}</Label>
            <p className="text-sm text-muted-foreground">
              {currentPhone || t("userSettings.security.noPhone")}
            </p>
          </div>
          {editing ? (
            <>
              <div className="grid gap-2">
                <Label>{t("userSettings.security.newPhone")}</Label>
                <Input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="+8613800138000"
                  autoFocus
                />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSendCode}
                  disabled={sendingCode || cooldown > 0 || !newPhone}
                >
                  {sendingCode && <Loader2 className="mr-2 size-4 animate-spin" />}
                  {cooldown > 0
                    ? t("userSettings.security.resendIn", { seconds: cooldown })
                    : t("userSettings.security.sendCode")}
                </Button>
              </div>
              <div className="grid gap-2">
                <VerificationCodeInput
                  value={code}
                  onChange={setCode}
                  onComplete={() => changePhoneMutation.mutate()}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleCancel}>
                  {t("common.cancel")}
                </Button>
                <Button
                  onClick={() => changePhoneMutation.mutate()}
                  disabled={changePhoneMutation.isPending || code.length !== 6 || !newPhone}
                >
                  {changePhoneMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                  {t("userSettings.security.submit")}
                </Button>
              </div>
            </>
          ) : (
            <div className="flex justify-end">
              <Button onClick={handleStartChange}>
                {t("userSettings.security.changePhone")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      <SudoDialog open={sudoOpen} onOpenChange={setSudoOpen} onSuccess={handleSudoSuccess} />
    </>
  );
}

// ─── Change Password Card ──────────────────────────────────────────

function ChangePasswordCard() {
  const { t } = useTranslation();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const changePwMutation = useMutation({
    mutationFn: (data: { old_password: string; new_password: string }) =>
      userSettings.changePassword(data),
    onSuccess: () => {
      toast.success(t("userSettings.security.passwordChanged"));
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
  });

  const handleSubmit = () => {
    if (newPassword.length < 8) {
      toast.error(t("userSettings.security.passwordMinLength"));
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t("userSettings.security.passwordMismatch"));
      return;
    }
    changePwMutation.mutate({ old_password: oldPassword, new_password: newPassword });
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
          <Button onClick={handleSubmit} disabled={changePwMutation.isPending || !oldPassword || !newPassword}>
            {changePwMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
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

  const setupMutation = useMutation({
    mutationFn: () => userSettings.get2FASetup(),
    onSuccess: (data) => {
      setSetupToken(data.setup_token);
      setUri(data.uri);
      setCode("");
      setDialogOpen(true);
    },
  });

  const verifyMutation = useMutation({
    mutationFn: (params: { setup_token: string; code: string }) =>
      userSettings.enable2FA(params),
    onSuccess: () => {
      toast.success(t("userSettings.security.twoFactorSuccess"));
      setDialogOpen(false);
      onEnabledChange();
    },
  });

  const handleEnable = () => {
    setupMutation.mutate();
  };

  const handleVerify = () => {
    if (code.length !== 6) return;
    verifyMutation.mutate({ setup_token: setupToken, code });
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
            <Button onClick={handleEnable} disabled={setupMutation.isPending}>
              {setupMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
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
              <VerificationCodeInput
                value={code}
                onChange={setCode}
                onComplete={handleVerify}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleVerify} disabled={verifyMutation.isPending || code.length !== 6}>
              {verifyMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
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
  const queryClient = useQueryClient();
  const [registering, setRegistering] = useState(false);

  // Rename dialog
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<AuthnDetailResponse | null>(null);
  const [renameName, setRenameName] = useState("");

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AuthnDetailResponse | null>(null);

  // Name dialog (after registration)
  const [nameDialogOpen, setNameDialogOpen] = useState(false);
  const [newCredentialJson, setNewCredentialJson] = useState("");
  const [newPasskeyName, setNewPasskeyName] = useState("");

  const credentialsQuery = useQuery({
    queryKey: queryKeys.userAuthns(),
    queryFn: () => userSettings.listAuthns(),
  });

  const credentials = credentialsQuery.data ?? [];

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

  const finishRegistrationMutation = useMutation({
    mutationFn: (data: { credential: string; name: string | null }) =>
      userSettings.finishPasskeyRegistration(data),
    onSuccess: () => {
      toast.success(t("userSettings.security.passkeyAdded"));
      setNameDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: queryKeys.userAuthns() });
    },
  });

  const handleFinishRegistration = () => {
    finishRegistrationMutation.mutate({
      credential: newCredentialJson,
      name: newPasskeyName.trim() || null,
    });
  };

  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      userSettings.renameAuthn(id, { name }),
    onSuccess: () => {
      toast.success(t("userSettings.security.passkeyRenamed"));
      setRenameDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: queryKeys.userAuthns() });
    },
  });

  const handleRename = () => {
    if (!renameTarget || !renameName.trim()) return;
    renameMutation.mutate({ id: renameTarget.id, name: renameName.trim() });
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => userSettings.deleteAuthn(id),
    onSuccess: () => {
      toast.success(t("userSettings.security.passkeyDeleted"));
      setDeleteDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: queryKeys.userAuthns() });
    },
  });

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id);
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
          {credentialsQuery.isLoading ? (
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
            <Button onClick={handleFinishRegistration} disabled={finishRegistrationMutation.isPending}>
              {finishRegistrationMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
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
            <Button onClick={handleRename} disabled={renameMutation.isPending || !renameName.trim()}>
              {renameMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
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
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              {t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

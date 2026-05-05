import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2, ShieldCheck, Languages, HardDrive } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Field, FieldDescription, FieldGroup, FieldLabel,
} from "@/components/ui/field";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useAuthStore } from "@/stores/auth";
import { useSiteConfigStore } from "@/stores/site-config";
import { useRequireGuest } from "@/hooks/use-auth";
import { auth, resolveErrorMessage } from "@/api";
import { ApiError } from "@/api";
import { setLocale } from "@/i18n";

type AuthMode = "login" | "register";

function getErrorMessage(e: unknown, fallback: string): string {
  if (e instanceof ApiError) return resolveErrorMessage(e);
  if (e instanceof Error) return e.message;
  return fallback;
}

const locales = [
  { code: "zh-CN", name: "简体中文" },
  { code: "en", name: "English" },
  { code: "zh-TW", name: "繁體中文" },
];

export default function SessionPage() {
  useRequireGuest();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const siteConfig = useSiteConfigStore((s) => s.config);
  const fetchSiteConfig = useSiteConfigStore((s) => s.fetch);

  const [mode, setMode] = useState<AuthMode>("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [tfaRequired, setTfaRequired] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [pendingCredentials, setPendingCredentials] = useState<{ email: string; password: string } | null>(null);

  useEffect(() => { fetchSiteConfig(); }, [fetchSiteConfig]);

  const submitLogin = useCallback(async (loginEmail: string, loginPassword: string, otp?: string) => {
    setLoading(true);
    setError("");
    try {
      const data = await auth.loginEmail({
        email: loginEmail,
        password: loginPassword,
        two_fa_code: otp || undefined,
      });
      setSession(data);
      navigate("/home", { replace: true });
    } catch (e) {
      if (e instanceof ApiError && e.is("auth.two_fa_required")) {
        setPendingCredentials({ email: loginEmail, password: loginPassword });
        setTfaRequired(true);
        setOtpCode("");
        setError("");
        return;
      }
      setError(getErrorMessage(e, t("session.loginFailedCheck")));
      if (tfaRequired) setOtpCode("");
    } finally {
      setLoading(false);
    }
  }, [setSession, navigate, t, tfaRequired]);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = z.object({
      email: z.string().min(1, t("session.emailRequired")).email(t("session.emailInvalid")),
      password: z.string().min(1, t("session.passwordRequired")),
    }).safeParse({ email, password });
    if (!result.success) { setError(result.error.issues[0]?.message ?? ""); return; }
    submitLogin(email, password);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = z.object({
      email: z.string().min(1, t("session.emailRequired")).email(t("session.emailInvalid")),
      password: z.string().min(1, t("session.passwordRequired")).min(8, t("session.passwordMinLength")),
      confirmPassword: z.string().min(1, t("session.confirmPasswordRequired")),
    }).refine((d) => d.password === d.confirmPassword, { message: t("session.passwordMismatch"), path: ["confirmPassword"] })
      .safeParse({ email, password, confirmPassword });
    if (!result.success) { setError(result.error.issues[0]?.message ?? ""); return; }

    setLoading(true);
    setError("");
    try {
      await auth.register({ email, password });
      toast.success(t("session.registerSuccess"));
      await submitLogin(email, password);
    } catch (e) {
      setError(getErrorMessage(e, t("session.registerFailed")));
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = () => {
    if (!pendingCredentials || otpCode.length !== 6) return;
    submitLogin(pendingCredentials.email, pendingCredentials.password, otpCode);
  };

  const cancelTfa = () => { setTfaRequired(false); setPendingCredentials(null); setOtpCode(""); setError(""); };
  const switchMode = (m: AuthMode) => { setMode(m); setError(""); };

  const registerEnabled = siteConfig?.register_enabled ?? false;
  const showAgreement = !!(siteConfig?.tos_url || siteConfig?.privacy_url);

  // --- Special states (full-screen centered cards) ---

  if (tfaRequired) {
    return (
      <CenteredWrapper>
        <Card className="w-full max-w-sm">
          <CardContent className="flex flex-col items-center gap-6 p-8">
            <ShieldCheck className="size-10 text-primary" />
            <div className="text-center">
              <h2 className="text-lg font-semibold">{t("session.twoFactorRequired")}</h2>
              <p className="text-sm text-muted-foreground mt-1">{t("session.twoFactorHint")}</p>
            </div>
            {error && <Alert variant="destructive" className="w-full"><AlertDescription>{error}</AlertDescription></Alert>}
            <Input
              type="text" inputMode="numeric" maxLength={6} placeholder="000000"
              className="text-center text-2xl tracking-[0.5em] font-mono"
              value={otpCode} onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              onKeyDown={(e) => { if (e.key === "Enter") handleOtpSubmit(); }}
              autoFocus disabled={loading}
            />
            <div className="flex gap-2 w-full">
              <Button variant="outline" className="flex-1" onClick={cancelTfa} disabled={loading}>{t("common.cancel")}</Button>
              <Button className="flex-1" onClick={handleOtpSubmit} disabled={loading || otpCode.length !== 6}>
                {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
                {t("session.submit")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </CenteredWrapper>
    );
  }

  // --- Main form (login-04 layout: card with form + cover image) ---
  return (
    <CenteredWrapper>
      <div className="flex flex-col gap-6 w-full max-w-sm md:max-w-4xl">
        <Card className="overflow-hidden p-0">
          <CardContent className="grid p-0 md:grid-cols-2">
            {/* Left: form */}
            <form
              className="p-6 md:p-8"
              onSubmit={mode === "login" ? handleLoginSubmit : handleRegisterSubmit}
            >
              <FieldGroup>
                <div className="flex flex-col items-center gap-2 text-center">
                  <h1 className="text-2xl font-bold">
                    {mode === "login" ? t("session.loginTitle") : t("session.registerTitle")}
                  </h1>
                  <p className="text-balance text-sm text-muted-foreground">
                    {t("session.description")}
                  </p>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {/* Email */}
                <Field>
                  <FieldLabel htmlFor="email">{t("session.email")}</FieldLabel>
                  <Input
                    id="email" type="email" placeholder={t("session.emailPlaceholder")}
                    value={email} onChange={(e) => setEmail(e.target.value)}
                    disabled={loading} autoFocus required
                  />
                </Field>

                {/* Password */}
                <Field>
                  <FieldLabel htmlFor="password">{t("session.password")}</FieldLabel>
                  <Input
                    id="password" type="password" placeholder={t("session.passwordPlaceholder")}
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    disabled={loading} required
                  />
                </Field>

                {/* Confirm password (register only) */}
                {mode === "register" && (
                  <Field>
                    <FieldLabel htmlFor="confirmPassword">{t("session.confirmPassword")}</FieldLabel>
                    <Input
                      id="confirmPassword" type="password" placeholder={t("session.confirmPasswordPlaceholder")}
                      value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={loading} required
                    />
                  </Field>
                )}

                {/* Submit */}
                <Field>
                  <Button type="submit" disabled={loading} className="w-full">
                    {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
                    {mode === "login" ? t("session.submit") : t("session.registerSubmit")}
                  </Button>
                </Field>

                {/* Mode switch links */}
                <FieldDescription className="text-center">
                  {mode === "login" && registerEnabled && (
                    <>
                      {t("session.noAccount")}{" "}
                      <button type="button" className="underline underline-offset-4 hover:text-primary" onClick={() => switchMode("register")}>
                        {t("session.registerLink")}
                      </button>
                    </>
                  )}
                  {mode === "register" && (
                    <>
                      {t("session.hasAccount")}{" "}
                      <button type="button" className="underline underline-offset-4 hover:text-primary" onClick={() => switchMode("login")}>
                        {t("session.loginLink")}
                      </button>
                    </>
                  )}
                </FieldDescription>
              </FieldGroup>
            </form>

            {/* Right: cover image / branding */}
            <div className="relative hidden bg-muted md:flex md:flex-col md:items-center md:justify-center md:gap-4 md:p-8">
              <HardDrive className="size-16 text-muted-foreground/50" />
              <div className="text-center">
                <h2 className="text-xl font-semibold text-muted-foreground/80">DiskNext</h2>
                <p className="text-sm text-muted-foreground/60 mt-1">Your personal cloud storage</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer: agreement + language */}
        <div className="flex flex-col items-center gap-2">
          {showAgreement && (
            <p className="px-6 text-center text-xs text-muted-foreground">
              {t("session.agreementText")}{" "}
              {siteConfig?.tos_url && (
                <a href={siteConfig.tos_url} target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-primary">
                  {t("session.termsOfService")}
                </a>
              )}
              {siteConfig?.tos_url && siteConfig?.privacy_url && ` ${t("session.and")} `}
              {siteConfig?.privacy_url && (
                <a href={siteConfig.privacy_url} target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-primary">
                  {t("session.privacyPolicy")}
                </a>
              )}
            </p>
          )}
          <div className="flex items-center gap-1">
            <Languages className="size-3.5 text-muted-foreground" />
            <DropdownMenu>
              <DropdownMenuTrigger className="text-xs text-muted-foreground hover:text-foreground cursor-pointer">
                {locales.find((l) => l.code === i18n.language)?.name ?? "Language"}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center">
                {locales.map((l) => (
                  <DropdownMenuItem key={l.code} onClick={() => setLocale(l.code)}>{l.name}</DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </CenteredWrapper>
  );
}

function CenteredWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10">
      {children}
    </div>
  );
}

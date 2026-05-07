import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { VerificationCodeInput } from "@/components/verification-code-input";
import { sudo, resolveErrorMessage } from "@/api";
import type { SudoMethod } from "@/api";

interface SudoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (sudoToken: string) => void;
}

const METHODS: SudoMethod[] = ["password", "email_code", "sms_code", "totp"];

export function SudoDialog({ open, onOpenChange, onSuccess }: SudoDialogProps) {
  const { t } = useTranslation();
  const [method, setMethod] = useState<SudoMethod>("password");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [sendingCode, setSendingCode] = useState(false);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setMethod("password");
      setPassword("");
      setCode("");
      setCooldown(0);
      setSendingCode(false);
    }
    onOpenChange(nextOpen);
  };

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const verifyMutation = useMutation({
    mutationFn: () => {
      const req: { method: SudoMethod; password?: string | null; code?: string | null } = { method };
      if (method === "password") {
        req.password = password;
      } else {
        req.code = code;
      }
      return sudo.verify(req);
    },
    onSuccess: (data) => {
      onSuccess(data.sudo_token);
      handleOpenChange(false);
    },
  });

  const handleSendCode = async () => {
    if (method !== "email_code" && method !== "sms_code") return;
    setSendingCode(true);
    try {
      await sudo.sendCode({ method });
      toast.success(t("sudo.codeSent"));
      setCooldown(60);
    } catch (err) {
      toast.error(resolveErrorMessage(err));
    } finally {
      setSendingCode(false);
    }
  };

  const handleSubmit = () => {
    verifyMutation.mutate();
  };

  const canSubmit = () => {
    if (method === "password") return password.length > 0;
    return code.length === 6;
  };

  const needsCode = method === "email_code" || method === "sms_code" || method === "totp";
  const needsSendCode = method === "email_code" || method === "sms_code";

  const methodLabel = (m: SudoMethod) => t(`sudo.methods.${m}`);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("sudo.title")}</DialogTitle>
          <DialogDescription>{t("sudo.description")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>{t("sudo.methodLabel")}</Label>
            <Select value={method} onValueChange={(v) => { setMethod(v as SudoMethod); setPassword(""); setCode(""); }}>
              <SelectTrigger>
                <SelectValue>{methodLabel(method)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {METHODS.map((m) => (
                  <SelectItem key={m} value={m}>{methodLabel(m)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {method === "password" && (
            <div className="grid gap-2">
              <Input
                type="password"
                placeholder={t("sudo.passwordPlaceholder")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && canSubmit()) handleSubmit(); }}
                autoFocus
              />
            </div>
          )}

          {needsCode && (
            <div className="grid gap-2">
              {needsSendCode && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-fit"
                  onClick={handleSendCode}
                  disabled={sendingCode || cooldown > 0}
                >
                  {sendingCode && <Loader2 className="mr-2 size-4 animate-spin" />}
                  {cooldown > 0
                    ? t("sudo.resendIn", { seconds: cooldown })
                    : t("sudo.sendCode")}
                </Button>
              )}
              <VerificationCodeInput
                value={code}
                onChange={setCode}
                onComplete={() => { if (canSubmit()) handleSubmit(); }}
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={verifyMutation.isPending || !canSubmit()}>
            {verifyMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            {verifyMutation.isPending ? t("sudo.verifying") : t("sudo.verify")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

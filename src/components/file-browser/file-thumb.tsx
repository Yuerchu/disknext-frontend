import { useEffect, useState } from "react";
import { http } from "@/api";
import { cn } from "@/lib/utils";

interface FileThumbProps {
  fileId: string;
  alt: string;
  className?: string;
  fallback?: React.ReactNode;
}

export function FileThumb({ fileId, alt, className, fallback }: FileThumbProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let revoke: string | null = null;
    let cancelled = false;
    setSrc(null);
    setFailed(false);

    http.get(`/api/v1/file/${fileId}/thumb`, { responseType: "blob" })
      .then((res) => {
        if (cancelled) return;
        const url = URL.createObjectURL(res.data as Blob);
        revoke = url;
        setSrc(url);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [fileId]);

  if (failed || !src) return <>{fallback}</>;

  return <img src={src} alt={alt} loading="lazy" className={cn(className)} />;
}

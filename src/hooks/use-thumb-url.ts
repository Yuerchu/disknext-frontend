import { useEffect, useState } from "react";
import { file } from "@/api";

export function useThumbUrl(id: string | null): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setUrl(null);
      return;
    }

    let revoked = false;
    let objectUrl: string | null = null;

    file.fetchThumb(id).then((blob) => {
      if (revoked) return;
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    }).catch(() => {
      if (!revoked) setUrl(null);
    });

    return () => {
      revoked = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id]);

  return url;
}

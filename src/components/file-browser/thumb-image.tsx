import { cn } from "@/lib/utils";
import { useThumbUrl } from "@/hooks/use-thumb-url";

interface ThumbImageProps {
  fileId: string;
  alt: string;
  className?: string;
}

export function ThumbImage({ fileId, alt, className }: ThumbImageProps) {
  const url = useThumbUrl(fileId);

  if (!url) return null;

  return <img src={url} alt={alt} loading="lazy" className={cn("object-cover", className)} />;
}

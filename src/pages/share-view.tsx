import { useParams } from "react-router";

export default function ShareViewPage() {
  const { code } = useParams<{ code: string }>();
  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground">Share view: {code}</p>
    </div>
  );
}

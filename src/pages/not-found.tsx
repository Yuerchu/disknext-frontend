import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
      <p className="text-muted-foreground">Page not found</p>
      <Button variant="outline" onClick={() => navigate("/home")}>
        Go Home
      </Button>
    </div>
  );
}

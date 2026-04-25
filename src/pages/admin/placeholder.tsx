import { useLocation } from "react-router";

export default function AdminPlaceholder() {
  const location = useLocation();
  const segment = location.pathname.split("/").pop();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold capitalize">{segment}</h1>
      <p className="mt-2 text-muted-foreground">This page is under construction.</p>
    </div>
  );
}

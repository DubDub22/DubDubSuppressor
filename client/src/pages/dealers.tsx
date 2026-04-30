import React from "react";
import { Loader2 } from "lucide-react";

export default function DealersPage() {
  // Redirect to dealer login page (individual accounts)
  React.useEffect(() => {
    window.location.href = "/dealer/login";
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}

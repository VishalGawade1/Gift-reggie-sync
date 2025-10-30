import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Settings } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-6">
        <h1 className="mb-4 text-4xl font-bold">Gift Reggie Wishlist Sync</h1>
        <p className="text-xl text-muted-foreground">
          Continuous sync service for student-orgs.org wishlists
        </p>
        <div className="flex gap-3 justify-center">
          <Button onClick={() => navigate("/dashboard")} size="lg">
            View Dashboard
          </Button>
          <Button onClick={() => navigate("/settings")} variant="outline" size="lg">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, ExternalLink, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Wishlist {
  id: string;
  owner_email: string | null;
  public_url: string | null;
  last_synced_at: string | null;
  first_seen_at: string;
}

interface SyncState {
  key: string;
  value: string;
  updated_at: string;
}

const WishlistDashboard = () => {
  const navigate = useNavigate();
  const [wishlists, setWishlists] = useState<Wishlist[]>([]);
  const [syncState, setSyncState] = useState<SyncState | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: wishlistData, error: wishlistError } = await supabase
        .from("wishlists")
        .select("*")
        .order("last_synced_at", { ascending: false })
        .limit(50);

      if (wishlistError) throw wishlistError;
      setWishlists(wishlistData || []);

      const { data: stateData, error: stateError } = await supabase
        .from("sync_state")
        .select("*")
        .eq("key", "last_cursor")
        .single();

      if (stateError && stateError.code !== "PGRST116") {
        console.error("Error fetching sync state:", stateError);
      } else {
        setSyncState(stateData);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch wishlist data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const triggerSync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-gift-reggie");

      if (error) throw error;

      toast({
        title: "Sync Complete",
        description: `Synced ${data.wishlists} wishlists with ${data.items} items`,
      });

      await fetchData();
    } catch (error) {
      console.error("Error triggering sync:", error);
      toast({
        title: "Sync Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gift Reggie Wishlist Sync</h1>
          <p className="text-muted-foreground mt-2">
            Monitor and sync wishlists from Gift Reggie
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/settings")}>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
          <Button onClick={triggerSync} disabled={syncing}>
            {syncing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Sync Now
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total Wishlists</CardTitle>
            <CardDescription>Currently tracked</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{wishlists.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Last Sync</CardTitle>
            <CardDescription>Most recent update</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              {syncState?.updated_at
                ? new Date(syncState.updated_at).toLocaleString()
                : "Never"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sync Status</CardTitle>
            <CardDescription>Current position</CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant={syncState?.value ? "default" : "secondary"}>
              {syncState?.value ? "In Progress" : "Complete"}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Wishlists</CardTitle>
          <CardDescription>Last 50 synced wishlists</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Last Synced</TableHead>
                <TableHead>First Seen</TableHead>
                <TableHead>Link</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {wishlists.map((wishlist) => (
                <TableRow key={wishlist.id}>
                  <TableCell className="font-mono text-xs">
                    {wishlist.id.substring(0, 8)}...
                  </TableCell>
                  <TableCell>{wishlist.owner_email || "N/A"}</TableCell>
                  <TableCell className="text-sm">
                    {wishlist.last_synced_at
                      ? new Date(wishlist.last_synced_at).toLocaleString()
                      : "Never"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {new Date(wishlist.first_seen_at).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {wishlist.public_url ? (
                      <a
                        href={wishlist.public_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-primary hover:underline"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    ) : (
                      "N/A"
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {wishlists.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No wishlists found. Click "Sync Now" to fetch data.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WishlistDashboard;

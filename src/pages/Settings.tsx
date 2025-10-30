import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Eye, EyeOff, Settings as SettingsIcon } from "lucide-react";

const formSchema = z.object({
  storeId: z.string().min(1, "Store ID is required"),
  token: z.string().min(1, "Access Token is required"),
});

type FormData = z.infer<typeof formSchema>;

const Settings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showToken, setShowToken] = useState(false);
  const [saving, setSaving] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      storeId: "",
      token: "",
    },
  });

  const onSubmit = async (data: FormData) => {
    setSaving(true);
    try {
      const { error } = await supabase.functions.invoke("update-credentials", {
        body: { storeId: data.storeId, token: data.token },
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Credentials updated successfully",
      });

      form.reset();
    } catch (error) {
      console.error("Error updating credentials:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update credentials",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <SettingsIcon className="h-6 w-6" />
            <CardTitle>Gift Reggie API Settings</CardTitle>
          </div>
          <CardDescription>
            Update your Gift Reggie API credentials. These are stored securely and encrypted.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="storeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Store ID</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your Gift Reggie Store ID" {...field} />
                    </FormControl>
                    <FormDescription>
                      Your unique Gift Reggie store identifier
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="token"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Access Token</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showToken ? "text" : "password"}
                          placeholder="Enter your Gift Reggie Access Token"
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                          onClick={() => setShowToken(!showToken)}
                        >
                          {showToken ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormDescription>
                      Your Gift Reggie API access token
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Where to find these:</strong> Log into your Gift Reggie account → Navigate to API Settings
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  <strong>Security:</strong> These credentials are encrypted and stored securely. Never share them publicly.
                </p>
              </div>

              <Button type="submit" disabled={saving} className="w-full">
                {saving ? (
                  <>Saving...</>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Credentials
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;

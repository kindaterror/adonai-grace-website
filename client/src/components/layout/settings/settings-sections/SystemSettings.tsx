import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Settings,
  Save,
  Shield,
  AlertTriangle,
  Crown,
  Loader2,
  Clock,
  Lock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "@/lib/motionShim";

type SystemSettingsProps = {
  userRole: "admin" | "teacher" | "student";
  user: any;
};

interface PlatformSettings {
  maintenanceMode: boolean;
  allowNewRegistrations: boolean;
  requireEmailVerification: boolean;
  autoApproveTeachers: boolean;
  autoApproveStudents: boolean;
  sessionTimeoutMinutes: number;
  maxLoginAttempts: number;
  requireStrongPasswords: boolean;
}

const fadeInUp = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

export function SystemSettings({ userRole }: SystemSettingsProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("access");

  const isAdmin = userRole === "admin";

  const styles = isAdmin
    ? {
        headerWrap: "bg-white rounded-2xl p-8 border border-slate-200 shadow-sm w-full mb-6",
        headerTitle: "text-2xl font-bold text-slate-900 tracking-tight",
        headerSub: "text-slate-500 font-medium",
        adminBadge: "bg-blue-50 text-blue-700 border-blue-100 font-bold tracking-wide uppercase text-[11px]",
        baseCard: "border border-slate-200 shadow-sm w-full max-w-none bg-white",
        baseHead: "border-b border-slate-100 bg-slate-50/50",
        baseTitle: "text-slate-900 font-bold",
        tabsList: "bg-slate-100 p-1 rounded-xl w-full",
        tabsTrig: "font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600",
        critCard: "border border-rose-100 bg-rose-50/50 w-full max-w-none",
        saveBtn: "w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-6 text-lg",
      }
    : {
        headerWrap: "bg-gray-800 rounded-2xl p-6 text-white shadow w-full border border-gray-700",
        headerTitle: "text-xl font-semibold",
        headerSub: "text-gray-200",
        adminBadge: "hidden",
        baseCard: "border border-gray-200 shadow-sm",
        baseHead: "bg-gray-50 border-b border-gray-200",
        baseTitle: "text-gray-900 font-semibold",
        tabsList: "grid grid-cols-2 bg-gray-100 rounded-xl",
        tabsTrig: "font-medium data-[state=active]:bg-gray-900 data-[state=active]:text-white",
        critCard: "border border-red-200 bg-red-50",
        saveBtn: "w-full bg-gray-900 hover:bg-black text-white font-semibold py-3",
      };

  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>({
    maintenanceMode: false,
    allowNewRegistrations: true,
    requireEmailVerification: true,
    autoApproveTeachers: false,
    autoApproveStudents: false,
    sessionTimeoutMinutes: 60,
    maxLoginAttempts: 5,
    requireStrongPasswords: true,
  });

  const { data: settingsData, isLoading } = useQuery({
    queryKey: ["system-settings"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/admin/system-settings", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        if (!response.ok) throw new Error("Failed to fetch system settings");
        return response.json();
      } catch (error) {
        console.error("Failed to load settings:", error);
        return { settings: null };
      }
    },
  });

  useEffect(() => {
    if (settingsData?.settings) {
      setPlatformSettings((prev) => ({ ...prev, ...settingsData.settings }));
    }
  }, [settingsData]);

  const saveSettingsMutation = useMutation({
    mutationFn: async (settings: PlatformSettings) => {
      const response = await fetch("/api/admin/system-settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
        body: JSON.stringify(settings),
      });
      if (!response.ok) throw new Error("Failed to save settings");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-settings"] });
      toast({ title: "Success", description: "System settings saved successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to save settings", variant: "destructive" });
    },
  });

  const handleToggle = (key: keyof PlatformSettings) => {
    setPlatformSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleChange = (key: keyof PlatformSettings, value: any) => {
    setPlatformSettings((prev) => ({ ...prev, [key]: value }));
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mr-3" />
        <span className="text-slate-600 font-medium">Loading system settings...</span>
      </div>
    );
  }

  return (
    <div className="w-full max-w-none space-y-6 p-6">
      <motion.div className={styles.headerWrap} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mr-4 border border-blue-100">
              <Crown className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className={styles.headerTitle}>Platform Control Center</h2>
              <p className={styles.headerSub}>Manage administrative settings and core configurations</p>
            </div>
          </div>
          <Badge className={styles.adminBadge}>Admin Only</Badge>
        </div>
      </motion.div>

      <Card className={styles.baseCard}>
        <CardHeader className={styles.baseHead}>
          <CardTitle className={`${styles.baseTitle} flex items-center`}>
            <Settings className="w-5 h-5 text-blue-600 mr-2" />
            System Configuration
          </CardTitle>
        </CardHeader>

        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className={styles.tabsList}>
              <TabsTrigger value="access" className={styles.tabsTrig}>Access Controls</TabsTrigger>
              <TabsTrigger value="security" className={styles.tabsTrig}>Security Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="access" className="space-y-4">
              <div className="grid gap-4">
                {[
                  { key: "maintenanceMode", label: "Maintenance Mode", desc: "Disable platform for all non-admins" },
                  { key: "allowNewRegistrations", label: "Allow Registrations", desc: "Enable new user account creation" },
                  { key: "requireEmailVerification", label: "Email Verification", desc: "Require users to verify email" },
                  { key: "autoApproveTeachers", label: "Auto-Approve Teachers", desc: "Instant access for new teachers" },
                  { key: "autoApproveStudents", label: "Auto-Approve Students", desc: "Instant access for new students" }
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between p-4 border rounded-lg border-slate-100 bg-slate-50/50">
                    <div>
                      <div className="font-semibold text-slate-900">{item.label}</div>
                      <div className="text-sm text-slate-500">{item.desc}</div>
                    </div>
                    <Switch checked={platformSettings[item.key as keyof PlatformSettings] as boolean} onCheckedChange={() => handleToggle(item.key as keyof PlatformSettings)} />
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="security" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="p-4 border rounded-lg border-slate-100">
                  <label className="block text-sm font-semibold text-slate-900 mb-2">Session Timeout (minutes)</label>
                  <Input type="number" value={platformSettings.sessionTimeoutMinutes} onChange={(e) => handleChange("sessionTimeoutMinutes", parseInt(e.target.value))} />
                </div>
                <div className="p-4 border rounded-lg border-slate-100">
                  <label className="block text-sm font-semibold text-slate-900 mb-2">Max Login Attempts</label>
                  <Input type="number" value={platformSettings.maxLoginAttempts} onChange={(e) => handleChange("maxLoginAttempts", parseInt(e.target.value))} />
                </div>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg border-slate-100 bg-slate-50/50">
                <div className="font-semibold text-slate-900">Strong Password Requirement</div>
                <Switch checked={platformSettings.requireStrongPasswords} onCheckedChange={() => handleToggle("requireStrongPasswords")} />
              </div>
            </TabsContent>
          </Tabs>

          <div className="pt-8 mt-8 border-t border-slate-100">
            <Button onClick={() => saveSettingsMutation.mutate(platformSettings)} disabled={saveSettingsMutation.isPending} className={styles.saveBtn}>
              {saveSettingsMutation.isPending ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
              Save Platform Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default SystemSettings;
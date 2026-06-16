import { useAuth } from "@/contexts/AuthContext";
import SettingsLayout from "@/components/layout/settings/SettingsLayout";
import { useEffect } from "react";
import { useRouter } from "next/router";

export default function AdminSettings() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login");
      } else if (user.role !== "admin") {
        router.push("/dashboard");
      }
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans">
        <div className="text-center flex flex-col items-center">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-200 border-t-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-500 font-medium">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return null;
  }

  return <SettingsLayout userRole="admin" />;
}
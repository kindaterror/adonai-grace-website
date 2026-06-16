import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import SettingsSidebar from "./SettingsSidebar";
import SettingsContent from "./SettingsContent";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

type SettingsLayoutProps = {
  userRole: "admin" | "teacher" | "student";
}

export function SettingsLayout({ userRole }: SettingsLayoutProps) {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState("profile");
  const [, navigate] = useLocation();

  // == Role-based theme classes ==
  const getThemeClasses = () => {
    switch (userRole) {
      case "admin":
        return {
          container: "bg-slate-50 font-sans",
          header: "bg-white border-slate-200",
          headerText: "text-slate-900 tracking-tight",
          subtitleText: "text-slate-500 font-medium",
          userMetaText: "text-slate-500",
          accent: "text-blue-600",
          sidebarBg: "bg-slate-50/50",
          sidebarBorder: "border-slate-200",
          contentBg: "bg-white",
          backButton: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-sm"
        };
      case "teacher":
        return {
          container: "bg-gradient-to-br from-brand-navy-50 to-ilaw-white",
          header: "bg-ilaw-white border-brand-navy-200",
          accent: "text-brand-navy-600",
          sidebarBg: "bg-brand-navy-50",
          contentBg: "bg-ilaw-white",
          backButton: "border-2 border-brand-navy-300 text-brand-navy-600 hover:bg-brand-navy-50"
        };
      case "student":
        return {
          container: "bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50",
          header: "bg-gradient-to-r from-amber-100 to-orange-100 border-amber-300",
          accent: "text-amber-600",
          sidebarBg: "bg-gradient-to-b from-amber-100 to-orange-100",
          contentBg: "bg-gradient-to-br from-white to-amber-50",
          backButton: "border-2 border-amber-300 text-amber-700 hover:bg-amber-50"
        };
      default:
        return {
          container: "bg-ilaw-white",
          header: "bg-ilaw-white border-gray-200",
          accent: "text-ilaw-navy",
          sidebarBg: "bg-gray-50",
          contentBg: "bg-ilaw-white",
          backButton: "border-2 border-gray-300 text-gray-600 hover:bg-gray-50"
        };
    }
  };

  const themeClasses = getThemeClasses();

  // == Get dashboard route based on role == 
  const getDashboardRoute = () => {
    switch (userRole) {
      case "admin":
        return "/admin";
      case "teacher":
        return "/teacher";
      case "student":
        return "/student";
      default:
        return "/";
    }
  };

  return (
    <div className={`h-screen overflow-hidden ${themeClasses.container}`}>
      {/* == FIXED HEADER == */}
      <div className={`fixed top-0 left-0 right-0 z-50 ${userRole === 'admin' ? 'border-b' : 'border-b-2'} ${themeClasses.header} px-6 py-4 shadow-sm`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`text-2xl font-bold ${themeClasses.headerText || 'text-ilaw-navy'}`}>Account Settings</h1>
            <p className={`mt-1 ${themeClasses.subtitleText || 'text-gray-600'}`}>Manage your account preferences and security settings</p>
            {user && (
              <div className={`flex items-center mt-2 text-sm ${themeClasses.userMetaText || 'text-gray-500'}`}>
                <span className="font-medium">{user.firstName} {user.lastName}</span>
                <span className="mx-2">•</span>
                <span className="capitalize">{userRole}</span>
              </div>
            )}
          </div>
          
          {/* == Back to Dashboard Button == */}
          <button
            onClick={() => navigate(getDashboardRoute())}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${themeClasses.backButton}`}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </button>
        </div>
      </div>

      {/* == Main Content with Top Padding == */}
      <div className="flex h-full pt-32">
        {/* == Fixed Sidebar == */}
        <div className={`w-80 ${themeClasses.sidebarBg} ${userRole === 'admin' ? `border-r ${themeClasses.sidebarBorder}` : 'border-r-2 border-gray-200'} h-full overflow-y-auto`}>
          <SettingsSidebar 
            userRole={userRole} 
            activeSection={activeSection} 
            setActiveSection={setActiveSection} 
          />
        </div>

        {/* == Scrollable Content Area == */}
        <div className={`flex-1 ${themeClasses.contentBg} h-full overflow-y-auto`}>
          <SettingsContent 
            userRole={userRole} 
            activeSection={activeSection} 
            user={user} 
          />
        </div>
      </div>
    </div>
  );
}

export default SettingsLayout;
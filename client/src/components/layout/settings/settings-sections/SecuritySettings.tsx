import { useState } from "react";
import {
  Lock,
  Save,
  Shield,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "@/lib/motionShim";

type SecuritySettingsProps = {
  userRole: "admin" | "teacher" | "student";
  user: any;
};

const fadeInUp = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 }
};

export function SecuritySettings({ userRole, user }: SecuritySettingsProps) {
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const isAdmin = userRole === "admin";

  // Role-based styling (admin updated to clean slate theme)
  const styles = isAdmin
    ? {
        card: "border border-slate-200 bg-white rounded-2xl shadow-sm overflow-hidden",
        header: "bg-slate-50 px-6 py-5 flex items-center justify-between border-b border-slate-100",
        headline: "text-lg font-bold text-slate-900 tracking-tight",
        sub: "text-slate-500 text-sm font-medium",
        pill: "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100 text-[11px] font-bold tracking-wide uppercase",
        field: "w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all",
        button: "bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition-all",
        infoPanel: "bg-slate-50 border border-slate-200",
        infoTitle: "text-slate-900 font-semibold",
        infoText: "text-slate-600"
      }
    : {
        card: "border border-gray-200 bg-white rounded-xl shadow-sm overflow-hidden",
        header: "bg-gray-50 px-6 py-4",
        headline: "text-lg font-semibold",
        sub: "text-gray-500 text-sm",
        pill: "hidden",
        field: "w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ilaw-navy/40",
        button: "bg-ilaw-navy hover:bg-ilaw-navy-600 text-white",
        infoPanel: "bg-blue-50 border border-blue-200",
        infoTitle: "text-blue-800",
        infoText: "text-blue-700"
      };

  // Password validation
  const validatePassword = (password: string) => {
    const minLength = password.length >= 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    return {
      isValid: minLength && hasUpper && hasLower && hasNumber && hasSpecial,
      requirements: { minLength, hasUpper, hasLower, hasNumber, hasSpecial }
    };
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (saveStatus !== "idle") {
      setSaveStatus("idle");
      setErrorMessage("");
    }
  };

  const handlePasswordUpdate = async () => {
    if (!formData.currentPassword) {
      setSaveStatus("error");
      setErrorMessage("Current password is required");
      return;
    }
    if (!formData.newPassword) {
      setSaveStatus("error");
      setErrorMessage("New password is required");
      return;
    }
    if (formData.newPassword !== formData.confirmPassword) {
      setSaveStatus("error");
      setErrorMessage("New passwords do not match");
      return;
    }
    const pv = validatePassword(formData.newPassword);
    if (!pv.isValid) {
      setSaveStatus("error");
      setErrorMessage("New password does not meet security requirements");
      return;
    }
    if (formData.currentPassword === formData.newPassword) {
      setSaveStatus("error");
      setErrorMessage("New password must be different from current password");
      return;
    }

    setIsLoading(true);
    setSaveStatus("idle");
    setErrorMessage("");

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/user/password", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword
        })
      });

      const data = await response.json();

      if (data.success) {
        setSaveStatus("success");
        setFormData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      } else {
        setSaveStatus("error");
        setErrorMessage(data.message || "Failed to update password");
      }
    } catch (error) {
      setSaveStatus("error");
      setErrorMessage("Network error. Please check your connection.");
      console.error("Update password error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = (field: "current" | "new" | "confirm") => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const passwordValidation = validatePassword(formData.newPassword);
  const passwordsMatch = formData.newPassword === formData.confirmPassword;

  return (
    <motion.div
      className={styles.card}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <div className={styles.header}>
        <div className="flex items-center gap-3">
          <div>
            <h2 className={styles.headline}>
              {isAdmin ? "Security Settings" : "Password & Security"}
            </h2>
            <p className={styles.sub}>
              {isAdmin
                ? "Keep your admin account secure."
                : "Update your password and security preferences."}
            </p>
          </div>
        </div>

        {isAdmin && (
          <span className={styles.pill}>
            <Shield className="w-3 h-3" />
            ADMIN
          </span>
        )}
      </div>

      <div className="p-6">
        <AnimatePresence mode="wait">
          {saveStatus === "success" && (
            <motion.div
              key="ok"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="mb-6 p-3 bg-emerald-50 border border-emerald-100 rounded-lg flex items-center text-emerald-800 text-sm font-medium"
            >
              <CheckCircle className="w-4 h-4 text-emerald-600 mr-2" />
              Password updated successfully.
            </motion.div>
          )}
          {saveStatus === "error" && (
            <motion.div
              key="err"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="mb-6 p-3 bg-rose-50 border border-rose-100 rounded-lg flex items-center text-rose-800 text-sm font-medium"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 mr-2" />
              {errorMessage}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-6">
          <motion.div variants={fadeInUp} initial="hidden" animate="visible">
            <label className="block text-sm font-semibold text-slate-700 mb-2">Current Password</label>
            <div className="relative">
              <input
                type={showPasswords.current ? "text" : "password"}
                value={formData.currentPassword}
                onChange={e => handleInputChange("currentPassword", e.target.value)}
                className={`${styles.field} pr-12`}
                placeholder="Enter current password"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility("current")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPasswords.current ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </motion.div>

          <motion.div variants={fadeInUp} initial="hidden" animate="visible" transition={{ delay: 0.05 }}>
            <label className="block text-sm font-semibold text-slate-700 mb-2">New Password</label>
            <div className="relative">
              <input
                type={showPasswords.new ? "text" : "password"}
                value={formData.newPassword}
                onChange={e => handleInputChange("newPassword", e.target.value)}
                className={`${styles.field} pr-12`}
                placeholder="Enter new password"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility("new")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPasswords.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </motion.div>

          <motion.div variants={fadeInUp} initial="hidden" animate="visible" transition={{ delay: 0.08 }}>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Confirm New Password</label>
            <div className="relative">
              <input
                type={showPasswords.confirm ? "text" : "password"}
                value={formData.confirmPassword}
                onChange={e => handleInputChange("confirmPassword", e.target.value)}
                className={`${styles.field} pr-12`}
                placeholder="Confirm new password"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility("confirm")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPasswords.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </motion.div>

          {formData.newPassword && (
            <motion.div variants={fadeInUp} className={`${styles.infoPanel} rounded-lg p-4`}>
              <h3 className={`text-sm mb-2 ${styles.infoTitle}`}>Password Strength</h3>
              <div className="grid grid-cols-2 gap-2">
                <Req ok={passwordValidation.requirements.minLength} text="Min 8 chars" />
                <Req ok={passwordValidation.requirements.hasUpper} text="Uppercase" />
                <Req ok={passwordValidation.requirements.hasLower} text="Lowercase" />
                <Req ok={passwordValidation.requirements.hasNumber} text="Number" />
                <Req ok={passwordValidation.requirements.hasSpecial} text="Special char" />
              </div>
            </motion.div>
          )}

          <motion.button
            variants={fadeInUp}
            onClick={handlePasswordUpdate}
            disabled={isLoading || !passwordValidation.isValid || !passwordsMatch || !formData.currentPassword}
            className={`px-6 py-2.5 rounded-lg ${styles.button} flex items-center justify-center min-w-[160px] disabled:opacity-50`}
            whileTap={{ scale: 0.98 }}
          >
            {isLoading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Updating...</>
            ) : (
              <><Save className="w-4 h-4 mr-2" /> Update Password</>
            )}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

function Req({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div className={`flex items-center text-[12px] ${ok ? "text-emerald-700" : "text-slate-500"}`}>
      <div className={`w-1.5 h-1.5 rounded-full mr-2 ${ok ? "bg-emerald-600" : "bg-slate-300"}`} />
      {text}
    </div>
  );
}

export default SecuritySettings;
import { useState, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  User,
  Upload,
  Save,
  Loader,
  CheckCircle,
  AlertCircle,
  XCircle,
  Trash2,
  Shield,
  Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "@/lib/motionShim";

type ProfileSettingsProps = {
  userRole: "admin" | "teacher" | "student";
  user: {
    id: number;
    firstName?: string;
    lastName?: string;
    email?: string;
    avatar?: string | null;
  } | null;
};

type ProfileResponse = {
  success: boolean;
  profile?: {
    id: number;
    name: string;
    email: string;
    bio: string;
    avatar: string | null;
  };
  message?: string;
};

const fadeInUp = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 }
};

export function ProfileSettings({ userRole, user }: ProfileSettingsProps) {
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    email: user?.email || "",
    bio: ""
  });

  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  // Avatar states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatar ?? null);

  // local preview while uploading
  const previewUrl = useMemo(() => (selectedFile ? URL.createObjectURL(selectedFile) : null), [selectedFile]);
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Load profile on mount
  useEffect(() => {
    void loadProfileData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadProfileData = async () => {
    try {
      setIsLoadingProfile(true);
      const token = localStorage.getItem("token") || "";
      const res = await fetch("/api/user/profile", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      const data: ProfileResponse = await res.json();

      if (data.success && data.profile) {
        const [firstName, ...rest] = (data.profile.name || "").split(" ");
        setFormData({
          firstName: firstName ?? "",
          lastName: rest.join(" "),
          email: data.profile.email || "",
          bio: data.profile.bio || ""
        });
        setAvatarUrl(data.profile.avatar ?? null);
      } else if (!data.success) {
        setSaveStatus("error");
        setErrorMessage(data.message || "Failed to load profile");
      }
    } catch (err) {
      console.error("Failed to load profile data:", err);
      setSaveStatus("error");
      setErrorMessage("Failed to load profile");
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const allowedMimes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!allowedMimes.includes(file.type)) {
      setSaveStatus("error");
      setErrorMessage("Please select a valid image (JPEG, PNG, GIF, or WebP).");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setSaveStatus("error");
      setErrorMessage("File size must be less than 2MB.");
      return;
    }

    setSelectedFile(file);
    void handleUpload(file);
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    setSaveStatus("idle");
    setErrorMessage("");

    try {
      const token = localStorage.getItem("token") || "";
      const fd = new FormData();
      fd.append("avatar", file);

      const res = await fetch("/api/user/avatar", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: fd
      });

      const result = await res.json();

      if (!res.ok || !result?.success) {
        throw new Error(result?.message || "Upload failed");
      }

      setSaveStatus("success");
      setAvatarUrl(result.avatarUrl as string);
      setSelectedFile(null);

      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    } catch (err) {
      console.error("Upload error:", err);
      setSaveStatus("error");
      setErrorMessage("Failed to upload avatar. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  // Strong admin theme (slate/clean) & subtle anims
  const styles =
    userRole === "admin"
      ? {
          card: "border border-slate-200 bg-white rounded-2xl shadow-sm overflow-hidden",
          header: "bg-slate-50 px-6 py-5 flex items-center justify-between border-b border-slate-100",
          headline: "text-lg font-bold text-slate-900 tracking-tight",
          sub: "text-slate-500 text-sm font-medium",
          pill: "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100 text-[11px] font-bold tracking-wide uppercase",
          button: "bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition-all",
          secondaryBtn: "border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium",
          field: "w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all",
          avatarRing: "ring-2 ring-slate-100 ring-offset-2"
        }
      : {
          card: "border border-gray-200 bg-white rounded-xl shadow-sm overflow-hidden",
          header: "bg-gray-50 px-6 py-4",
          headline: "text-lg font-semibold",
          sub: "text-gray-500 text-sm",
          pill: "hidden",
          button: "bg-ilaw-navy hover:bg-ilaw-navy-600 text-white",
          secondaryBtn: "border border-gray-200 text-gray-700 hover:bg-gray-50",
          field: "w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ilaw-navy/40",
          avatarRing: ""
        };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (saveStatus !== "idle") {
      setSaveStatus("idle");
      setErrorMessage("");
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    setSaveStatus("idle");
    setErrorMessage("");

    try {
      const token = localStorage.getItem("token") || "";
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: `${formData.firstName} ${formData.lastName}`.trim(),
          email: formData.email,
          bio: formData.bio,
          avatar: avatarUrl
        })
      });

      const data = await res.json();
      if (res.ok && data?.success) {
        setSaveStatus("success");
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      } else {
        setSaveStatus("error");
        setErrorMessage(data?.message || "Failed to save profile");
      }
    } catch (err) {
      console.error("Save profile error:", err);
      setSaveStatus("error");
      setErrorMessage("Network error. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setIsLoading(true);
    setSaveStatus("idle");
    setErrorMessage("");
    try {
      const token = localStorage.getItem("token") || "";
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: `${formData.firstName} ${formData.lastName}`.trim(),
          email: formData.email,
          bio: formData.bio,
          avatar: null
        })
      });
      const data = await res.json();
      if (res.ok && data?.success) {
        setAvatarUrl(null);
        setSelectedFile(null);
        setSaveStatus("success");
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      } else {
        setSaveStatus("error");
        setErrorMessage(data?.message || "Failed to remove avatar");
      }
    } catch (err) {
      console.error("Remove avatar error:", err);
      setSaveStatus("error");
      setErrorMessage("Failed to remove avatar.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingProfile) {
    return (
      <div className="p-6 flex items-center justify-center text-slate-500 font-medium">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading profile...
      </div>
    );
  }

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
              {userRole === "admin" ? "Admin Profile Settings" : "Profile Settings"}
            </h2>
            <p className={styles.sub}>
              {userRole === "admin"
                ? "Manage your identity and contact details."
                : "Update your profile information."}
            </p>
          </div>
        </div>

        {userRole === "admin" && (
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
              {uploading ? "Avatar updated!" : "Changes saved successfully."}
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

        <div className="space-y-8">
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            className="flex items-center gap-6"
          >
            <div className={`w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center overflow-hidden border border-slate-200 ${styles.avatarRing}`}>
              {previewUrl ? (
                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
              ) : avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                  onError={() => setAvatarUrl(null)}
                />
              ) : (
                <User className="w-8 h-8 text-slate-400" />
              )}
            </div>

            <div className="flex flex-col gap-2">
              <input
                type="file"
                id="avatar-upload"
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                className="hidden"
                onChange={handleFileSelect}
              />
              <label
                htmlFor="avatar-upload"
                className={`inline-flex items-center px-4 py-2 rounded-lg cursor-pointer text-sm font-medium transition-all ${styles.button} ${uploading ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {uploading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading...</>
                ) : (
                  <><Upload className="w-4 h-4 mr-2" /> Change Photo</>
                )}
              </label>

              {avatarUrl && !uploading && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium text-rose-600 hover:bg-rose-50 transition"
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Remove
                </button>
              )}
            </div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">First Name</label>
              <input
                type="text"
                value={formData.firstName}
                onChange={e => handleInputChange("firstName", e.target.value)}
                className={styles.field}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Last Name</label>
              <input
                type="text"
                value={formData.lastName}
                onChange={e => handleInputChange("lastName", e.target.value)}
                className={styles.field}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Email Address</label>
            <input
              type="email"
              value={formData.email}
              onChange={e => handleInputChange("email", e.target.value)}
              className={styles.field}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Bio</label>
            <textarea
              value={formData.bio}
              onChange={e => handleInputChange("bio", e.target.value)}
              rows={4}
              className={`${styles.field} resize-none`}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={isLoading || uploading}
              className={`px-6 py-2.5 rounded-lg flex items-center justify-center font-semibold text-sm transition-all ${styles.button} disabled:opacity-50`}
            >
              {isLoading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
              ) : (
                <><Save className="w-4 h-4 mr-2" /> Save Changes</>
              )}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default ProfileSettings;
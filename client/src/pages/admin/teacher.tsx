// src/pages/admin/teacher.tsx

// == IMPORTS & DEPENDENCIES ==
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import Header from "@/components/layout/Header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search,
  ChevronLeft,
  CheckCircle,
  XCircle,
  GraduationCap,
  Users,
  UserCheck,
  Loader2,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { AvatarImg } from "@/components/ui/media";

// ✨ animations
import { motion, AnimatePresence } from "@/lib/motionShim";

// == TYPES ==
type Teacher = {
  id: number;
  firstName?: string;
  lastName?: string;
  username?: string;
  email?: string;
  createdAt?: string;
  avatar?: string | null;          // may be null
  rejectionReason?: string | null; // for rejected tab
};

type TeachersResponse = {
  teachers: Teacher[];
};

// simple variants reused across sections
const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};
const fade = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
};

// == ADMIN TEACHER COMPONENT ==
export default function AdminTeacher() {
  // == HOOKS & STATE ==
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [selectedTeacherId, setSelectedTeacherId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"approved" | "pending" | "rejected">("approved");

  // == DATA FETCHING ==
  const { data: teachersData, isLoading } = useQuery<TeachersResponse>({
    queryKey: ["teachers", activeTab, searchQuery],
    queryFn: async () => {
      const response = await fetch(
        `/api/teachers?status=${activeTab}${
          searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ""
        }`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      if (!response.ok) throw new Error("Failed to fetch teachers");
      return response.json();
    },
  });

  const { data: pendingTeachersData } = useQuery<TeachersResponse>({
    queryKey: ["teachers", "pending"],
    queryFn: async () => {
      const response = await fetch("/api/teachers?status=pending", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!response.ok) throw new Error("Failed to fetch pending teachers");
      return response.json();
    },
  });

  // == MUTATIONS ==
  const approveMutation = useMutation({
    mutationFn: async (teacherId: number) => {
      const response = await fetch(`/api/teachers/${teacherId}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({}),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to approve teacher: ${response.status} ${response.statusText} ${errorText || ""}`
        );
      }
      const text = await response.text();
      try {
        return text ? JSON.parse(text) : {};
      } catch {
        return {};
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      toast({
        title: "Success",
        description: "Teacher account has been approved",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err?.message || "Failed to approve teacher account",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ teacherId, reason }: { teacherId: number; reason: string }) => {
      const response = await fetch(`/api/teachers/${teacherId}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ reason }),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to reject teacher: ${response.status} ${response.statusText} ${errorText || ""}`
        );
      }
      const text = await response.text();
      try {
        return text ? JSON.parse(text) : {};
      } catch {
        return {};
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      setIsRejectDialogOpen(false);
      setRejectionReason("");
      toast({
        title: "Success",
        description: "Teacher account has been rejected",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err?.message || "Failed to reject teacher account",
        variant: "destructive",
      });
    },
  });

  // == EVENT HANDLERS ==
  const handleApproveTeacher = (teacherId: number) => approveMutation.mutate(teacherId);
  const handleRejectTeacher = (teacherId: number) => {
    setSelectedTeacherId(teacherId);
    setIsRejectDialogOpen(true);
  };
  const handleRejectSubmit = () => {
    if (selectedTeacherId !== null) {
      rejectMutation.mutate({ teacherId: selectedTeacherId, reason: rejectionReason });
    }
  };

  // == COMPUTED VALUES ==
  const pendingCount = pendingTeachersData?.teachers?.length || 0;
  const teachers: Teacher[] = teachersData?.teachers ?? [];

  // == RENDER COMPONENT ==
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans">
      <Header variant="admin" />

      {/* == Header Banner == */}
      <div className="bg-white border-b border-slate-200 py-8 relative">
        <div className="container mx-auto px-4">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="flex items-center justify-center mb-3"
          >
            <GraduationCap className="h-8 w-8 text-blue-600 mr-3" />
            <span className="text-sm font-bold text-slate-900 tracking-wider">
              ADONAI AND GRACE INC.
            </span>
          </motion.div>
          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-3xl font-bold text-slate-900 text-center tracking-tight"
          >
            👨‍🏫 Teacher Management
          </motion.h1>
          <motion.p
            variants={fade}
            initial="hidden"
            animate="visible"
            className="text-slate-500 text-center mt-2 font-medium"
          >
            Manage educator accounts and approvals
          </motion.p>
        </div>
      </div>

      <main className="flex-grow p-4 md:p-6">
        <div className="container mx-auto max-w-7xl">
          {/* == Back == */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
            <div className="flex flex-col md:flex-row md:items-center gap-2">
              <motion.div whileHover={{ y: -2 }} whileTap={{ y: 0 }}>
                <Link href="/admin">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border border-slate-200 text-slate-700 hover:bg-slate-50 mt-2 md:mt-0 transition shadow-sm font-medium"
                  >
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Back to Dashboard
                  </Button>
                </Link>
              </motion.div>
            </div>
          </div>

          {/* == Search == */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="border border-slate-200 bg-white rounded-2xl shadow-sm mb-6"
          >
            <div className="border-b border-slate-100 p-5 bg-slate-50/50 rounded-t-2xl">
              <h3 className="text-lg font-bold text-slate-900 flex items-center">
                <Users className="h-5 w-5 text-blue-600 mr-2.5" />
                🔍 Search Teachers
              </h3>
            </div>
            <div className="p-5">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <Input
                  placeholder="Search teachers..."
                  className="pl-10 border border-slate-200 focus:border-blue-500 shadow-sm transition-colors"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </motion.div>

          {/* == Directory == */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="border border-slate-200 bg-white rounded-2xl shadow-sm"
          >
            <div className="border-b border-slate-100 p-5 bg-slate-50/50 rounded-t-2xl">
              <h3 className="text-lg font-bold text-slate-900 flex items-center">
                <UserCheck className="h-5 w-5 text-blue-600 mr-2.5" />
                👨‍🏫 Teacher Directory
              </h3>
            </div>

            <div className="p-5">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <Tabs
                    defaultValue="approved"
                    value={activeTab}
                    onValueChange={(v) => setActiveTab(v as typeof activeTab)}
                    className="space-y-6"
                  >
                    <TabsList className="grid grid-cols-3 bg-slate-100/80 p-1.5 rounded-xl border border-slate-200/60 shadow-sm">
                      <TabsTrigger
                        value="approved"
                        className="data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm text-slate-600 font-medium transition-all rounded-lg py-2"
                      >
                        ✅ Approved Teachers
                      </TabsTrigger>
                      <TabsTrigger
                        value="pending"
                        className="relative data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm text-slate-600 font-medium transition-all rounded-lg py-2"
                      >
                        ⏳ Pending Approval
                        {pendingCount > 0 && (
                          <Badge variant="destructive" className="ml-2 absolute -top-2.5 -right-2.5 shadow-sm">
                            {pendingCount}
                          </Badge>
                        )}
                      </TabsTrigger>
                      <TabsTrigger
                        value="rejected"
                        className="data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm text-slate-600 font-medium transition-all rounded-lg py-2"
                      >
                        ❌ Rejected
                      </TabsTrigger>
                    </TabsList>

                    {/* == Approved == */}
                    <TabsContent value="approved" className="space-y-0 border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-b border-slate-200 bg-slate-50">
                              <TableHead className="font-semibold text-slate-700">👤 Name</TableHead>
                              <TableHead className="font-semibold text-slate-700">📧 Email</TableHead>
                              <TableHead className="font-semibold text-slate-700">👤 Username</TableHead>
                              <TableHead className="font-semibold text-slate-700">📅 Join Date</TableHead>
                              <TableHead className="font-semibold text-slate-700 text-center">⚙️ Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {isLoading ? (
                              <TableRow>
                                <TableCell colSpan={5} className="text-center py-10 text-slate-500 font-medium bg-white">
                                  <span className="inline-flex items-center gap-2">
                                    <Loader2 className="h-5 w-5 animate-spin" /> Loading teachers...
                                  </span>
                                </TableCell>
                              </TableRow>
                            ) : teachers.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={5} className="text-center py-10 text-slate-500 bg-white">
                                  👨‍🏫 No approved teachers found
                                </TableCell>
                              </TableRow>
                            ) : (
                              teachers.map((teacher) => (
                                <TableRow
                                  key={teacher.id}
                                  className="border-b border-slate-100 bg-white hover:bg-slate-50 transition-colors"
                                >
                                  <TableCell>
                                    <div className="flex items-center">
                                      <div className="mr-3">
                                        <AvatarImg
                                          url={teacher.avatar || null}
                                          firstName={teacher.firstName}
                                          lastName={teacher.lastName}
                                          size={40}
                                          className="border border-slate-200 shadow-sm"
                                        />
                                      </div>
                                      <div>
                                        <div className="text-slate-900 font-medium">
                                          {teacher.firstName} {teacher.lastName}
                                        </div>
                                        <div className="text-xs text-slate-500 mt-0.5">@{teacher.username}</div>
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-slate-600 text-sm">{teacher.email}</TableCell>
                                  <TableCell className="text-slate-600 text-sm">{teacher.username}</TableCell>
                                  <TableCell className="text-slate-600 text-sm">
                                    {teacher.createdAt ? new Date(teacher.createdAt).toLocaleDateString() : "N/A"}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <div className="flex items-center justify-center space-x-2">
                                      <motion.button
                                        whileHover={{ scale: 1.03 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="inline-flex items-center text-rose-600 bg-white border border-rose-200 hover:bg-rose-50 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors shadow-sm"
                                        onClick={() => handleRejectTeacher(teacher.id)}
                                        disabled={rejectMutation.isPending}
                                      >
                                        <XCircle className="h-4 w-4 mr-1.5" />
                                        Reject
                                      </motion.button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </TabsContent>

                    {/* == Pending == */}
                    <TabsContent value="pending" className="space-y-0 border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-b border-slate-200 bg-slate-50">
                              <TableHead className="font-semibold text-slate-700">👤 Name</TableHead>
                              <TableHead className="font-semibold text-slate-700">📧 Email</TableHead>
                              <TableHead className="font-semibold text-slate-700">👤 Username</TableHead>
                              <TableHead className="font-semibold text-slate-700">📅 Join Date</TableHead>
                              <TableHead className="font-semibold text-slate-700 text-center">⚙️ Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {isLoading ? (
                              <TableRow>
                                <TableCell colSpan={5} className="text-center py-10 text-slate-500 font-medium bg-white">
                                  <span className="inline-flex items-center gap-2">
                                    <Loader2 className="h-5 w-5 animate-spin" /> Loading pending teachers...
                                  </span>
                                </TableCell>
                              </TableRow>
                            ) : teachers.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={5} className="text-center py-10 text-slate-500 bg-white">
                                  ⏳ No pending teachers found
                                </TableCell>
                              </TableRow>
                            ) : (
                              teachers.map((teacher) => (
                                <TableRow
                                  key={teacher.id}
                                  className="border-b border-slate-100 bg-white hover:bg-slate-50 transition-colors"
                                >
                                  <TableCell>
                                    <div className="flex items-center">
                                      <div className="mr-3">
                                        <AvatarImg
                                          url={teacher.avatar || null}
                                          firstName={teacher.firstName}
                                          lastName={teacher.lastName}
                                          size={40}
                                          className="border border-slate-200 shadow-sm"
                                        />
                                      </div>
                                      <div>
                                        <div className="text-slate-900 font-medium">
                                          {teacher.firstName} {teacher.lastName}
                                        </div>
                                        <div className="text-xs text-slate-500 mt-0.5">@{teacher.username}</div>
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-slate-600 text-sm">{teacher.email}</TableCell>
                                  <TableCell className="text-slate-600 text-sm">{teacher.username}</TableCell>
                                  <TableCell className="text-slate-600 text-sm">
                                    {teacher.createdAt ? new Date(teacher.createdAt).toLocaleDateString() : "N/A"}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <div className="flex items-center justify-center space-x-2">
                                      <motion.button
                                        whileHover={{ scale: 1.03 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="inline-flex items-center text-emerald-600 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors shadow-sm"
                                        onClick={() => handleApproveTeacher(teacher.id)}
                                        disabled={approveMutation.isPending}
                                      >
                                        {approveMutation.isPending && selectedTeacherId === teacher.id ? (
                                          <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                                        ) : (
                                          <CheckCircle className="h-4 w-4 mr-1.5" />
                                        )}
                                        Approve
                                      </motion.button>
                                      <motion.button
                                        whileHover={{ scale: 1.03 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="inline-flex items-center text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 hover:border-rose-300 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors shadow-sm"
                                        onClick={() => handleRejectTeacher(teacher.id)}
                                        disabled={rejectMutation.isPending}
                                      >
                                        <XCircle className="h-4 w-4 mr-1.5" />
                                        Reject
                                      </motion.button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </TabsContent>

                    {/* == Rejected == */}
                    <TabsContent value="rejected" className="space-y-0 border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-b border-slate-200 bg-slate-50">
                              <TableHead className="font-semibold text-slate-700">👤 Name</TableHead>
                              <TableHead className="font-semibold text-slate-700">📧 Email</TableHead>
                              <TableHead className="font-semibold text-slate-700">👤 Username</TableHead>
                              <TableHead className="font-semibold text-slate-700">❌ Rejection Reason</TableHead>
                              <TableHead className="font-semibold text-slate-700 text-center">⚙️ Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {isLoading ? (
                              <TableRow>
                                <TableCell colSpan={5} className="text-center py-10 text-slate-500 font-medium bg-white">
                                  <span className="inline-flex items-center gap-2">
                                    <Loader2 className="h-5 w-5 animate-spin" /> Loading rejected teachers...
                                  </span>
                                </TableCell>
                              </TableRow>
                            ) : teachers.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={5} className="text-center py-10 text-slate-500 bg-white">
                                  ❌ No rejected teachers found
                                </TableCell>
                              </TableRow>
                            ) : (
                              teachers.map((teacher) => (
                                <TableRow
                                  key={teacher.id}
                                  className="border-b border-slate-100 bg-white hover:bg-slate-50 transition-colors"
                                >
                                  <TableCell>
                                    <div className="flex items-center">
                                      <div className="mr-3">
                                        <AvatarImg
                                          url={teacher.avatar || null}
                                          firstName={teacher.firstName}
                                          lastName={teacher.lastName}
                                          size={40}
                                          className="border border-slate-200 shadow-sm opacity-80 grayscale"
                                        />
                                      </div>
                                      <div>
                                        <div className="text-slate-900 font-medium">
                                          {teacher.firstName} {teacher.lastName}
                                        </div>
                                        <div className="text-xs text-slate-500 mt-0.5">@{teacher.username}</div>
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-slate-600 text-sm">{teacher.email}</TableCell>
                                  <TableCell className="text-slate-600 text-sm">{teacher.username}</TableCell>
                                  <TableCell>
                                    <span className="text-rose-600 text-sm font-medium">
                                      {teacher.rejectionReason || "No reason provided"}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <motion.button
                                      whileHover={{ scale: 1.03 }}
                                      whileTap={{ scale: 0.98 }}
                                      className="inline-flex items-center text-emerald-600 bg-white border border-emerald-200 hover:bg-emerald-50 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors shadow-sm"
                                      onClick={() => handleApproveTeacher(teacher.id)}
                                      disabled={approveMutation.isPending}
                                    >
                                      {approveMutation.isPending && selectedTeacherId === teacher.id ? (
                                        <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                                      ) : (
                                        <CheckCircle className="h-4 w-4 mr-1.5" />
                                      )}
                                      Re-approve
                                    </motion.button>
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </TabsContent>
                  </Tabs>
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </main>

      {/* == Reject Dialog == */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent className="bg-white border border-slate-200 shadow-xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-slate-900 font-bold flex items-center">
              <XCircle className="h-5 w-5 text-rose-500 mr-2" />
              Reject Teacher Account
            </DialogTitle>
            <DialogDescription className="text-slate-600 mt-2">
              Please provide a reason for rejecting this teacher account. This will be visible to the teacher.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <Textarea
              placeholder="Rejection reason (optional)"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="min-h-[100px] border border-slate-200 focus:border-blue-500 shadow-sm"
            />
          </div>

          <DialogFooter className="flex justify-end gap-2 pt-2">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                variant="outline"
                onClick={() => setIsRejectDialogOpen(false)}
                className="border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold shadow-sm w-full sm:w-auto"
              >
                Cancel
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                variant="destructive"
                onClick={handleRejectSubmit}
                disabled={rejectMutation.isPending}
                className="bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-sm w-full sm:w-auto flex items-center"
              >
                {rejectMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />}
                Reject Account
              </Button>
            </motion.div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
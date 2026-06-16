// == IMPORTS & DEPENDENCIES ==
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import Header from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import {
  Users,
  BookOpen,
  Clock,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Plus,
  GraduationCap,
  Shield,
} from "lucide-react";
import { motion } from "@/lib/motionShim";

// Small animation presets (UI-only; no data logic touched)
const fadeIn = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};
const fadeInFast = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } },
};
const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

// CLEANED: Replaced yellow borders with crisp slate-200 borders and subtle indigo/blue hover states
const cardBase =
  "group border border-slate-200 hover:border-blue-500 transition-all duration-300 " +
  "shadow-sm hover:shadow-xl bg-white rounded-2xl will-change-transform hover:-translate-y-0.5 font-sans font-bold";

// == ADMIN DASHBOARD COMPONENT ==
export default function AdminDashboard() {
  // == DATA FETCHING ==
  const { data: studentsData, isLoading: isLoadingStudents } = useQuery({
    queryKey: ["/api/students", "approved"],
    queryFn: async () => {
      const response = await fetch("/api/students?status=approved", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!response.ok) throw new Error("Failed to fetch approved students data");
      return response.json();
    },
  });

  const { data: statsData, isLoading: isLoadingStats } = useQuery({
    queryKey: ["/api/stats"],
    queryFn: async () => {
      const response = await fetch("/api/stats", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!response.ok) throw new Error("Failed to fetch dashboard stats");
      return response.json();
    },
  });

  const { data: teachersData } = useQuery({
    queryKey: ["/api/teachers", "pending"],
    queryFn: async () => {
      const response = await fetch("/api/teachers?status=pending", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!response.ok) throw new Error("Failed to fetch pending teachers");
      return response.json();
    },
  });

  // == COMPUTED VALUES ==
  const pendingTeachersCount = teachersData?.teachers?.length || 0;

  // == RENDER COMPONENT ==
  return (
    // CLEANED: Replaced yellow/gold background gradient with a sleek, clean slate/indigo-50 backdrop
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-slate-100 to-indigo-50/50">
      <Header variant="admin" />

      <main className="flex-grow p-4 md:p-6 font-sans font-bold">
        <div className="container mx-auto">
          {/* == Welcome Section == */}
          <motion.div
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            className="bg-slate-900 rounded-2xl p-8 mb-8 text-white shadow-lg relative overflow-hidden font-sans font-bold"
          >
            {/* Soft sheen */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 [mask-image:radial-gradient(60%_60%_at_20%_20%,black,transparent)]" />
            <div className="flex items-start justify-between relative">
              <div className="flex-1">
                <div className="flex items-center mb-3">
                  {/* CLEANED: Swapped gold icon/text color out for sharp, elegant sky-blue accents */}
                  <Shield className="h-8 w-8 text-sky-400 mr-3" />
                  <span className="text-lg text-sky-400 uppercase tracking-wide font-sans font-bold">
                    Adonai And Grace Inc.
                  </span>
                </div>
                <h1 className="text-3xl md:text-4xl mb-3 font-sans font-bold">
                  Welcome back, Administrator!
                </h1>
                <p className="text-base text-slate-300 mb-4 max-w-2xl font-sans font-bold">
                  Continue your leadership journey and guide the light of knowledge through excellence and service.
                </p>
                <p className="text-sky-300 flex items-center font-sans font-bold">
                  <span className="mr-2">🎯</span>
                  Liwanag • Kaalaman • Paglilingkod
                </p>
              </div>
            </div>
          </motion.div>

          {/* == Header Section == */}
          <motion.div
            className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 font-sans font-bold"
            variants={fadeInFast}
            initial="hidden"
            animate="visible"
          >
            <div>
              <h2 className="text-2xl text-slate-800 font-sans font-bold">Management Overview</h2>
              {/* CLEANED: Replaced yellow-700 description with clean slate-500 */}
              <p className="text-slate-500 font-sans font-bold">Monitor your institution&apos;s performance</p>
            </div>
            <div className="mt-4 md:mt-0">
              <Link href="/admin/add-book">
                {/* CLEANED: Turned the button from muddy yellow/amber gradient to clean, crisp administrative Blue/Indigo */}
                <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-sans font-bold shadow-md transition-transform duration-300 hover:-translate-y-0.5 active:translate-y-0">
                  <Plus className="mr-2 h-4 w-4" />
                  Add New Book
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* == Statistics Cards == */}
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 font-sans font-bold"
          >
            {/* == Total Students Card == */}
            <motion.div variants={fadeIn} className={cardBase}>
              <div className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    {/* CLEANED: Replaced text-yellow-700 with crisp text-slate-500 */}
                    <p className="text-slate-500 text-sm font-sans font-bold">Total Students</p>
                    <h3 className="text-3xl mt-1 text-slate-900 font-sans font-bold">
                      {isLoadingStudents ? "..." : studentsData?.students?.length || 0}
                    </h3>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-3 rounded-lg">
                    <Users className="h-6 w-6 text-blue-600 transition-transform duration-300 group-hover:scale-110" />
                  </div>
                </div>
                <div className="flex items-center mt-4 text-sm font-sans font-bold">
                  <span className="text-emerald-600 flex items-center">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    12%
                  </span>
                  <span className="text-slate-500 ml-2">approved students</span>
                </div>
              </div>
            </motion.div>

            {/* == Average Reading Time Card == */}
            <motion.div variants={fadeIn} className={cardBase}>
              <div className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    {/* CLEANED: Replaced text-yellow-700 with text-slate-500 */}
                    <p className="text-slate-500 text-sm font-sans font-bold">Avg. Reading Time</p>
                    <h3 className="text-3xl mt-1 text-slate-900 font-sans font-bold">
                      {isLoadingStats ? "..." : `${statsData?.stats?.avgReadingTime || 25} min`}
                    </h3>
                  </div>
                  {/* CLEANED: Swapped gold icon box background for smooth indigo-50 styling */}
                  <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-3 rounded-lg">
                    <Clock className="h-6 w-6 text-indigo-600 transition-transform duration-300 group-hover:rotate-6" />
                  </div>
                </div>
                <div className="flex items-center mt-4 text-sm font-sans font-bold">
                  <span className="text-emerald-600 flex items-center">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    5%
                  </span>
                  <span className="text-slate-500 ml-2">from last month</span>
                </div>
              </div>
            </motion.div>

            {/* == Completion Rate Card == */}
            <motion.div variants={fadeIn} className={cardBase}>
              <div className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    {/* CLEANED: Replaced text-yellow-700 with text-slate-500 */}
                    <p className="text-slate-500 text-sm font-sans font-bold">Completion Rate</p>
                    <h3 className="text-3xl mt-1 text-slate-900 font-sans font-bold">
                      {isLoadingStats ? "..." : `${statsData?.stats?.completionRate || 0}%`}
                    </h3>
                  </div>
                  <div className="bg-gradient-to-br from-violet-50 to-violet-100 p-3 rounded-lg">
                    <BarChart3 className="h-6 w-6 text-violet-600 transition-transform duration-300 group-hover:scale-110" />
                  </div>
                </div>
                <div className="flex items-center mt-4 text-sm font-sans font-bold">
                  <span className="text-rose-600 flex items-center">
                    <TrendingDown className="h-3 w-3 mr-1" />
                    2%
                  </span>
                  <span className="text-slate-500 ml-2">from last month</span>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* == Action Cards == */}
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6"
          >
            {/* == Manage Books Card == */}
            <Link href="/admin/books">
              <motion.div variants={fadeIn} className={`${cardBase} p-6 cursor-pointer`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-sans font-bold text-slate-900">Manage Books</h3>
                    <p className="text-slate-500 mt-1 text-sm font-sans font-bold">View, edit and add new books</p>
                  </div>
                  {/* CLEANED: Replaced brand-gold background block with crisp blue block */}
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg">
                    <BookOpen className="h-6 w-6 text-blue-600 transition-transform duration-300 group-hover:-translate-y-0.5" />
                  </div>
                </div>
              </motion.div>
            </Link>

            {/* == Manage Students Card == */}
            <Link href="/admin/students">
              <motion.div variants={fadeIn} className={`${cardBase} p-6 cursor-pointer`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-sans font-bold text-slate-900">Manage Students</h3>
                    <p className="text-slate-500 mt-1 text-sm font-sans font-bold">
                      View student progress and activities
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 rounded-lg">
                    <Users className="h-6 w-6 text-indigo-600 transition-transform duration-300 group-hover:-translate-y-0.5" />
                  </div>
                </div>
              </motion.div>
            </Link>

            {/* == Manage Teachers Card == */}
            <Link href="/admin/teacher">
              <motion.div variants={fadeIn} className={`${cardBase} p-6 cursor-pointer`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-sans font-bold text-slate-900">Manage Teachers</h3>
                    <p className="text-slate-500 mt-1 text-sm font-sans font-bold">
                      Approve and monitor teacher accounts
                      {pendingTeachersCount > 0 && (
                        <span className="ml-2 px-2 py-0.5 text-xs bg-rose-100 text-rose-800 rounded-full font-bold">
                          {pendingTeachersCount} pending
                        </span>
                      )}
                    </p>
                  </div>
                  {/* CLEANED: Replaced brand-gold background block with sleek purple/violet accent block */}
                  <div className="bg-gradient-to-br from-violet-50 to-violet-100 p-4 rounded-lg">
                    <GraduationCap className="h-6 w-6 text-violet-600 transition-transform duration-300 group-hover:-translate-y-0.5" />
                  </div>
                </div>
              </motion.div>
            </Link>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
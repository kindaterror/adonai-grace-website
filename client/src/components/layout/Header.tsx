// == IMPORTS & DEPENDENCIES ==
import { Link } from "wouter";
import { Logo } from "@/components/ui/logo";
import { Sidebar } from "@/components/layout/Sidebar";

// == TYPE DEFINITIONS ==
type HeaderProps = {
  variant?: "visitor" | "admin" | "student" | "teacher";
};

// == HEADER COMPONENT ==
export function Header({ variant = "visitor" }: HeaderProps) {
  // Determine if we are using the new Admin theme
  const isAdmin = variant === "admin";

  return (
    <header 
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        isAdmin 
          ? "bg-white border-b border-slate-200 shadow-sm" 
          : "bg-ilaw-white shadow-navy border-b-2 border-ilaw-gold backdrop-blur-sm bg-opacity-95"
      }`}
    >
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        
        {/* == Logo Section == */}
        <div className="flex items-center space-x-4">
          <Link href={
            variant === "visitor" ? "/" : 
            variant === "admin" ? "/admin" : 
            variant === "teacher" ? "/teacher" :
            "/student"
            }>
              {/* smaller logo on mobile, larger on md+ */}
              <Logo variant={variant} className="h-8 md:h-12 w-auto hover:opacity-80 transition-opacity duration-300" />
          </Link>
        </div>
        
        {/* == Dashboard Info & Navigation == */}
        <div className="flex items-center space-x-4">
          
          {/* == Dashboard Badge == */}
          {variant !== "visitor" && (
            <div className="hidden md:flex items-center space-x-3">
              <span className={isAdmin ? "text-slate-600 font-medium" : "text-ilaw-gray font-medium"}>
                {variant === "admin" ? "Admin Dashboard" : 
                 variant === "teacher" ? "Teacher Dashboard" : 
                 "Student Portal"}
              </span>
              <div className={`${
                isAdmin 
                  ? "bg-blue-50 text-blue-700 border border-blue-100" 
                  : variant === "teacher"
                  ? "bg-brand-navy-100 text-ilaw-navy border border-brand-navy-300" :
                  "bg-brand-amber text-ilaw-navy border border-brand-amber"
              } px-4 py-1.5 rounded-full text-sm font-semibold shadow-sm transition-all duration-200`}>
                {variant === "admin" ? "Admin" : 
                 variant === "teacher" ? "Teacher" : 
                 "Student"}
              </div>
            </div>
          )}
          
          {/* == Welcome Message == */}
          {variant !== "visitor" && (
            <div className="hidden sm:block text-right">
              <p className={isAdmin ? "text-slate-400 text-xs uppercase tracking-wider font-bold" : "text-ilaw-gray text-sm"}>
                {isAdmin ? "System" : "Welcome to your"}
              </p>
              <p className={isAdmin ? "text-slate-900 font-bold text-sm" : "text-ilaw-navy font-semibold text-sm"}>
                {isAdmin ? "Management" : "Learning Portal"}
              </p>
            </div>
          )}
          
          {/* == Sidebar Toggle == */}
          <Sidebar variant={variant} />
        </div>
      </div>
      
      {/* == Decorative Border (Hidden for Admin for a cleaner look) == */}
      {!isAdmin && (
        <div className="h-1 bg-gradient-to-r from-ilaw-gold via-brand-amber to-ilaw-gold"></div>
      )}
    </header>
  );
}

// == EXPORTS ==
export default Header;
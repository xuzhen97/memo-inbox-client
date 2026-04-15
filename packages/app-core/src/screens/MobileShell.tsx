import React, { useState, useEffect, useRef } from "react";
import { Menu, Search, Inbox, BookOpen, Settings, ChevronUp, Archive } from "lucide-react";
import { appNavigateEvent } from "../router/createAppRouter";

interface MobileShellProps {
  children: React.ReactNode;
  activePath: string;
}

export function MobileShell({ children, activePath }: MobileShellProps) {
  const [showBackToTop, setShowBackToTop] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  const handleNav = (path: string) => {
    window.history.pushState({}, "", path);
    window.dispatchEvent(new Event(appNavigateEvent));
  };

  const handleScroll = (e: React.UIEvent<HTMLElement>) => {
    if (e.currentTarget.scrollTop > 400) {
      if (!showBackToTop) setShowBackToTop(true);
    } else {
      if (showBackToTop) setShowBackToTop(false);
    }
  };

  const scrollToTop = () => {
    mainRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-[#FCFAFA] font-sans text-on-surface overflow-hidden relative">
      {/* Header */}
      <header 
        className="flex-shrink-0 flex items-center justify-between px-5 bg-[#FCFAFA]"
        style={{ 
          paddingTop: 'max(env(safe-area-inset-top), 24px)',
          paddingBottom: '12px'
        }}
      >
        <button className="p-2 -ml-2 text-on-surface-variant/70 hover:text-primary transition-colors">
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-2">
          <h1 className="font-bold text-[15px] tracking-wide text-primary">记忆收件箱</h1>
          <div className="w-1.5 h-1.5 rounded-full bg-[#5E7958] opacity-80" />
        </div>
        <button className="p-2 -mr-2 text-on-surface-variant/70 hover:text-primary transition-colors">
          <Search size={20} />
        </button>
      </header>

      {/* Main Content Area */}
      <main 
        ref={mainRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto w-full custom-scrollbar pb-20 scroll-smooth"
      >
        {children}
      </main>

      {/* Back To Top Button */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className="absolute right-5 bottom-[88px] z-50 p-3 rounded-full bg-[#051F14]/90 backdrop-blur text-white shadow-[0_4px_12px_rgba(0,0,0,0.15)] flex items-center justify-center transition-all hover:bg-black active:scale-95"
        >
          <ChevronUp size={20} />
        </button>
      )}

      {/* Bottom Navigation */}
      <nav className="absolute bottom-0 w-full bg-[#FCFAFA]/90 backdrop-blur-md border-t border-outline-variant/10 h-[68px] flex items-center justify-around px-2 pb-safe">
        <button
          onClick={() => handleNav("/")}
          className={`flex flex-col items-center gap-1.5 w-16 p-2 rounded-xl transition-all ${
            activePath === "/" || activePath === "/index.html"
              ? "text-primary"
              : "text-on-surface-variant/40 hover:text-on-surface-variant/70"
          }`}
        >
           <div className={`p-1.5 rounded-xl ${activePath === "/" || activePath === "/index.html" ? "bg-surface-container" : ""}`}>
             <Inbox size={20} className={activePath === "/" || activePath === "/index.html" ? "fill-primary/20" : ""} />
           </div>
          <span className="text-[10px] font-bold">收件箱</span>
        </button>

        <button
          onClick={() => handleNav("/review")}
          className={`flex flex-col items-center gap-1.5 w-16 p-2 rounded-xl transition-all ${
            activePath === "/review"
              ? "text-primary"
              : "text-on-surface-variant/40 hover:text-on-surface-variant/70"
          }`}
        >
          <div className={`p-1.5 rounded-xl ${activePath === "/review" ? "bg-surface-container" : ""}`}>
             <BookOpen size={20} />
           </div>
           <span className="text-[10px] font-bold">回顾</span>
        </button>

        <button
          onClick={() => handleNav("/archive")}
          className={`flex flex-col items-center gap-1.5 w-16 p-2 rounded-xl transition-all ${
            activePath === "/archive"
              ? "text-primary"
              : "text-on-surface-variant/40 hover:text-on-surface-variant/70"
          }`}
        >
          <div className={`p-1.5 rounded-xl ${activePath === "/archive" ? "bg-surface-container" : ""}`}>
             <Archive size={20} />
           </div>
           <span className="text-[10px] font-bold">归档</span>
        </button>

        <button
          onClick={() => handleNav("/settings")}
          className={`flex flex-col items-center gap-1.5 w-16 p-2 rounded-xl transition-all ${
            activePath === "/settings"
              ? "text-primary"
              : "text-on-surface-variant/40 hover:text-on-surface-variant/70"
          }`}
        >
          <div className={`p-1.5 rounded-xl ${activePath === "/settings" ? "bg-surface-container" : ""}`}>
            <Settings size={20} />
          </div>
          <span className="text-[10px] font-bold">设置</span>
        </button>
      </nav>
    </div>
  );
}

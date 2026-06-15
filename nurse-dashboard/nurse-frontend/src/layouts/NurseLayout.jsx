import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/nurse/Sidebar';
import TopNavbar from '../components/nurse/TopNavbar';

const NurseLayout = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans">
      {/* Left Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div 
        className="flex-1 flex flex-col transition-all duration-300 min-w-0"
        style={{
          paddingLeft: sidebarCollapsed ? '72px' : '280px'
        }}
      >
        {/* Top Navbar */}
        <TopNavbar
          collapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed((p) => !p)}
          onMobileMenu={() => setMobileSidebarOpen((p) => !p)}
        />

        {/* Content Body */}
        <main className="flex-1 p-8 pt-[102px] max-w-[1400px] w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
        />
      )}
    </div>
  );
};

export default NurseLayout;

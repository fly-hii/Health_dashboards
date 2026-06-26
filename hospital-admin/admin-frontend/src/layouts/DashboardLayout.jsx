import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';

export default function DashboardLayout() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Sidebar Navigation */}
      <Sidebar 
        isMinimized={isSidebarMinimized} 
        isMobileOpen={isMobileSidebarOpen}
        setIsMobileOpen={setIsMobileSidebarOpen}
      />

      {/* Main Content Area */}
      <div className={`transition-all duration-300 ${isSidebarMinimized ? 'lg:pl-sidebar-min' : 'lg:pl-sidebar'} pl-0 min-h-screen flex flex-col`}>
        {/* Top Header */}
        <Header 
          searchTerm={searchTerm} 
          setSearchTerm={setSearchTerm} 
          isSidebarMinimized={isSidebarMinimized}
          setIsSidebarMinimized={setIsSidebarMinimized}
          isMobileOpen={isMobileSidebarOpen}
          setIsMobileOpen={setIsMobileSidebarOpen}
        />

        {/* Content Body */}
        <main className="flex-1 pt-[calc(72px+1.5rem)] px-4 sm:px-8 pb-8">
          <Outlet context={{ searchTerm }} />
        </main>
      </div>
    </div>
  );
}

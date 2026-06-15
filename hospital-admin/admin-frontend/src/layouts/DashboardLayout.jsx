import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';

export default function DashboardLayout() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Sidebar Navigation */}
      <Sidebar isMinimized={isSidebarMinimized} />

      {/* Main Content Area */}
      <div className={`transition-all duration-300 ${isSidebarMinimized ? 'pl-sidebar-min' : 'pl-sidebar'} min-h-screen flex flex-col`}>
        {/* Top Header */}
        <Header 
          searchTerm={searchTerm} 
          setSearchTerm={setSearchTerm} 
          isSidebarMinimized={isSidebarMinimized}
          setIsSidebarMinimized={setIsSidebarMinimized}
        />

        {/* Content Body */}
        <main className="flex-1 pt-[calc(72px+2rem)] px-8 pb-8">
          <Outlet context={{ searchTerm }} />
        </main>
      </div>
    </div>
  );
}

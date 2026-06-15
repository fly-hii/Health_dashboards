import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';

export default function DashboardLayout() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Top Header */}
      <Header 
        searchTerm={searchTerm} 
        setSearchTerm={setSearchTerm} 
        setIsSidebarOpen={setIsSidebarOpen} 
        isMinimized={isSidebarMinimized}
        setIsMinimized={setIsSidebarMinimized}
      />

      {/* Main Container */}
      <div className="flex pt-[72px] min-h-[calc(100vh-72px)]">
        {/* Navigation Sidebar */}
        <Sidebar 
          isOpen={isSidebarOpen} 
          setIsOpen={setIsSidebarOpen} 
          isMinimized={isSidebarMinimized}
          setIsMinimized={setIsSidebarMinimized}
        />

        {/* Content Wrapper */}
        <main className={`flex-1 w-full p-6 transition-all duration-300 ease-in-out overflow-x-hidden ${
          isSidebarMinimized ? 'lg:ml-[72px]' : 'lg:ml-[240px]'
        }`}>
          <Outlet context={{ searchTerm, setSearchTerm }} />
        </main>
      </div>
    </div>
  );
}

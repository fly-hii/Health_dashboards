import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Home,
  Calendar,
  Stethoscope,
  FileText,
  BarChart3,
  Bell,
  User,
  Settings,
  LogOut
} from 'lucide-react';

const RxIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="3" y="3" width="18" height="18" rx="4" />
    <path d="M8 8h3a2 2 0 0 1 0 4H8v4" />
    <path d="M11 12l3 4" />
    <path d="M14 12l-3 4" />
  </svg>
);

export default function Sidebar({ activeTab, setActiveTab, isOpen, setIsOpen }) {
  const { logout } = useAuth();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'consultations', label: 'Consultations', icon: Stethoscope },
    { id: 'records', label: 'Medical Records', icon: FileText },
    { id: 'prescriptions', label: 'Prescriptions', icon: RxIcon },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: 3 },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    if (setIsOpen) {
      setIsOpen(false);
    }
  };

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-[99] md:hidden transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}
      <aside className={`fixed md:sticky top-0 left-0 z-[100] w-[280px] h-screen bg-white border-r border-[#E5E7EB] flex flex-col justify-between p-6 shrink-0 font-sans transition-transform duration-300 ease-in-out md:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
      <div className="flex flex-col gap-6">
        {/* Brand Logo */}
        <div 
          className="flex items-center gap-3 px-2 py-4 cursor-pointer" 
          onClick={() => setActiveTab('dashboard')}
        >
          <div className="w-10 h-10 bg-[#e6f5f3] rounded-xl flex items-center justify-center text-[#0F9D8A] shrink-0">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="font-sans font-bold text-xl leading-none text-[#0B1F3A]">CarePlus</span>
            <span className="font-sans font-semibold text-[10px] tracking-[0.25em] text-[#64748b] mt-1">HOSPITAL</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-1.5">
          {menuItems.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                  isActive 
                    ? 'bg-gradient-to-r from-[#0F9D8A] to-[#0A8E7C] text-white shadow-md shadow-[#0F9D8A]/10' 
                    : 'text-[#475569] hover:bg-slate-50 hover:text-[#0B1F3A]'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <Icon className={`w-[18px] h-[18px] ${isActive ? 'text-white' : 'text-[#94a3b8]'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`w-5 h-5 flex items-center justify-center text-[10px] font-bold rounded-full ${
                    isActive ? 'bg-white text-[#0F9D8A]' : 'bg-[#EF4444] text-white'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Logout Button */}
      <div className="pt-4 border-t border-[#E5E7EB]">
        <button 
          onClick={logout} 
          className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl font-medium text-sm text-[#475569] hover:bg-rose-50 hover:text-rose-600 transition-all duration-200"
        >
          <LogOut className="w-[18px] h-[18px] text-[#94a3b8] group-hover:text-rose-600" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
    </>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Search, Bell, MessageSquare, ChevronDown, Menu, Sun, Moon, User, LogOut } from 'lucide-react';
import { getImageUrl } from '../utils/api';


export default function TopNavbar({ searchQuery, setSearchQuery, queue, onDiagnosePatient, activeTab, setActiveTab, onToggleSidebar, unreadCount, notifications, onRefreshNotifications }) {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const profileDropdownRef = useRef(null);

  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  useEffect(() => {
    const checkTheme = () => {
      setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    };
    checkTheme();
    
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      observer.disconnect();
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [user]);

  const readyPatients = queue ? queue.filter(p => p.status === 'vitals_done') : [];

  const rawName = user?.fullName || user?.name || 'Arjun Mehta';
  const displayName = rawName.startsWith('Dr.') ? rawName : `Dr. ${rawName}`;
  const specialization = user?.specialization || 'Cardiologist';
  const avatarUrl = getImageUrl(user?.avatar) || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=300';


  return (
    <header className="w-full h-[90px] bg-white border-b border-[#E5E7EB] flex items-center justify-between px-4 md:px-8 shrink-0 font-sans">
      {/* Search & Toggle Menu */}
      <div className="flex items-center gap-4 flex-1">
        <button 
          className="p-2 hover:bg-slate-100 rounded-lg text-[#475569] transition-all duration-200 shrink-0"
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar menu"
          title="Toggle sidebar"
        >
          <Menu className="w-5 h-5 text-[#0B1F3A]" />
        </button>
        <div className="relative hidden md:flex items-center w-full max-w-[460px]">
          <Search className="w-[18px] h-[18px] text-[#94a3b8] absolute left-4 pointer-events-none" />
          <input
            type="text"
            placeholder="Search patient by name, ID or phone..."
            className="w-full bg-slate-50 border border-slate-100 hover:border-slate-200 focus:border-primary/50 focus:bg-white rounded-2xl py-2.5 pl-11 pr-4 text-sm text-[#0B1F3A] outline-none transition-all placeholder:text-[#94a3b8] placeholder:font-normal"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-5">
        {/* Dark Mode Toggle */}
        <button
          onClick={toggleTheme}
          type="button"
          className="relative p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl text-[#0B1F3A] transition-all focus:outline-none cursor-pointer flex items-center justify-center"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* Notification Bell */}
        <div className="relative" ref={dropdownRef}>
          <button
            className="relative p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl text-[#0B1F3A] transition-all focus:outline-none cursor-pointer flex items-center justify-center"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-[15px] h-[15px] bg-[#EF4444] rounded-full border border-white flex items-center justify-center text-[9px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-3 w-80 bg-white border border-[#E5E7EB] rounded-2xl shadow-xl z-50 overflow-hidden py-1">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E7EB]">
                <h4 className="font-bold text-sm text-[#0B1F3A]">Notifications</h4>
                {unreadCount > 0 && (
                  <span className="text-[10px] font-bold text-[#EF4444] bg-red-50 px-2 py-0.5 rounded-full">
                    {unreadCount} unread
                  </span>
                )}
              </div>
              <div className="max-h-[300px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                    <div className="w-10 h-10 bg-[#e6f5f3] rounded-full flex items-center justify-center text-primary mb-2">
                      <Bell className="w-5 h-5" />
                    </div>
                    <p className="text-xs text-[#64748b]">All caught up! No notifications.</p>
                  </div>
                ) : (
                  notifications.slice(0, 3).map((notif) => (
                    <div
                      key={notif._id}
                      className={`flex gap-3 px-4 py-3 border-b border-[#E5E7EB] hover:bg-slate-50 cursor-pointer transition-all ${!notif.read ? 'bg-[#0F9D8A]/5' : ''}`}
                      onClick={() => { setActiveTab('notifications'); setDropdownOpen(false); }}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs shrink-0 mt-0.5 ${
                        notif.type === 'critical' ? 'bg-red-50 text-red-500' :
                        notif.type === 'alert' ? 'bg-orange-50 text-orange-500' :
                        'bg-teal-50 text-teal-600'
                      }`}>
                        <Bell className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-xs font-semibold text-[#0B1F3A] truncate">{notif.title}</p>
                        <p className="text-[11px] text-[#64748b] mt-0.5 truncate">{notif.message}</p>
                        <p className="text-[9px] text-[#94a3b8] mt-0.5">{new Date(notif.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="border-t border-[#E5E7EB] text-center">
                <button
                  onClick={() => { setActiveTab('notifications'); setDropdownOpen(false); }}
                  className="w-full py-2.5 text-xs font-bold text-[#0F9D8A] hover:bg-slate-50 transition-colors bg-transparent border-none outline-none cursor-pointer"
                >
                  View All Notifications
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Message Icon */}
        <button
          className="relative p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl text-[#0B1F3A] transition-all focus:outline-none"
          aria-label="Messages"
        >
          <MessageSquare className="w-5 h-5" />
        </button>

        {/* Divider */}
        <div className="h-8 w-px bg-slate-200" />

        {/* Doctor profile card */}
        <div className="relative" ref={profileDropdownRef}>
          <div 
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            className="flex items-center gap-3 cursor-pointer pl-1 select-none"
          >
            <img
              src={avatarUrl}
              alt={displayName}
              className="w-10 h-10 rounded-full object-cover border border-slate-100"
            />
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-sm font-semibold text-[#0B1F3A] leading-tight">{displayName}</span>
              <span className="text-[11px] text-[#64748b] font-medium mt-0.5">{specialization}</span>
            </div>
            <ChevronDown className="w-4 h-4 text-[#94a3b8] ml-1" />
          </div>

          {profileDropdownOpen && (
            <div className="absolute right-0 mt-3 w-56 bg-white border border-[#E5E7EB] rounded-2xl shadow-xl z-50 overflow-hidden py-1">
              <div className="px-4 py-3 border-b border-[#E5E7EB] bg-slate-50/50">
                <div className="text-sm font-bold text-[#0B1F3A]">{displayName}</div>
                <div className="text-xs text-[#64748b] mt-0.5 truncate">{user?.email || 'doctor@hospital.com'}</div>
              </div>
              
              <button 
                onClick={() => { setActiveTab('profile'); setProfileDropdownOpen(false); }}
                className="w-full px-4 py-2.5 text-left text-xs font-semibold text-[#475569] hover:bg-slate-50 hover:text-[#0B1F3A] flex items-center gap-2 cursor-pointer bg-transparent border-none outline-none"
              >
                <User className="w-4 h-4 text-[#94a3b8]" />
                My Profile
              </button>

              <button 
                onClick={() => { setActiveTab('notifications'); setProfileDropdownOpen(false); }}
                className="w-full px-4 py-2.5 text-left text-xs font-semibold text-[#475569] hover:bg-slate-50 hover:text-[#0B1F3A] flex items-center gap-2 cursor-pointer bg-transparent border-none outline-none"
              >
                <Bell className="w-4 h-4 text-[#94a3b8]" />
                Notifications
              </button>
              
              <div className="border-t border-[#E5E7EB] my-1" />
              
              <button 
                onClick={() => { logout(); setProfileDropdownOpen(false); }} 
                className="w-full px-4 py-2.5 text-left text-xs font-bold text-[#EF4444] hover:bg-red-50/50 flex items-center gap-2 cursor-pointer bg-transparent border-none outline-none"
              >
                <LogOut className="w-4 h-4 text-[#EF4444]" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

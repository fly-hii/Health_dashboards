import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import config from '../../config';
import { Menu, Search, Bell, ChevronDown, User as UserIcon, LogOut, Sun, Moon } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '../ui/dropdown-menu';
import { getImageUrl } from '../../utils/imageUrl';


const TopNavbar = ({ collapsed, onToggleSidebar, onMobileMenu }) => {
  const { user, logout, theme, toggleTheme } = useAuth();
  const { unreadCount }           = useNotifications();
  const [search, setSearch]       = useState('');
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) {
      navigate(`/patient-queue?search=${encodeURIComponent(search.trim())}`);
      setSearch('');
    }
  };

  const displayName = user?.name || 'Nurse';
  const displayStaffId = user?.employeeId || '';
  const avatarUrl = getImageUrl(user?.avatar) || config.defaultAvatar;


  return (
    <header 
      className={`fixed top-0 right-0 z-30 h-[70px] bg-white border-b border-[#E5E7EB] flex items-center justify-between px-8 gap-6 transition-all duration-300 left-0 ${
        collapsed ? 'lg:left-[72px]' : 'lg:left-[280px]'
      }`}
    >
      {/* Toggle Sidebar Button */}
      <button
        onClick={() => {
          if (window.innerWidth < 1024) {
            onMobileMenu();
          } else {
            onToggleSidebar();
          }
        }}
        className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
        title="Toggle sidebar"
      >
        <Menu size={22} strokeWidth={2.5} />
      </button>

      {/* Large Centered Search Bar */}
      <form onSubmit={handleSearch} className="flex-1 max-w-[480px] mx-auto max-md:hidden">
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 flex items-center">
            <Search size={18} strokeWidth={2} />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search patient by name, ID or phone..."
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-[#E5E7EB] rounded-lg text-[14px] text-slate-800 placeholder-slate-400 outline-none transition-all duration-200 focus:border-[#0EA5A4] focus:bg-white focus:ring-4 focus:ring-teal-500/10"
          />
        </div>
      </form>

      {/* Right Navigation Actions */}
      <div className="flex items-center gap-5 ml-auto">
        {/* Dark Mode Toggle */}
        <button
          onClick={toggleTheme}
          type="button"
          className="relative flex items-center justify-center w-10 h-10 rounded-full bg-slate-50 border border-[#E5E7EB] text-slate-600 hover:bg-slate-100 hover:text-slate-950 transition-colors cursor-pointer"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? <Sun size={18} strokeWidth={2} /> : <Moon size={18} strokeWidth={2} />}
        </button>

        {/* Notification Bell */}
        <Link
          to="/notifications"
          className="relative flex items-center justify-center w-10 h-10 rounded-full bg-slate-50 border border-[#E5E7EB] text-slate-600 hover:bg-slate-100 hover:text-slate-950 transition-colors"
        >
          <Bell size={18} strokeWidth={2} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-[#EF4444] text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1 border-2 border-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Link>

        {/* Profile Dropdown */}
        <div className="flex items-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 p-1 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer outline-none">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={avatarUrl} alt={displayName} />
                  <AvatarFallback>{displayName.charAt(0)}</AvatarFallback>
                </Avatar>
                
                <div className="text-left flex flex-col max-sm:hidden">
                  <span className="text-slate-900 text-[14px] font-bold leading-tight">
                    {displayName}
                  </span>
                  <span className="text-slate-500 text-[11px] font-semibold mt-0.5">
                    Staff ID: {displayStaffId}
                  </span>
                </div>
                
                <ChevronDown size={16} className="text-slate-400 max-sm:hidden ml-1" />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent className="w-56 mt-2 rounded-xl shadow-lg border border-[#E5E7EB] bg-white py-1">
              <div className="px-4 py-2.5 border-b border-[#E5E7EB] bg-slate-50/50">
                <div className="text-[14px] font-bold text-slate-900">{displayName}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">{user?.email}</div>
              </div>
              
              <DropdownMenuItem onClick={() => navigate('/profile')}>
                <span className="flex items-center gap-2">
                  <UserIcon size={16} className="text-slate-500" />
                  My Profile
                </span>
              </DropdownMenuItem>

              <DropdownMenuItem onClick={() => navigate('/notifications')}>
                <span className="flex items-center gap-2">
                  <Bell size={16} className="text-slate-500" />
                  Notifications
                </span>
              </DropdownMenuItem>
              
              <div className="border-t border-[#E5E7EB] my-1" />
              
              <DropdownMenuItem onClick={() => { logout(); navigate('/login'); }} className="text-[#EF4444] hover:bg-red-50/50">
                <span className="flex items-center gap-2 font-semibold">
                  <LogOut size={16} />
                  Logout
                </span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default TopNavbar;

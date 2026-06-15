import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ListTodo, 
  PackageSearch, 
  CheckCircle, 
  History, 
  Bell, 
  Boxes, 
  User, 
  LogOut
} from 'lucide-react';

const navItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Prescription Queue', path: '/pharmacy/prescription-queue', icon: ListTodo },
  { name: 'Processing Orders', path: '/pharmacy/orders/processing', icon: PackageSearch },
  { name: 'Ready Orders', path: '/pharmacy/orders/ready', icon: CheckCircle },
  { name: 'Order History', path: '/pharmacy/orders/history', icon: History },
  { name: 'Notifications', path: '/pharmacy/notifications', icon: Bell },
  { name: 'Inventory', path: '/pharmacy/inventory', icon: Boxes },
  { name: 'Profile', path: '/pharmacy/profile', icon: User },
];

export default function Sidebar({ isOpen, setIsOpen, isMinimized, setIsMinimized }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/pharmacy/login', { replace: true });
  };

  return (
    <>
      {/* Backdrop overlay for mobile */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/40 z-40 lg:hidden transition-opacity duration-300"
        />
      )}

      <aside className={`bg-white border-r border-[#E5E7EB] h-screen flex flex-col fixed left-0 top-0 z-50 transition-all duration-300 ease-in-out lg:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } ${
        isMinimized ? 'w-[72px]' : 'w-[240px]'
      }`}>
        {/* Brand Logo Section */}
        <div className={`h-[72px] border-b border-[#E5E7EB] flex items-center justify-between transition-all duration-300 ${
          isMinimized ? 'justify-center px-4' : 'px-6'
        }`}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#0F9D8A] rounded flex items-center justify-center text-white font-bold text-xl shrink-0">+</div>
            {!isMinimized && (
              <div className="flex flex-col animate-in fade-in duration-300">
                <span className="text-lg font-bold text-gray-900 leading-none">CarePlus</span>
                <span className="text-[10px] tracking-wider text-gray-500 font-semibold uppercase leading-none mt-1">PHARMACY</span>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Menu */}
        <div className={`flex-1 overflow-y-auto py-6 ${isMinimized ? 'px-2' : 'px-4'}`}>
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.name}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  title={isMinimized ? item.name : undefined}
                  className={({ isActive }) =>
                    `flex items-center py-3 text-sm font-medium transition-all duration-200 ${
                      isMinimized ? 'justify-center px-0' : 'px-4'
                    } ${
                      isActive
                        ? 'bg-[#0F9D8A] text-white rounded-[12px] shadow-sm shadow-[#0F9D8A]/20'
                        : 'text-[#374151] hover:bg-[#F3F4F6] rounded-[12px]'
                    }`
                  }
                >
                  <Icon className={`${isMinimized ? 'm-0' : 'mr-3'} h-5 w-5 shrink-0`} />
                  {!isMinimized && <span className="animate-in fade-in duration-300">{item.name}</span>}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Logout Fixed at Bottom */}
        <div className="p-3 border-t border-[#E5E7EB]">
          <button
            onClick={handleLogout}
            title={isMinimized ? 'Logout' : undefined}
            className={`flex w-full items-center text-sm font-medium text-[#374151] rounded-[12px] hover:bg-red-50 hover:text-red-600 transition-all duration-200 cursor-pointer ${
              isMinimized ? 'justify-center px-0 py-2.5' : 'px-4 py-3'
            }`}
          >
            <LogOut className={`${isMinimized ? 'm-0' : 'mr-3'} h-5 w-5 shrink-0`} />
            {!isMinimized && <span className="animate-in fade-in duration-300">Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
}


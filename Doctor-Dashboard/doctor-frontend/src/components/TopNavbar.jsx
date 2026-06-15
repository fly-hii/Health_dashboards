import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Search, Bell, MessageSquare, ChevronDown, Menu } from 'lucide-react';

export default function TopNavbar({ searchQuery, setSearchQuery, queue, onDiagnosePatient, activeTab, setActiveTab }) {
  const { user } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const readyPatients = queue ? queue.filter(p => p.status === 'vitals_done') : [];

  const rawName = user?.fullName || user?.name || 'Arjun Mehta';
  const displayName = rawName.startsWith('Dr.') ? rawName : `Dr. ${rawName}`;
  const specialization = user?.specialization || 'Cardiologist';
  const avatarUrl = user?.avatar || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=300';

  return (
    <header className="w-full h-[90px] bg-white border-b border-[#E5E7EB] flex items-center justify-between px-8 shrink-0 font-sans">
      {/* Search & Toggle Menu */}
      <div className="flex items-center gap-6 flex-1">
        <button className="p-2 hover:bg-slate-50 rounded-lg text-[#475569] transition-all">
          <Menu className="w-5 h-5 text-[#0B1F3A]" />
        </button>
        <div className="relative flex items-center w-full max-w-[460px]">
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
        {/* Notification Bell */}
        <div className="relative" ref={dropdownRef}>
          <button
            className="relative p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl text-[#0B1F3A] transition-all focus:outline-none"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-[15px] h-[15px] bg-[#EF4444] rounded-full border border-white flex items-center justify-center text-[9px] font-bold text-white">
              3
            </span>
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-3 w-80 bg-white border border-[#E5E7EB] rounded-2xl shadow-xl z-50 overflow-hidden py-1">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E7EB]">
                <h4 className="font-bold text-sm text-[#0B1F3A]">Notifications</h4>
                <span className="text-xs text-primary font-semibold bg-[#e6f5f3] px-2 py-0.5 rounded-full">
                  {readyPatients.length} ready
                </span>
              </div>
              <div className="max-h-[300px] overflow-y-auto">
                {readyPatients.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                    <div className="w-10 h-10 bg-[#e6f5f3] rounded-full flex items-center justify-center text-primary mb-2">
                      <Bell className="w-5 h-5" />
                    </div>
                    <p className="text-xs text-[#64748b]">All caught up! No vitals waiting.</p>
                  </div>
                ) : (
                  readyPatients.map((apt) => (
                    <div
                      key={apt._id}
                      className="flex gap-3 px-4 py-3 border-b border-[#E5E7EB] hover:bg-slate-50 cursor-pointer transition-all"
                      onClick={() => { onDiagnosePatient(apt); setDropdownOpen(false); }}
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0 mt-0.5">
                        {(apt.patient?.name || 'P').charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[#0B1F3A] truncate">{apt.patient?.name || 'Unknown'}</p>
                        <p className="text-[11px] text-[#64748b] mt-0.5">Token #{apt.tokenNumber} · Vitals ready for consult.</p>
                      </div>
                      <span className="text-[10px] font-semibold text-primary bg-[#e6f5f3] h-fit px-2 py-0.5 rounded-full shrink-0">
                        Ready
                      </span>
                    </div>
                  ))
                )}
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
        <div className="flex items-center gap-3 cursor-pointer pl-1">
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
      </div>
    </header>
  );
}

import { useState } from 'react';
import { 
  Calendar, 
  Bell, 
  FlaskConical, 
  Pill, 
  HeartPulse, 
  Eye, 
  Check, 
  Archive,
  Info
} from 'lucide-react';
import { Button } from '../ui/button';

const CATEGORY_STYLES = {
  appointment: {
    icon: Calendar,
    iconColor: 'text-[#0EA5A4]',
    bgColor: 'bg-teal-50/80 border border-teal-100',
    label: 'Appointment'
  },
  vitals_required: {
    icon: Bell,
    iconColor: 'text-blue-600',
    bgColor: 'bg-blue-50/80 border border-blue-100',
    label: 'Vitals Update'
  },
  doctor_request: {
    icon: FlaskConical,
    iconColor: 'text-orange-600',
    bgColor: 'bg-orange-50/80 border border-orange-100',
    label: 'Lab Report'
  },
  general: {
    icon: Pill,
    iconColor: 'text-rose-600',
    bgColor: 'bg-rose-50/80 border border-rose-100',
    label: 'Medication'
  },
  emergency_alert: {
    icon: HeartPulse,
    iconColor: 'text-pink-600',
    bgColor: 'bg-pink-50/80 border border-pink-100',
    label: 'Health Alert'
  }
};

const DEFAULT_STYLE = {
  icon: Info,
  iconColor: 'text-slate-600',
  bgColor: 'bg-slate-50 border border-slate-100',
  label: 'General'
};

const formatTime = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  
  // Custom readable formatting
  return date.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }) + ' • ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const NotificationItem = ({ notification, onRead, onDelete, onViewDetails }) => {
  const [isHovered, setIsHovered] = useState(false);
  const style = CATEGORY_STYLES[notification.type] || DEFAULT_STYLE;
  const Icon = style.icon;

  const getStatusBadge = () => {
    if (notification.priority === 'critical') {
      return (
        <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-600 border border-red-200">
          Critical
        </span>
      );
    }
    if (!notification.isRead) {
      return (
        <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-[#0EA5A4] border border-teal-200">
          Unread
        </span>
      );
    }
    return (
      <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
        Read
      </span>
    );
  };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative p-5 rounded-[18px] border transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
        !notification.isRead 
          ? 'bg-teal-50/15 border-teal-100/80 shadow-sm' 
          : 'bg-white border-[#E5E7EB] hover:border-teal-100 hover:shadow-md'
      }`}
    >
      {/* Indicator line on left of unread notification */}
      {!notification.isRead && (
        <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-[#0EA5A4] rounded-r-md" />
      )}

      {/* Main Info Area */}
      <div className="flex items-start gap-4 flex-1 min-w-0">
        {/* Category Icon Container */}
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${style.bgColor}`}>
          <Icon className={`w-5.5 h-5.5 ${style.iconColor}`} strokeWidth={2.2} />
        </div>

        {/* Text Details */}
        <div className="space-y-1 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className={`text-sm text-slate-900 truncate leading-tight ${
              !notification.isRead ? 'font-extrabold' : 'font-bold'
            }`}>
              {notification.title}
            </h3>
            {getStatusBadge()}
          </div>
          <p className="text-xs text-slate-500 font-semibold leading-relaxed">
            {notification.message}
          </p>
          <span className="text-[10px] text-slate-400 font-bold block">
            {formatTime(notification.createdAt)}
          </span>
        </div>
      </div>

      {/* Actions Section */}
      <div className={`flex items-center gap-2 transition-opacity duration-200 shrink-0 ${
        isHovered ? 'opacity-100' : 'opacity-85 md:opacity-0'
      }`}>
        <Button
          onClick={() => onViewDetails(notification)}
          className="w-8 h-8 rounded-lg border border-[#E5E7EB] bg-white flex items-center justify-center text-slate-500 hover:text-[#0EA5A4] hover:bg-teal-50/50 hover:border-teal-200 transition-all duration-200 cursor-pointer p-0"
          title="View Details"
        >
          <Eye size={14} strokeWidth={2.5} />
        </Button>
        
        {!notification.isRead && (
          <Button
            onClick={() => onRead(notification._id)}
            className="w-8 h-8 rounded-lg border border-[#E5E7EB] bg-white flex items-center justify-center text-slate-500 hover:text-emerald-600 hover:bg-emerald-50/50 hover:border-emerald-200 transition-all duration-200 cursor-pointer p-0"
            title="Mark as Read"
          >
            <Check size={14} strokeWidth={2.5} />
          </Button>
        )}

        <Button
          onClick={() => onDelete(notification._id)}
          className="w-8 h-8 rounded-lg border border-[#E5E7EB] bg-white flex items-center justify-center text-slate-500 hover:text-red-600 hover:bg-red-50/50 hover:border-red-200 transition-all duration-200 cursor-pointer p-0"
          title="Archive Notification"
        >
          <Archive size={14} strokeWidth={2.5} />
        </Button>
      </div>
    </div>
  );
};

export default NotificationItem;

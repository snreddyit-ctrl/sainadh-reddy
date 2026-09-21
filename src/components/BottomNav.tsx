import React from 'react';
import { LayoutDashboard, Receipt, Clock, PlusCircle, CreditCard, Building2, Sliders } from 'lucide-react';
import { ActiveScreen } from '../types';

interface BottomNavProps {
  activeScreen: ActiveScreen;
  onNavigate: (screen: ActiveScreen) => void;
  pendingCount: number;
  pendingApprovalsCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeScreen,
  onNavigate,
  pendingCount,
  pendingApprovalsCount = 0,
}) => {
  const navItems = [
    { id: 'home' as ActiveScreen, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'all_bills' as ActiveScreen, label: 'All Bills', icon: Receipt },
    { id: 'pending_bills' as ActiveScreen, label: 'Pending', icon: Clock, badge: pendingCount },
    { id: 'add_invoice' as ActiveScreen, label: 'Add Bill', icon: PlusCircle },
    { id: 'add_payment' as ActiveScreen, label: 'Payment', icon: CreditCard },
    { id: 'root_pending' as ActiveScreen, label: 'Roots', icon: Building2 },
    { id: 'app_management' as ActiveScreen, label: 'App Mgmt', icon: Sliders, badge: pendingApprovalsCount },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200/80 shadow-md pb-safe lg:hidden">
      <div className="max-w-lg mx-auto px-1 flex items-center justify-between">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeScreen === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`relative py-2 px-1 flex flex-col items-center justify-center transition-colors flex-1 min-w-0 cursor-pointer ${
                isActive ? 'text-blue-700 font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div className="relative">
                <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${isActive ? 'stroke-[2.4px]' : 'stroke-2'}`} />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 bg-red-600 text-white text-[8px] font-black px-1 rounded-full min-w-[14px] text-center shadow-xs animate-pulse">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span className="text-[9px] sm:text-[10px] mt-1 tracking-tight truncate max-w-full">
                {item.label}
              </span>
              {isActive && (
                <span className="w-1.5 h-1 bg-blue-700 rounded-full mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

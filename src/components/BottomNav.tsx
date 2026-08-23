import React from 'react';
import { LayoutDashboard, Receipt, Clock, PlusCircle, CreditCard, Building2 } from 'lucide-react';
import { ActiveScreen } from '../types';

interface BottomNavProps {
  activeScreen: ActiveScreen;
  onNavigate: (screen: ActiveScreen) => void;
  pendingCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeScreen,
  onNavigate,
  pendingCount,
}) => {
  const navItems = [
    { id: 'home' as ActiveScreen, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'all_bills' as ActiveScreen, label: 'All Bills', icon: Receipt },
    { id: 'pending_bills' as ActiveScreen, label: 'Pending', icon: Clock, badge: pendingCount },
    { id: 'add_invoice' as ActiveScreen, label: 'Add Bill', icon: PlusCircle },
    { id: 'add_payment' as ActiveScreen, label: 'Payment', icon: CreditCard },
    { id: 'root_pending' as ActiveScreen, label: 'Roots', icon: Building2 },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-sm pb-safe lg:hidden">
      <div className="max-w-md mx-auto px-2 flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeScreen === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`relative py-2.5 px-2 flex flex-col items-center justify-center transition-colors min-w-[50px] ${
                isActive ? 'text-blue-700 font-semibold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.2px]' : 'stroke-2'}`} />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full min-w-[15px] text-center shadow-xs">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-1 tracking-tight">{item.label}</span>
              {isActive && (
                <span className="w-1 h-1 bg-blue-700 rounded-full mt-0.5"></span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

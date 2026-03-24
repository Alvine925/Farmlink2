import React from 'react';
import { User, Star, MessageSquare } from 'lucide-react';
import { UserProfile } from '../../types';

interface CustomerData {
  id: string;
  profile: UserProfile | null;
  orderCount: number;
  totalSpent: number;
  lastOrderDate: string | null;
}

interface CustomersTabProps {
  uniqueCustomers: CustomerData[];
  profile: UserProfile | null;
  togglePreferredPartner: (id: string) => void;
  openChat: (userId: string, userName: string) => void;
}

export const CustomersTab: React.FC<CustomersTabProps> = ({
  uniqueCustomers,
  profile,
  togglePreferredPartner,
  openChat
}) => {
  return (
    <div className="bg-white rounded-3xl border border-stone-100 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-stone-100 flex justify-between items-center">
        <h2 className="font-bold text-lg">Your Customers</h2>
        <div className="flex items-center gap-2 text-xs text-stone-400">
          <User className="w-4 h-4" />
          <span>{uniqueCustomers.length} unique buyers</span>
        </div>
      </div>
      <div className="divide-y divide-stone-50">
        {uniqueCustomers.map(customer => (
          <div key={customer.id} className="p-6 flex items-center justify-between hover:bg-stone-50 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 overflow-hidden border border-stone-200">
                {customer.profile?.photoURL ? (
                  <img src={customer.profile.photoURL} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-6 h-6" />
                )}
              </div>
              <div>
                <p className="font-bold text-stone-900">{customer.profile?.displayName || 'Anonymous Buyer'}</p>
                <p className="text-xs text-stone-500">{customer.profile?.email}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                    {customer.orderCount} Orders
                  </span>
                  <span className="text-[10px] font-bold text-stone-500">
                    Total Spent: ${(customer.totalSpent || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right hidden md:block">
                <p className="text-[10px] font-bold text-stone-400 uppercase">Last Order</p>
                <p className="text-xs text-stone-600">
                  {customer.lastOrderDate ? new Date(customer.lastOrderDate).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <button 
                onClick={() => togglePreferredPartner(customer.id)}
                className={`p-3 rounded-xl transition-all shadow-sm border ${
                  profile?.preferredPartners?.includes(customer.id)
                    ? 'bg-yellow-50 text-yellow-600 border-yellow-200'
                    : 'bg-white text-stone-400 border-stone-200 hover:text-yellow-600 hover:border-yellow-200'
                }`}
                title={profile?.preferredPartners?.includes(customer.id) ? "Remove from Preferred" : "Add to Preferred"}
              >
                <Star className={`w-5 h-5 ${profile?.preferredPartners?.includes(customer.id) ? 'fill-current' : ''}`} />
              </button>
              <button 
                onClick={() => openChat(customer.id, customer.profile?.displayName || 'Buyer')}
                className="p-3 bg-white border border-stone-200 rounded-xl text-stone-600 hover:text-emerald-700 hover:border-emerald-200 transition-all shadow-sm"
              >
                <MessageSquare className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
        {uniqueCustomers.length === 0 && (
          <div className="text-center py-20 text-stone-400">
            <User className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>No customers yet. Your buyers will appear here once they place an order.</p>
          </div>
        )}
      </div>
    </div>
  );
};

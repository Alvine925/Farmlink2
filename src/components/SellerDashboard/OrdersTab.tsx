import React from 'react';
import { FileText, ShoppingBag, Filter } from 'lucide-react';
import { Order } from '../../types';
import { SellerOrderDetails } from './SellerOrderDetails';
import { exportOrdersToCSV } from '../../services/csvService';
import { exportOrdersToPDF } from '../../services/pdfService';

interface OrdersTabProps {
  selectedOrderId: string | null;
  setSelectedOrderId: (id: string | null) => void;
  filteredOrders: Order[];
  orderStatusFilter: string;
  setOrderStatusFilter: (status: any) => void;
  orderStartDate: string;
  setOrderStartDate: (date: string) => void;
  orderEndDate: string;
  setOrderEndDate: (date: string) => void;
  isFarmer: boolean;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  openChat: (userId: string, userName: string) => void;
}

export const OrdersTab: React.FC<OrdersTabProps> = ({
  selectedOrderId,
  setSelectedOrderId,
  filteredOrders,
  orderStatusFilter,
  setOrderStatusFilter,
  orderStartDate,
  setOrderStartDate,
  orderEndDate,
  setOrderEndDate,
  isFarmer,
  showToast,
  openChat
}) => {
  return (
    <div className="space-y-6">
      {selectedOrderId ? (
        <SellerOrderDetails 
          orderId={selectedOrderId} 
          onBack={() => setSelectedOrderId(null)} 
          showToast={showToast}
          openChat={openChat}
        />
      ) : (
        <div className="bg-white rounded-3xl border border-stone-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-stone-100 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg">Manage Orders</h2>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => exportOrdersToCSV(filteredOrders, `FarmLink_Orders_${new Date().toISOString().split('T')[0]}.csv`)}
                  className="flex items-center gap-2 px-4 py-2 bg-stone-100 text-stone-700 rounded-xl text-xs font-bold hover:bg-stone-200 transition-colors"
                  title="Export to CSV"
                >
                  <FileText className="w-4 h-4" />
                  Export CSV
                </button>
                <button 
                  onClick={() => exportOrdersToPDF(filteredOrders, isFarmer ? 'Farmer Orders Report' : 'Retailer Orders Report')}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-colors"
                >
                  <ShoppingBag className="w-4 h-4" />
                  Export PDF
                </button>
                <div className="flex items-center gap-2 text-xs text-stone-400">
                  <Filter className="w-3 h-3" />
                  <span>{filteredOrders.length} orders found</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 pt-2">
              <div className="flex-1 min-w-[120px]">
                <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Status</label>
                <select 
                  value={orderStatusFilter}
                  onChange={(e) => setOrderStatusFilter(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="accepted">Accepted</option>
                  <option value="fulfilled">Fulfilled</option>
                  <option value="completed">Completed</option>
                  <option value="declined">Declined</option>
                </select>
              </div>
              <div className="flex-1 min-w-[120px]">
                <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">From</label>
                <input 
                  type="date"
                  value={orderStartDate}
                  onChange={(e) => setOrderStartDate(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <div className="flex-1 min-w-[120px]">
                <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">To</label>
                <input 
                  type="date"
                  value={orderEndDate}
                  onChange={(e) => setOrderEndDate(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              {(orderStatusFilter !== 'all' || orderStartDate || orderEndDate) && (
                <div className="flex items-end">
                  <button 
                    onClick={() => {
                      setOrderStatusFilter('all');
                      setOrderStartDate('');
                      setOrderEndDate('');
                    }}
                    className="px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="p-6 space-y-4">
            {filteredOrders.map(o => (
              <div key={o.id} className="p-4 rounded-2xl bg-stone-50 border border-stone-100 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-sm">Order #{o.id.slice(0, 6)}</p>
                    <p className="text-xs text-stone-500">
                      ${(o.totalAmount || 0).toFixed(2)} • {o.items.length} items • 
                      <span className="capitalize"> {o.deliveryMethod}{o.deliveryOption ? ` (${o.deliveryOption})` : ''}</span>
                    </p>
                    <p className="text-[10px] mt-1 font-medium text-stone-400">
                      Delivery Date: {(o.status === 'pending' || o.status === 'accepted') ? (
                        <span className="italic">Not yet scheduled</span>
                      ) : (
                        <span className="text-emerald-600 font-bold">
                          {o.fulfilledAt ? new Date(o.fulfilledAt).toLocaleDateString() : 'Processing...'}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      o.status === 'pending' ? 'bg-amber-100 text-amber-700' : 
                      o.status === 'accepted' ? 'bg-blue-100 text-blue-700' :
                      o.status === 'shipped' ? 'bg-orange-100 text-orange-700' :
                      o.status === 'received' ? 'bg-purple-100 text-purple-700' :
                      o.status === 'fulfilled' ? 'bg-emerald-100 text-emerald-700' :
                      o.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {o.status}
                    </span>
                    <button 
                      onClick={() => setSelectedOrderId(o.id)}
                      className="px-4 py-2 bg-white border border-stone-100 text-stone-700 rounded-xl text-xs font-bold hover:bg-stone-50 transition-colors shadow-sm"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {filteredOrders.length === 0 && (
              <div className="py-12 text-center text-stone-400">No orders found matching your filters.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

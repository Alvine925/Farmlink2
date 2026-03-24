import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, FileText, Clock, CheckCircle, Truck, Package, XCircle, 
  User, Mail, Phone, MessageSquare, MapPin, ExternalLink, CreditCard 
} from 'lucide-react';
import { doc, onSnapshot, getDoc, updateDoc, addDoc, collection } from 'firebase/firestore';
import { db } from '../../firebase';
import { Order, UserProfile } from '../../types';
import { exportOrderToPDF } from '../../services/pdfService';
import { Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';

interface SellerOrderDetailsProps {
  orderId: string;
  onBack: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  openChat: (userId: string, userName: string) => void;
}

export const SellerOrderDetails: React.FC<SellerOrderDetailsProps> = ({ 
  orderId, 
  onBack, 
  showToast, 
  openChat 
}) => {
  const [order, setOrder] = useState<Order | null>(null);
  const [buyerProfile, setBuyerProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'orders', orderId), (docSnap) => {
      if (docSnap.exists()) {
        const orderData = { id: docSnap.id, ...docSnap.data() } as Order;
        setOrder(orderData);
        
        // Fetch buyer profile
        getDoc(doc(db, 'users', orderData.buyerId)).then(profileSnap => {
          if (profileSnap.exists()) {
            setBuyerProfile(profileSnap.data() as UserProfile);
          }
        });
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [orderId]);

  const updateStatus = async (newStatus: Order['status'], additionalData: any = {}) => {
    if (!order) return;
    setUpdating(true);
    try {
      const updateData: any = { status: newStatus, ...additionalData };
      const timestamp = new Date().toISOString();

      if (newStatus === 'accepted') updateData.acceptedAt = timestamp;
      if (newStatus === 'shipped') updateData.shippedAt = timestamp;
      if (newStatus === 'received') updateData.receivedAt = timestamp;
      if (newStatus === 'fulfilled') updateData.fulfilledAt = timestamp;
      if (newStatus === 'completed') updateData.completedAt = timestamp;
      if (newStatus === 'declined') updateData.declinedAt = timestamp;

      await updateDoc(doc(db, 'orders', order.id), updateData);

      await addDoc(collection(db, 'notifications'), {
        userId: order.buyerId,
        title: 'Order Update',
        message: `Your order #${order.id.slice(-8).toUpperCase()} is now ${newStatus}.`,
        type: 'order_status',
        relatedId: order.id,
        read: false,
        createdAt: timestamp
      });

      showToast(`Order marked as ${newStatus}`);
    } catch (error) {
      console.error("Error updating order:", error);
      showToast('Failed to update order status', 'error');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-700"></div></div>;
  if (!order) return <div className="text-center py-12 text-stone-400">Order not found.</div>;

  const timeline = [
    { status: 'pending', label: 'Order Placed', date: order.createdAt, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50' },
    { status: 'accepted', label: 'Accepted', date: order.acceptedAt, icon: CheckCircle, color: 'text-blue-500', bg: 'bg-blue-50' },
    { status: 'shipped', label: 'Shipped', date: order.shippedAt, icon: Truck, color: 'text-orange-500', bg: 'bg-orange-50' },
    { status: 'received', label: 'Received by Buyer', date: order.receivedAt, icon: Package, color: 'text-purple-500', bg: 'bg-purple-50' },
    { status: 'fulfilled', label: 'Fulfilled', date: order.fulfilledAt, icon: Truck, color: 'text-indigo-500', bg: 'bg-indigo-50' },
    { status: 'completed', label: 'Completed', date: order.completedAt, icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  ];

  if (order.status === 'declined') {
    timeline.push({ status: 'declined', label: 'Declined', date: order.declinedAt, icon: XCircle, color: 'text-red-500', bg: 'bg-red-50' });
  }

  const subtotal = order.items.reduce((acc, item) => acc + (item.price || 0) * (item.quantity || 0), 0);
  const total = subtotal + (order.deliveryFee || 0);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-stone-500 hover:text-stone-900 transition-colors mb-4 group"
      >
        <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        <span className="font-medium">Back to Orders List</span>
      </button>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Order Details</h1>
          <p className="text-stone-500 font-mono text-sm">#{order.id.toUpperCase()}</p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => exportOrderToPDF(order)}
            className="flex items-center gap-2 px-4 py-2 bg-stone-100 text-stone-700 rounded-xl text-xs font-bold hover:bg-stone-200 transition-colors"
          >
            <FileText className="w-4 h-4" />
            Export PDF
          </button>
          <div className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider w-fit ${
            order.status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
            order.status === 'pending' ? 'bg-amber-50 text-amber-700' :
            order.status === 'shipped' ? 'bg-orange-50 text-orange-700' :
            order.status === 'received' ? 'bg-purple-50 text-purple-700' :
            order.status === 'declined' ? 'bg-red-50 text-red-700' :
            'bg-blue-50 text-blue-700'
          }`}>
            {order.status}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Timeline */}
          <div className="bg-white p-8 rounded-3xl border border-stone-100 shadow-sm">
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-600" />
              Order Tracking
            </h2>
            <div className="relative space-y-8">
              {timeline.filter(t => t.date).map((step, index, arr) => (
                <div key={step.status} className="flex gap-4 relative">
                  {index < arr.length - 1 && (
                    <div className="absolute left-5 top-10 bottom-[-2rem] w-0.5 bg-stone-100"></div>
                  )}
                  <div className={`w-10 h-10 rounded-full ${step.bg} ${step.color} flex items-center justify-center flex-shrink-0 z-10`}>
                    <step.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-stone-900">{step.label}</p>
                    <p className="text-sm text-stone-500">
                      {new Date(step.date!).toLocaleDateString()} at {new Date(step.date!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Items */}
          <div className="bg-white p-8 rounded-3xl border border-stone-100 shadow-sm">
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
              <Package className="w-5 h-5 text-emerald-600" />
              Order Items
            </h2>
            <div className="divide-y divide-stone-50">
              {order.items.map((item, idx) => (
                <div key={idx} className="py-4 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-stone-900">{item.name}</p>
                    <p className="text-sm text-stone-500">{item.quantity} units x ${(item.price || 0).toFixed(2)}</p>
                  </div>
                  <p className="font-bold text-stone-900">${((item.quantity || 0) * (item.price || 0)).toFixed(2)}</p>
                </div>
              ))}
              <div className="pt-4 space-y-2">
                <div className="flex justify-between text-stone-500 text-sm">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-stone-500 text-sm">
                  <span>Delivery Fee</span>
                  <span>${(order.deliveryFee || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-stone-900 pt-2 border-t border-stone-50">
                  <span>Total</span>
                  <span className="text-emerald-700">${total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          {order.status !== 'completed' && order.status !== 'declined' && (
            <div className="bg-emerald-50 p-8 rounded-3xl border border-emerald-100">
              <h2 className="text-lg font-bold text-emerald-900 mb-4">Update Order Status</h2>
              <div className="flex flex-wrap gap-4">
                {order.status === 'pending' && (
                  <>
                    <button 
                      onClick={() => updateStatus('accepted')}
                      disabled={updating}
                      className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-md flex items-center gap-2"
                    >
                      <CheckCircle className="w-5 h-5" />
                      Accept Order
                    </button>
                    <button 
                      onClick={() => updateStatus('declined')}
                      disabled={updating}
                      className="bg-white text-red-600 border border-red-100 px-6 py-3 rounded-2xl font-bold hover:bg-red-50 transition-all"
                    >
                      Decline Order
                    </button>
                  </>
                )}
                {order.status === 'accepted' && (
                  <button 
                    onClick={() => {
                      const tracking = prompt("Enter tracking number (optional):");
                      const carrier = prompt("Enter carrier name (optional):");
                      updateStatus('shipped', { trackingNumber: tracking || '', carrier: carrier || '' });
                    }}
                    disabled={updating}
                    className="bg-orange-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-orange-700 transition-all shadow-md flex items-center gap-2"
                  >
                    <Truck className="w-5 h-5" />
                    Mark as Shipped
                  </button>
                )}
                {order.status === 'shipped' && (
                  <div className="flex flex-col gap-2">
                    <button 
                      disabled={true}
                      className="bg-stone-100 text-stone-400 px-6 py-3 rounded-2xl font-bold cursor-not-allowed flex items-center gap-2"
                    >
                      <Clock className="w-5 h-5" />
                      Waiting for Buyer Receipt
                    </button>
                    <p className="text-sm text-stone-500 italic">The buyer must confirm they have received the products before you can mark this as fulfilled.</p>
                  </div>
                )}
                {order.status === 'received' && (
                  <button 
                    onClick={() => updateStatus('fulfilled')}
                    disabled={updating}
                    className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-md flex items-center gap-2"
                  >
                    <Truck className="w-5 h-5" />
                    Mark as Fulfilled
                  </button>
                )}
                {order.status === 'fulfilled' && (
                  <button 
                    onClick={() => updateStatus('completed')}
                    disabled={updating}
                    className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-md flex items-center gap-2"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Mark as Completed
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-8">
          {/* Customer Details */}
          <div className="bg-white p-8 rounded-3xl border border-stone-100 shadow-sm">
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
              <User className="w-5 h-5 text-emerald-600" />
              Customer Details
            </h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center flex-shrink-0 overflow-hidden border border-stone-50">
                  {buyerProfile?.photoURL ? (
                    <img src={buyerProfile.photoURL} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-6 h-6 text-stone-400" />
                  )}
                </div>
                <div>
                  <p className="font-bold text-stone-900">{buyerProfile?.displayName || order.buyerName}</p>
                  <p className="text-xs text-stone-500">Buyer</p>
                </div>
              </div>
              <div className="space-y-3 pt-4 border-t border-stone-50">
                <div className="flex items-center gap-3 text-stone-600">
                  <Mail className="w-4 h-4" />
                  <span className="text-sm">{buyerProfile?.email || order.buyerEmail}</span>
                </div>
                {(buyerProfile?.phone || order.buyerPhone) && (
                  <div className="flex items-center gap-3 text-stone-600">
                    <Phone className="w-4 h-4" />
                    <span className="text-sm">{buyerProfile?.phone || order.buyerPhone}</span>
                  </div>
                )}
                <button 
                  onClick={() => openChat(order.buyerId, buyerProfile?.displayName || order.buyerName)}
                  className="w-full mt-2 bg-stone-50 text-stone-700 py-3 rounded-xl font-bold hover:bg-stone-100 transition-all flex items-center justify-center gap-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  Message Buyer
                </button>
              </div>
            </div>
          </div>

          {/* Delivery Info */}
          <div className="bg-white p-8 rounded-3xl border border-stone-100 shadow-sm">
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
              <Truck className="w-5 h-5 text-emerald-600" />
              Delivery Info
            </h2>
            <div className="space-y-6">
              <div>
                <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">Method</p>
                <div className="flex items-center gap-2 text-stone-900 font-bold">
                  {order.deliveryMethod === 'delivery' ? <Truck className="w-4 h-4" /> : <Package className="w-4 h-4" />}
                  <span className="capitalize">{order.deliveryMethod}</span>
                  {order.deliveryOption && (
                    <span className="text-xs font-normal text-stone-500">({order.deliveryOption})</span>
                  )}
                </div>
              </div>

              {order.deliveryMethod === 'delivery' && (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">Address</p>
                    <div className="flex items-start gap-2 text-stone-900">
                      <MapPin className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-1" />
                      <div className="space-y-1">
                        <p className="text-sm font-bold">{order.deliveryAddress || 'No address provided'}</p>
                        {order.deliveryDetails && (
                          <div className="text-xs text-stone-500 space-y-1">
                            {(order.deliveryDetails.estateName || order.deliveryDetails.blockOrApartment) && (
                              <p>
                                {order.deliveryDetails.estateName && `Estate: ${order.deliveryDetails.estateName}`}
                                {order.deliveryDetails.estateName && order.deliveryDetails.blockOrApartment && ' • '}
                                {order.deliveryDetails.blockOrApartment && `Block/Apt: ${order.deliveryDetails.blockOrApartment}`}
                              </p>
                            )}
                            {order.deliveryDetails.landmark && (
                              <p>Landmark: {order.deliveryDetails.landmark}</p>
                            )}
                            {order.deliveryDetails.directionsNarrative && (
                              <div className="mt-2 p-3 bg-stone-50 rounded-xl border border-stone-100 italic">
                                "{order.deliveryDetails.directionsNarrative}"
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {order.deliveryDetails?.googlePin && (
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-stone-400 uppercase tracking-wider">Pinned Location</p>
                      <div className="h-48 rounded-2xl overflow-hidden border border-stone-100 relative group">
                        <Map
                          defaultCenter={{ lat: order.deliveryDetails.googlePin.lat, lng: order.deliveryDetails.googlePin.lng }}
                          defaultZoom={15}
                          mapId="DEMO_MAP_ID"
                          gestureHandling={'none'}
                          disableDefaultUI={true}
                          className="w-full h-full"
                        >
                          <AdvancedMarker position={{ lat: order.deliveryDetails.googlePin.lat, lng: order.deliveryDetails.googlePin.lng }}>
                            <Pin background="#10b981" glyphColor="#fff" />
                          </AdvancedMarker>
                        </Map>
                        <a 
                          href={`https://www.google.com/maps/search/?api=1&query=${order.deliveryDetails.googlePin.lat},${order.deliveryDetails.googlePin.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-sm p-2 rounded-lg shadow-sm text-emerald-600 hover:text-emerald-700 transition-colors flex items-center gap-1 text-[10px] font-bold"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Open in Maps
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div>
                <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">Payment</p>
                <div className="flex items-center gap-2 text-stone-900 font-bold">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm">{order.paymentMethod}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

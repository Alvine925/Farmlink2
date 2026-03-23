import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, updateDoc, addDoc, collection } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Order } from '../types';
import { 
  Package, Truck, CheckCircle, Clock, XCircle, MapPin, User, Phone, 
  Mail, Calendar, CreditCard, ChevronLeft, AlertCircle, ArrowRight, Navigation, ExternalLink, Star
} from 'lucide-react';
import { motion } from 'motion/react';
import { Toast } from '../components/Toast';
import { ReviewModal } from '../components/ReviewModal';
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';

const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  '';

export const OrderDetails: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [shippingModal, setShippingModal] = useState({
    isOpen: false,
    trackingNumber: '',
    carrier: ''
  });
  const [reviewModal, setReviewModal] = useState<{
    isOpen: boolean;
    targetId: string;
    targetType: 'product' | 'seller';
    targetName: string;
  }>({
    isOpen: false,
    targetId: '',
    targetType: 'product',
    targetName: ''
  });
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; isVisible: boolean }>({
    message: '',
    type: 'success',
    isVisible: false
  });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type, isVisible: true });
  };

  useEffect(() => {
    if (!orderId) return;

    const unsubscribe = onSnapshot(doc(db, 'orders', orderId), (docSnap) => {
      if (docSnap.exists()) {
        setOrder({ id: docSnap.id, ...docSnap.data() } as Order);
      } else {
        showToast('Order not found', 'error');
        setTimeout(() => navigate('/dashboard'), 2000);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [orderId]);

  const updateOrderStatus = async (newStatus: Order['status'], additionalData: any = {}) => {
    if (!order || !user) return;
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

      // Create notification for buyer
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-700"></div>
      </div>
    );
  }

  if (!order) return null;

  const isFarmer = user?.uid === order.farmerId;
  const isBuyer = user?.uid === order.buyerId;
  const isAdmin = profile?.role === 'admin';

  const timeline = [
    { status: 'pending', label: 'Order Placed', date: order.createdAt, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50' },
    { status: 'accepted', label: 'Accepted', date: order.acceptedAt, icon: CheckCircle, color: 'text-blue-500', bg: 'bg-blue-50' },
    { status: 'shipped', label: 'Shipped', date: order.shippedAt, icon: Truck, color: 'text-orange-500', bg: 'bg-orange-50' },
    { status: 'received', label: 'Received', date: order.receivedAt, icon: Package, color: 'text-purple-500', bg: 'bg-purple-50' },
    { status: 'fulfilled', label: 'Fulfilled', date: order.fulfilledAt, icon: Truck, color: 'text-indigo-500', bg: 'bg-indigo-50' },
    { status: 'completed', label: 'Completed', date: order.completedAt, icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  ];

  if (order.status === 'declined') {
    timeline.push({ status: 'declined', label: 'Declined', date: order.declinedAt, icon: XCircle, color: 'text-red-500', bg: 'bg-red-50' });
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-8">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-stone-500 hover:text-stone-900 transition-colors mb-4"
      >
        <ChevronLeft className="w-5 h-5" />
        <span className="font-medium">Back to Dashboard</span>
      </button>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-stone-900">Order Details</h1>
          <p className="text-stone-500 font-mono">#{order.id.toUpperCase()}</p>
        </div>
        <div className={`px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wider ${
          order.status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
          order.status === 'pending' ? 'bg-amber-50 text-amber-700' :
          order.status === 'declined' ? 'bg-red-50 text-red-700' :
          'bg-blue-50 text-blue-700'
        }`}>
          {order.status}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Order Info & Items */}
        <div className="lg:col-span-2 space-y-8">
          {/* Timeline */}
          <div className="bg-white p-8 rounded-3xl border border-stone-100 shadow-sm">
            <h2 className="text-lg font-bold mb-8 flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-600" />
              Order Tracking
            </h2>
            
            {order.status === 'declined' ? (
              <div className="flex items-center gap-4 p-6 bg-red-50 rounded-2xl border border-red-100">
                <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0">
                  <XCircle className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold text-red-900 text-lg">Order Declined</p>
                  <p className="text-red-600">This order was declined by the farmer on {new Date(order.declinedAt || order.createdAt).toLocaleDateString()}.</p>
                </div>
              </div>
            ) : (
              <div className="relative pt-4 pb-12">
                {/* Progress Bar Background */}
                <div className="absolute top-9 left-0 w-full h-1 bg-stone-100 rounded-full" />
                
                {/* Active Progress Bar */}
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ 
                    width: `${((['pending', 'accepted', 'shipped', 'received', 'fulfilled', 'completed'].indexOf(order.status)) / 5) * 100}%` 
                  }}
                  className="absolute top-9 left-0 h-1 bg-emerald-500 rounded-full transition-all duration-1000 ease-out"
                />

                <div className="relative flex justify-between">
                  {[
                    { status: 'pending', label: 'Placed', icon: Clock, date: order.createdAt },
                    { status: 'accepted', label: 'Accepted', icon: CheckCircle, date: order.acceptedAt },
                    { status: 'shipped', label: 'Shipped', icon: Truck, date: order.shippedAt },
                    { status: 'received', label: 'Received', icon: Package, date: order.receivedAt },
                    { status: 'fulfilled', label: 'Fulfilled', icon: Truck, date: order.fulfilledAt },
                    { status: 'completed', label: 'Completed', icon: CheckCircle, date: order.completedAt },
                  ].map((step, index) => {
                    const statusOrder = ['pending', 'accepted', 'shipped', 'received', 'fulfilled', 'completed'];
                    const currentStatusIndex = statusOrder.indexOf(order.status);
                    const stepIndex = statusOrder.indexOf(step.status);
                    const isCompleted = stepIndex <= currentStatusIndex;
                    const isCurrent = stepIndex === currentStatusIndex;

                    return (
                      <div key={step.status} className="flex flex-col items-center gap-3 flex-1 relative">
                        <motion.div 
                          animate={{ 
                            scale: isCurrent ? 1.2 : 1,
                            backgroundColor: isCompleted ? '#10b981' : '#ffffff',
                            color: isCompleted ? '#ffffff' : '#d1d5db',
                            borderColor: isCompleted ? '#10b981' : '#f3f4f6'
                          }}
                          className={`w-10 h-10 rounded-full flex items-center justify-center border-2 z-10 transition-colors duration-500 ${isCurrent ? 'ring-4 ring-emerald-100' : ''}`}
                        >
                          <step.icon className="w-5 h-5" />
                        </motion.div>
                        <div className="text-center px-2">
                          <p className={`text-xs font-bold ${isCompleted ? 'text-stone-900' : 'text-stone-300'}`}>{step.label}</p>
                          {step.date && (
                            <div className="mt-1">
                              <p className="text-[10px] text-stone-500">
                                {new Date(step.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                              </p>
                              <p className="text-[10px] text-stone-400">
                                {new Date(step.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
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
                  <span>${((order.totalAmount || 0) - (order.deliveryFee || 0)).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-stone-500 text-sm">
                  <span>Delivery Fee</span>
                  <span>${(order.deliveryFee || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-stone-900 pt-2 border-t border-stone-50">
                  <span>Total</span>
                  <span className="text-emerald-700">${(order.totalAmount || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Farmer Actions */}
          {isFarmer && order.status !== 'completed' && order.status !== 'declined' && (
            <div className="bg-emerald-50 p-8 rounded-3xl border border-emerald-100">
              <h2 className="text-lg font-bold text-emerald-900 mb-4">Update Order Status</h2>
              <p className="text-emerald-700 text-sm mb-6">Update the progress of this order to keep the buyer informed.</p>
              <div className="flex flex-wrap gap-4">
                {order.status === 'pending' && (
                  <>
                    <button 
                      onClick={() => updateOrderStatus('accepted')}
                      disabled={updating}
                      className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-md flex items-center gap-2"
                    >
                      <CheckCircle className="w-5 h-5" />
                      Accept Order
                    </button>
                    <button 
                      onClick={() => updateOrderStatus('declined')}
                      disabled={updating}
                      className="bg-white text-red-600 border border-red-100 px-6 py-3 rounded-2xl font-bold hover:bg-red-50 transition-all"
                    >
                      Decline Order
                    </button>
                  </>
                )}
                {order.status === 'accepted' && (
                  <button 
                    onClick={() => setShippingModal({ ...shippingModal, isOpen: true })}
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
                    onClick={() => updateOrderStatus('fulfilled')}
                    disabled={updating}
                    className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-md flex items-center gap-2"
                  >
                    <Truck className="w-5 h-5" />
                    Mark as Fulfilled
                  </button>
                )}
                {order.status === 'fulfilled' && (
                  <button 
                    onClick={() => updateOrderStatus('completed')}
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

        {/* Right Column: Customer & Delivery Info */}
        <div className="space-y-8">
          {/* Customer Info */}
          <div className="bg-white p-8 rounded-3xl border border-stone-100 shadow-sm">
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
              <User className="w-5 h-5 text-emerald-600" />
              {isFarmer ? 'Customer Details' : 'Farmer Details'}
            </h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-stone-400" />
                </div>
                <div>
                  <p className="font-bold text-stone-900">{isFarmer ? order.buyerName : order.farmerName}</p>
                  <p className="text-xs text-stone-500 capitalize">{isFarmer ? 'Buyer' : 'Farmer'}</p>
                </div>
              </div>
              <div className="space-y-3 pt-4 border-t border-stone-50">
                <div className="flex items-center gap-3 text-stone-600">
                  <Mail className="w-4 h-4" />
                  <span className="text-sm">{isFarmer ? order.buyerEmail : 'Contact through chat'}</span>
                </div>
                {isFarmer && order.buyerPhone && (
                  <div className="flex items-center gap-3 text-stone-600">
                    <Phone className="w-4 h-4" />
                    <span className="text-sm">{order.buyerPhone}</span>
                  </div>
                )}
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
              {order.trackingNumber && (
                <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 space-y-2">
                  <p className="text-xs font-bold text-orange-800 uppercase tracking-wider">Tracking Information</p>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-bold text-stone-900">{order.carrier || 'Carrier not specified'}</p>
                      <p className="text-xs text-stone-500">#{order.trackingNumber}</p>
                    </div>
                    <Truck className="w-5 h-5 text-orange-500" />
                  </div>
                </div>
              )}
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
                        <APIProvider apiKey={API_KEY}>
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
                        </APIProvider>
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

          {/* Buyer Actions */}
          {isBuyer && (
            <div className="bg-white p-8 rounded-3xl border border-stone-100 shadow-sm space-y-6">
              <h2 className="text-lg font-bold text-stone-900">Buyer Actions</h2>
              
              {order.status === 'accepted' && (
                <div className="p-6 bg-purple-50 rounded-2xl border border-purple-100">
                  <p className="text-purple-900 font-bold mb-2">Order Accepted!</p>
                  <p className="text-purple-700 text-sm mb-4">The seller has accepted your order and is preparing it for shipment.</p>
                </div>
              )}

              {order.status === 'shipped' && (
                <div className="p-6 bg-purple-50 rounded-2xl border border-purple-100">
                  <p className="text-purple-900 font-bold mb-2">Have you received your order?</p>
                  <p className="text-purple-700 text-sm mb-4">The seller has marked your order as shipped. Please confirm receipt once the products are in your hands.</p>
                  <button 
                    onClick={() => updateOrderStatus('received')}
                    disabled={updating}
                    className="bg-purple-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-purple-700 transition-all shadow-md flex items-center gap-2"
                  >
                    <Package className="w-5 h-5" />
                    Mark as Received
                  </button>
                </div>
              )}

              {order.status === 'completed' && (
                <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <p className="text-emerald-900 font-bold mb-2">Order Completed!</p>
                  <p className="text-emerald-700 text-sm mb-4">How was your experience? Leave a review for the products and the seller.</p>
                  <div className="flex flex-wrap gap-4">
                    <button 
                      onClick={() => setReviewModal({
                        isOpen: true,
                        targetId: order.farmerId,
                        targetType: 'seller',
                        targetName: order.farmerName
                      })}
                      className="bg-white text-emerald-700 border border-emerald-200 px-6 py-3 rounded-2xl font-bold hover:bg-emerald-50 transition-all flex items-center gap-2"
                    >
                      <Star className="w-5 h-5" />
                      Review Seller
                    </button>
                    {order.items.length > 0 && (
                      <button 
                        onClick={() => setReviewModal({
                          isOpen: true,
                          targetId: order.items[0].productId,
                          targetType: 'product',
                          targetName: order.items[0].name
                        })}
                        className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-md flex items-center gap-2"
                      >
                        <Star className="w-5 h-5" />
                        Review Product
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <ReviewModal 
        isOpen={reviewModal.isOpen}
        onClose={() => setReviewModal(prev => ({ ...prev, isOpen: false }))}
        targetId={reviewModal.targetId}
        targetType={reviewModal.targetType}
        targetName={reviewModal.targetName}
        onSuccess={() => showToast('Review submitted successfully!')}
      />

      <Toast 
        message={toast.message} 
        type={toast.type} 
        isVisible={toast.isVisible} 
        onClose={() => setToast(prev => ({ ...prev, isVisible: false }))} 
      />

      {/* Shipping Modal */}
      {shippingModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-stone-900">Shipping Details</h3>
              <button 
                onClick={() => setShippingModal({ ...shippingModal, isOpen: false })}
                className="text-stone-400 hover:text-stone-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-1">Carrier (Optional)</label>
                <input 
                  type="text"
                  placeholder="e.g., FedEx, DHL, Local Courier"
                  value={shippingModal.carrier}
                  onChange={(e) => setShippingModal({ ...shippingModal, carrier: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-1">Tracking Number (Optional)</label>
                <input 
                  type="text"
                  placeholder="Enter tracking number"
                  value={shippingModal.trackingNumber}
                  onChange={(e) => setShippingModal({ ...shippingModal, trackingNumber: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button 
                onClick={() => setShippingModal({ ...shippingModal, isOpen: false })}
                className="flex-1 px-6 py-3 rounded-2xl font-bold text-stone-600 bg-stone-100 hover:bg-stone-200 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  updateOrderStatus('shipped', {
                    carrier: shippingModal.carrier,
                    trackingNumber: shippingModal.trackingNumber
                  });
                  setShippingModal({ ...shippingModal, isOpen: false });
                }}
                disabled={updating}
                className="flex-1 px-6 py-3 rounded-2xl font-bold text-white bg-orange-600 hover:bg-orange-700 transition-all shadow-lg"
              >
                Mark Shipped
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

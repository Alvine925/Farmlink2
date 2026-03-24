import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { collection, addDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { Trash2, ShoppingBag, ArrowRight, CreditCard, Truck, CheckCircle, Zap, MapPin, ChevronDown, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Toast } from '../components/Toast';
import { sendOrderNotificationToFarmer, sendOrderConfirmationToBuyer } from '../services/emailService';

export const Cart: React.FC = () => {
  const { items, removeFromCart, total, clearCart } = useCart();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState<'pickup' | 'delivery'>('delivery');
  const [deliveryOption, setDeliveryOption] = useState<'standard' | 'express'>('standard');
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [selectedPaymentId, setSelectedPaymentId] = useState<string>('');
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; isVisible: boolean }>({
    message: '',
    type: 'success',
    isVisible: false
  });

  useEffect(() => {
    if (profile) {
      // Set default address
      const defaultAddr = profile.savedAddresses?.find(a => a.isDefault) || profile.savedAddresses?.[0];
      if (defaultAddr) setSelectedAddressId(defaultAddr.id);

      // Set default payment
      const defaultPay = profile.savedPaymentMethods?.find(p => p.isDefault) || profile.savedPaymentMethods?.[0];
      if (defaultPay) setSelectedPaymentId(defaultPay.id);
    }
  }, [profile]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type, isVisible: true });
  };

  const deliveryFee = deliveryMethod === 'pickup' ? 0 : (deliveryOption === 'express' ? 12 : 5);
  const finalTotal = total + deliveryFee;

  const handleCheckout = async () => {
    if (!user || !profile) {
      navigate('/login');
      return;
    }

    if (items.length === 0) return;

    if (deliveryMethod === 'delivery' && !selectedAddressId) {
      showToast('Please select a delivery address', 'error');
      return;
    }

    if (!selectedPaymentId) {
      showToast('Please select a payment method', 'error');
      return;
    }

    setLoading(true);
    try {
      const selectedAddress = profile.savedAddresses?.find(a => a.id === selectedAddressId);
      const selectedPayment = profile.savedPaymentMethods?.find(p => p.id === selectedPaymentId);

      // In a real app, we'd group items by farmer and create multiple orders
      const farmerId = items[0].farmerId;
      const farmerName = items[0].farmerName;
      const buyerName = profile.displayName || 'Buyer';

      const orderRef = await addDoc(collection(db, 'orders'), {
        buyerId: user.uid,
        buyerName: buyerName,
        buyerEmail: profile.email,
        buyerPhone: profile.phone || '',
        farmerId: farmerId,
        farmerName: farmerName,
        items: items.map(i => ({
          productId: i.id,
          name: i.name,
          quantity: i.cartQuantity,
          price: i.price
        })),
        totalAmount: finalTotal,
        status: 'pending',
        deliveryMethod,
        deliveryOption: deliveryMethod === 'delivery' ? deliveryOption : null,
        deliveryFee,
        deliveryAddress: deliveryMethod === 'delivery' ? (selectedAddress?.address || profile.location?.address || '') : null,
        deliveryDetails: deliveryMethod === 'delivery' && selectedAddress ? {
          estateName: selectedAddress.estateName,
          landmark: selectedAddress.landmark,
          blockOrApartment: selectedAddress.blockOrApartment,
          directionsNarrative: selectedAddress.directionsNarrative,
          googlePin: selectedAddress.googlePin
        } : null,
        paymentMethod: selectedPayment ? `${selectedPayment.type === 'card' ? 'Card' : 'Mobile Money'} (${selectedPayment.provider}${selectedPayment.lastFour ? ` ****${selectedPayment.lastFour}` : ''})` : 'Other',
        createdAt: new Date().toISOString()
      });

      // Fetch farmer email for notification
      const farmerDoc = await getDoc(doc(db, 'users', farmerId));
      const farmerEmail = farmerDoc.data()?.email;

      if (farmerEmail) {
        try {
          await sendOrderNotificationToFarmer(farmerEmail, orderRef.id, finalTotal, buyerName);
        } catch (emailError) {
          console.error("Failed to send email to farmer:", emailError);
        }
      }

      // Send confirmation email to buyer
      if (profile.email) {
        try {
          await sendOrderConfirmationToBuyer(profile.email, orderRef.id, finalTotal, farmerName);
        } catch (emailError) {
          console.error("Failed to send confirmation email to buyer:", emailError);
        }
      }

      // Create notification for farmer
      await addDoc(collection(db, 'notifications'), {
        userId: farmerId,
        title: 'New Order Received!',
        message: `You have a new order for $${(finalTotal || 0).toFixed(2)}.`,
        type: 'order',
        read: false,
        createdAt: new Date().toISOString()
      });

      clearCart();
      setOrderSuccess(true);
    } catch (error) {
      console.error("Checkout error:", error);
      showToast('Failed to place order. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (orderSuccess) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md mx-auto text-center py-20"
      >
        <div className="bg-emerald-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 text-emerald-600">
          <CheckCircle className="w-12 h-12" />
        </div>
        <h2 className="text-3xl font-bold mb-4">Order Placed!</h2>
        <p className="text-stone-500 mb-10">Your order has been sent to the farmer. You can track its progress in your dashboard.</p>
        <div className="space-y-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full bg-emerald-700 text-white py-4 rounded-2xl font-bold hover:bg-emerald-800 transition-all shadow-lg"
          >
            Go to Dashboard
          </button>
          <button
            onClick={() => navigate('/marketplace')}
            className="w-full bg-stone-100 text-stone-700 py-4 rounded-2xl font-bold hover:bg-stone-200 transition-all"
          >
            Continue Shopping
          </button>
        </div>
      </motion.div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="bg-stone-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-stone-400">
          <ShoppingBag className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Your cart is empty</h2>
        <p className="text-stone-500 mb-8">Looks like you haven't added any fresh produce yet.</p>
        <button
          onClick={() => navigate('/marketplace')}
          className="bg-emerald-700 text-white px-8 py-3 rounded-full font-bold hover:bg-emerald-800 transition-all"
        >
          Start Shopping
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
      <div className="lg:col-span-2 space-y-6">
        <h1 className="text-3xl font-bold mb-8">Your Shopping Cart</h1>
        {items.map(item => (
          <div key={item.id} className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm flex items-center gap-6">
            <div className="w-24 h-24 rounded-2xl bg-stone-100 overflow-hidden flex-shrink-0">
              <img src={item.images?.[0] || `https://picsum.photos/seed/${item.id}/200/200`} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-lg">{item.name}</h3>
                  <p className="text-sm text-stone-500">By {item.farmerName}</p>
                </div>
                <button onClick={() => removeFromCart(item.id)} className="text-stone-400 hover:text-red-600 transition-colors">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
              <div className="flex justify-between items-end mt-4">
                <div className="flex items-center gap-4 bg-stone-50 px-3 py-1 rounded-lg border border-stone-100">
                  <span className="text-sm font-bold">{item.cartQuantity} {item.unit}</span>
                </div>
                <p className="font-bold text-emerald-700">${((item.price || 0) * (item.cartQuantity || 0)).toFixed(2)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-6">
        <div className="bg-white p-8 rounded-3xl border border-stone-100 shadow-xl sticky top-24">
          <h2 className="text-xl font-bold mb-6">Order Summary</h2>
          
          <div className="space-y-4 mb-6">
            <div className="flex justify-between text-stone-500">
              <span>Subtotal</span>
              <span>${(total || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-stone-500">
              <span>Delivery Fee {deliveryMethod === 'delivery' && `(${deliveryOption === 'express' ? 'Express' : 'Standard'})`}</span>
              <span>{(deliveryFee || 0) > 0 ? `$${(deliveryFee || 0).toFixed(2)}` : 'Free'}</span>
            </div>
            <div className="border-t border-stone-100 pt-4 flex justify-between font-bold text-xl">
              <span>Total</span>
              <span className="text-emerald-700">${(finalTotal || 0).toFixed(2)}</span>
            </div>
          </div>

          <div className="space-y-6">
            {/* Delivery Method */}
            <div className="space-y-3">
              <p className="text-sm font-bold text-stone-700">Delivery Method</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setDeliveryMethod('delivery')}
                  className={`p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                    deliveryMethod === 'delivery' ? 'border-emerald-600 bg-emerald-50 text-emerald-700' : 'border-stone-100 text-stone-500'
                  }`}
                >
                  <Truck className="w-5 h-5" />
                  <span className="text-xs font-bold">Delivery</span>
                </button>
                <button
                  onClick={() => setDeliveryMethod('pickup')}
                  className={`p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                    deliveryMethod === 'pickup' ? 'border-emerald-600 bg-emerald-50 text-emerald-700' : 'border-stone-100 text-stone-500'
                  }`}
                >
                  <ShoppingBag className="w-5 h-5" />
                  <span className="text-xs font-bold">Pickup</span>
                </button>
              </div>
            </div>

            {deliveryMethod === 'delivery' && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-4 overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-stone-700">Delivery Address</p>
                  <button 
                    onClick={() => navigate('/account?tab=addresses')}
                    className="text-[10px] text-emerald-600 font-bold hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add New
                  </button>
                </div>
                
                {profile?.savedAddresses && profile.savedAddresses.length > 0 ? (
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                    {profile.savedAddresses.map((addr) => (
                      <button
                        key={addr.id}
                        onClick={() => setSelectedAddressId(addr.id)}
                        className={`w-full p-3 rounded-xl border-2 text-left transition-all flex items-start gap-3 ${
                          selectedAddressId === addr.id
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                            : 'border-stone-100 text-stone-500'
                        }`}
                      >
                        <MapPin className={`w-4 h-4 mt-0.5 ${selectedAddressId === addr.id ? 'text-emerald-600' : 'text-stone-400'}`} />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold flex items-center gap-2">
                            {addr.label}
                            {addr.isDefault && <span className="text-[8px] bg-emerald-100 text-emerald-700 px-1 rounded uppercase tracking-wider">Default</span>}
                          </div>
                          <div className="text-[10px] opacity-70 truncate">{addr.address}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-stone-50 rounded-xl border-2 border-dashed border-stone-200 text-center">
                    <p className="text-[10px] text-stone-500 mb-2">No saved addresses</p>
                    <button 
                      onClick={() => navigate('/account?tab=addresses')}
                      className="text-xs font-bold text-emerald-600 hover:text-emerald-700"
                    >
                      Add Address
                    </button>
                  </div>
                )}

                <p className="text-sm font-bold text-stone-700">Delivery Option</p>
                <div className="space-y-2">
                  <button
                    onClick={() => setDeliveryOption('standard')}
                    className={`w-full p-3 rounded-xl border-2 flex items-center justify-between transition-all ${
                      deliveryOption === 'standard' ? 'border-emerald-600 bg-emerald-50 text-emerald-700' : 'border-stone-100 text-stone-500'
                    }`}
                  >
                    <div className="flex items-center gap-3 text-left">
                      <Truck className="w-4 h-4" />
                      <div>
                        <p className="text-xs font-bold">Standard</p>
                        <p className="text-[10px] opacity-70">3-5 business days</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold">$5.00</span>
                  </button>
                  <button
                    onClick={() => setDeliveryOption('express')}
                    className={`w-full p-3 rounded-xl border-2 flex items-center justify-between transition-all ${
                      deliveryOption === 'express' ? 'border-emerald-600 bg-emerald-50 text-emerald-700' : 'border-stone-100 text-stone-500'
                    }`}
                  >
                    <div className="flex items-center gap-3 text-left">
                      <Zap className="w-4 h-4" />
                      <div>
                        <p className="text-xs font-bold">Express</p>
                        <p className="text-[10px] opacity-70">1-2 business days</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold">$12.00</span>
                  </button>
                </div>
              </motion.div>
            )}

            {/* Payment Method */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-stone-700">Payment Method</p>
                <button 
                  onClick={() => navigate('/account?tab=payments')}
                  className="text-[10px] text-emerald-600 font-bold hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add New
                </button>
              </div>

              {profile?.savedPaymentMethods && profile.savedPaymentMethods.length > 0 ? (
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                  {profile.savedPaymentMethods.map((pay) => (
                    <button
                      key={pay.id}
                      onClick={() => setSelectedPaymentId(pay.id)}
                      className={`w-full p-3 rounded-xl border-2 text-left transition-all flex items-center gap-3 ${
                        selectedPaymentId === pay.id
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                          : 'border-stone-100 text-stone-500'
                      }`}
                    >
                      <div className={`p-2 rounded-lg ${selectedPaymentId === pay.id ? 'bg-emerald-100 text-emerald-600' : 'bg-stone-100 text-stone-400'}`}>
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold flex items-center gap-2">
                          {pay.type === 'card' ? 'Card' : 'Mobile Money'}
                          {pay.isDefault && <span className="text-[8px] bg-emerald-100 text-emerald-700 px-1 rounded uppercase tracking-wider">Default</span>}
                        </div>
                        <div className="text-[10px] opacity-70 truncate">
                          {pay.provider} {pay.lastFour ? `**** ${pay.lastFour}` : ''}
                        </div>
                      </div>
                      {selectedPaymentId === pay.id && <CheckCircle className="w-4 h-4 text-emerald-600" />}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-stone-50 rounded-xl border-2 border-dashed border-stone-200 text-center">
                  <p className="text-[10px] text-stone-500 mb-2">No payment methods</p>
                  <button 
                    onClick={() => navigate('/account?tab=payments')}
                    className="text-xs font-bold text-emerald-600 hover:text-emerald-700"
                  >
                    Add Payment
                  </button>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleCheckout}
            disabled={loading}
            className="w-full bg-emerald-700 text-white py-4 rounded-2xl font-bold text-lg hover:bg-emerald-800 transition-all shadow-lg flex items-center justify-center gap-2"
          >
            {loading ? 'Processing...' : (
              <>
                <CreditCard className="w-5 h-5" />
                Checkout
              </>
            )}
          </button>
          
          <p className="text-center text-stone-400 text-[10px] mt-4">
            Secure checkout powered by Tellus Payments.
          </p>
        </div>
      </div>
      <Toast 
        message={toast.message} 
        type={toast.type} 
        isVisible={toast.isVisible} 
        onClose={() => setToast(prev => ({ ...prev, isVisible: false }))} 
      />
    </div>
  );
};

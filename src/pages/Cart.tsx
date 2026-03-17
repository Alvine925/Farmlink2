import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { Trash2, ShoppingBag, ArrowRight, CreditCard, Truck, CheckCircle, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Toast } from '../components/Toast';

export const Cart: React.FC = () => {
  const { items, removeFromCart, total, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState<'pickup' | 'delivery'>('delivery');
  const [deliveryOption, setDeliveryOption] = useState<'standard' | 'express'>('standard');
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; isVisible: boolean }>({
    message: '',
    type: 'success',
    isVisible: false
  });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type, isVisible: true });
  };

  const deliveryFee = deliveryMethod === 'pickup' ? 0 : (deliveryOption === 'express' ? 12 : 5);
  const finalTotal = total + deliveryFee;

  const handleCheckout = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (items.length === 0) return;

    setLoading(true);
    try {
      // In a real app, we'd group items by farmer and create multiple orders
      const farmerId = items[0].farmerId;
      const farmerName = items[0].farmerName;
      const buyerName = user.displayName || 'Buyer';

      await addDoc(collection(db, 'orders'), {
        buyerId: user.uid,
        buyerName: buyerName,
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
        paymentMethod: 'Credit Card',
        createdAt: new Date().toISOString()
      });

      // Create notification for farmer
      await addDoc(collection(db, 'notifications'), {
        userId: farmerId,
        title: 'New Order Received!',
        message: `You have a new order for $${finalTotal.toFixed(2)}.`,
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
                <p className="font-bold text-emerald-700">${(item.price * item.cartQuantity).toFixed(2)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-6">
        <div className="bg-white p-8 rounded-3xl border border-stone-100 shadow-xl sticky top-24">
          <h2 className="text-xl font-bold mb-6">Order Summary</h2>
          
          <div className="space-y-4 mb-8">
            <div className="flex justify-between text-stone-500">
              <span>Subtotal</span>
              <span>${total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-stone-500">
              <span>Delivery Fee {deliveryMethod === 'delivery' && `(${deliveryOption === 'express' ? 'Express' : 'Standard'})`}</span>
              <span>{deliveryFee > 0 ? `$${deliveryFee.toFixed(2)}` : 'Free'}</span>
            </div>
            <div className="border-t border-stone-100 pt-4 flex justify-between font-bold text-xl">
              <span>Total</span>
              <span className="text-emerald-700">${finalTotal.toFixed(2)}</span>
            </div>
          </div>

          <div className="space-y-4 mb-8">
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
              className="space-y-4 mb-8 overflow-hidden"
            >
              <p className="text-sm font-bold text-stone-700">Delivery Option</p>
              <div className="space-y-2">
                <button
                  onClick={() => setDeliveryOption('standard')}
                  className={`w-full p-4 rounded-xl border-2 flex items-center justify-between transition-all ${
                    deliveryOption === 'standard' ? 'border-emerald-600 bg-emerald-50 text-emerald-700' : 'border-stone-100 text-stone-500'
                  }`}
                >
                  <div className="flex items-center gap-3 text-left">
                    <Truck className="w-5 h-5" />
                    <div>
                      <p className="text-sm font-bold">Standard Delivery</p>
                      <p className="text-[10px] opacity-70">3-5 business days</p>
                    </div>
                  </div>
                  <span className="font-bold">$5.00</span>
                </button>
                <button
                  onClick={() => setDeliveryOption('express')}
                  className={`w-full p-4 rounded-xl border-2 flex items-center justify-between transition-all ${
                    deliveryOption === 'express' ? 'border-emerald-600 bg-emerald-50 text-emerald-700' : 'border-stone-100 text-stone-500'
                  }`}
                >
                  <div className="flex items-center gap-3 text-left">
                    <Zap className="w-5 h-5" />
                    <div>
                      <p className="text-sm font-bold">Express Delivery</p>
                      <p className="text-[10px] opacity-70">1-2 business days</p>
                    </div>
                  </div>
                  <span className="font-bold">$12.00</span>
                </button>
              </div>
            </motion.div>
          )}

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
            Secure checkout powered by AgriDirect Payments.
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

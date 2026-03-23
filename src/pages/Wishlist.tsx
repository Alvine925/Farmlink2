import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, onSnapshot, query, where, doc, updateDoc, arrayRemove } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { Product } from '../types';
import { ShoppingCart, Heart, Eye, Trash2, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Toast } from '../components/Toast';

export const Wishlist: React.FC = () => {
  const { user, profile } = useAuth();
  const { addToCart } = useCart();
  const [favorites, setFavorites] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; isVisible: boolean }>({
    message: '',
    type: 'success',
    isVisible: false
  });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type, isVisible: true });
  };

  useEffect(() => {
    if (!user || !profile?.favorites || profile.favorites.length === 0) {
      setFavorites([]);
      setLoading(false);
      return;
    }

    // Firestore 'in' query is limited to 10 items. 
    // For a real app, we might need to chunk this or fetch individually.
    // For now, we'll fetch the first 10 or all if less.
    const favoriteIds = profile.favorites.slice(0, 10);
    
    const q = query(
      collection(db, 'products'),
      where('__name__', 'in', favoriteIds)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setFavorites(docs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, profile?.favorites]);

  const handleRemoveFavorite = async (productId: string) => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        favorites: arrayRemove(productId)
      });
      showToast('Removed from wishlist');
    } catch (error) {
      console.error("Error removing favorite:", error);
      showToast('Failed to remove from wishlist', 'error');
    }
  };

  const handleAddToCart = (product: Product) => {
    addToCart(product, 1);
    showToast(`${product.name} added to cart`);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-700"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-stone-900">My Wishlist</h1>
          <p className="text-stone-500 mt-1">Keep track of the products you love</p>
        </div>
        <Link 
          to="/marketplace" 
          className="flex items-center gap-2 text-emerald-700 font-bold hover:gap-3 transition-all"
        >
          Continue Shopping
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {favorites.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-stone-200">
          <div className="w-20 h-20 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Heart className="w-10 h-10 text-stone-300" />
          </div>
          <h2 className="text-xl font-bold text-stone-900 mb-2">Your wishlist is empty</h2>
          <p className="text-stone-500 mb-8 max-w-sm mx-auto">
            Save items you're interested in and they'll show up here so you can easily find them later.
          </p>
          <Link 
            to="/marketplace"
            className="inline-flex items-center px-8 py-3 bg-emerald-700 text-white rounded-xl font-bold hover:bg-emerald-800 transition-all shadow-lg"
          >
            Explore Marketplace
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {favorites.map(product => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                key={product.id}
                className="bg-white rounded-2xl border border-stone-100 shadow-sm hover:shadow-xl transition-all group overflow-hidden"
              >
                <div className="aspect-video bg-stone-100 relative overflow-hidden">
                  <img
                    src={product.images?.[0] || `https://picsum.photos/seed/${product.id}/400/400`}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <button
                    onClick={() => handleRemoveFavorite(product.id)}
                    className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur rounded-full text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-sm"
                    title="Remove from wishlist"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-lg text-stone-900 mb-1">{product.name}</h3>
                      <p className="text-xs text-stone-400 font-medium uppercase tracking-wider">{product.category}</p>
                    </div>
                    <p className="text-emerald-700 font-bold text-xl">${(product.price || 0).toFixed(2)}</p>
                  </div>
                  
                  <div className="flex gap-3">
                    <Link
                      to={`/product/${product.id}`}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-stone-100 text-stone-700 font-bold hover:bg-stone-200 transition-all"
                    >
                      <Eye className="w-4 h-4" />
                      Details
                    </Link>
                    <button
                      onClick={() => handleAddToCart(product)}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-700 text-white font-bold hover:bg-emerald-800 transition-all shadow-md"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      Add to Cart
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <Toast 
        message={toast.message} 
        type={toast.type} 
        isVisible={toast.isVisible} 
        onClose={() => setToast(prev => ({ ...prev, isVisible: false }))} 
      />
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, onSnapshot, query, orderBy, where, updateDoc, doc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { Product, UserProfile } from '../types';
import { Search, MapPin, Filter, ShoppingCart, Check, Store, Award, Heart, Eye, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Toast } from '../components/Toast';

export const Marketplace: React.FC = () => {
  const { user, profile } = useAuth();
  const { addToCart, items } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [farmers, setFarmers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchMode, setSearchMode] = useState<'products' | 'farms'>('products');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; isVisible: boolean }>({
    message: '',
    type: 'success',
    isVisible: false
  });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type, isVisible: true });
  };

  const categories = ['All', 'Fruits & Vegetables', 'Grains & Cereals', 'Herbs & Spices', 'Dairy Products', 'Meat & Poultry'];

  const handleToggleFavorite = async (e: React.MouseEvent, productId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      showToast('Please login to favorite products', 'error');
      return;
    }

    const isFavorite = profile?.favorites?.includes(productId);
    const userRef = doc(db, 'users', user.uid);

    try {
      if (isFavorite) {
        await updateDoc(userRef, {
          favorites: arrayRemove(productId)
        });
        showToast('Removed from favorites');
      } else {
        await updateDoc(userRef, {
          favorites: arrayUnion(productId)
        });
        showToast('Added to favorites');
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
      showToast('Failed to update favorites', 'error');
    }
  };

  const handleAddToCart = (e: React.MouseEvent, product: Product) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product, 1);
    showToast(`${product.name} added to cart`);
  };

  useEffect(() => {
    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(docs);
      setLoading(false);
    });

    const qFarmers = query(collection(db, 'users'), where('role', 'in', ['farmer', 'admin']));
    const unsubscribeFarmers = onSnapshot(qFarmers, (snapshot) => {
      setFarmers(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
    });

    return () => {
      unsubscribe();
      unsubscribeFarmers();
    };
  }, []);

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         p.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredFarmers = farmers.filter(f => {
    const name = (f.farmName || f.displayName || '').toLowerCase();
    const address = (f.location?.address || '').toLowerCase();
    const term = searchTerm.toLowerCase();
    return name.includes(term) || address.includes(term);
  });

  return (
    <div className="space-y-8">
      <div className="bg-emerald-900 text-white p-8 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-4xl font-bold mb-4">Marketplace</h1>
          <p className="text-emerald-100 mb-8">Discover fresh produce directly from local farmers. Quality guaranteed, transparent pricing.</p>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 w-5 h-5" />
              <input
                type="text"
                placeholder={searchMode === 'products' ? "Search products..." : "Search farms by name or location..."}
                className="w-full pl-12 pr-4 py-3 rounded-xl bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex bg-emerald-800/50 p-1 rounded-xl border border-emerald-700">
              <button 
                onClick={() => setSearchMode('products')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${searchMode === 'products' ? 'bg-emerald-500 text-white shadow-md' : 'text-emerald-200 hover:text-white'}`}
              >
                Products
              </button>
              <button 
                onClick={() => setSearchMode('farms')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${searchMode === 'farms' ? 'bg-emerald-500 text-white shadow-md' : 'text-emerald-200 hover:text-white'}`}
              >
                Farms
              </button>
            </div>
          </div>
        </div>
        <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none">
          <LeafIcon className="w-64 h-64" />
        </div>
      </div>

      <AnimatePresence mode="wait">
        {searchMode === 'products' ? (
          <motion.div
            key="products"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-6 py-2 rounded-full whitespace-nowrap font-medium transition-all ${
                    selectedCategory === cat ? 'bg-emerald-700 text-white shadow-md' : 'bg-white text-stone-600 border border-stone-200 hover:border-emerald-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="bg-white rounded-2xl h-80 animate-pulse border border-stone-100" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {filteredProducts.map(product => (
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    key={product.id}
                    className="bg-white rounded-2xl border border-stone-100 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative"
                  >
                    <Link to={`/product/${product.id}`} className="block">
                      <div className="aspect-square bg-stone-100 relative overflow-hidden">
                        <img
                          src={product.images?.[0] || `https://picsum.photos/seed/${product.id}/400/400`}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-emerald-700 shadow-sm">
                          {product.category}
                        </div>
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="bg-white text-stone-900 px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2 transform translate-y-4 group-hover:translate-y-0 transition-transform">
                            <Eye className="w-4 h-4" />
                            View Details
                          </div>
                        </div>
                        <button
                          onClick={(e) => handleToggleFavorite(e, product.id)}
                          className={`absolute top-3 right-3 p-2 rounded-full shadow-sm transition-all ${
                            profile?.favorites?.includes(product.id)
                              ? 'bg-red-500 text-white'
                              : 'bg-white/80 text-stone-400 hover:text-red-500'
                          }`}
                        >
                          <Heart className={`w-4 h-4 ${profile?.favorites?.includes(product.id) ? 'fill-current' : ''}`} />
                        </button>
                      </div>
                      <div className="p-5">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-bold text-lg text-stone-900">{product.name}</h3>
                          <p className="text-emerald-700 font-bold">${product.price.toFixed(2)}<span className="text-xs text-stone-400 font-normal">/{product.unit}</span></p>
                        </div>
                        <div className="flex items-center gap-1 text-stone-500 text-sm mb-4">
                          <MapPin className="w-4 h-4" />
                          <span>{product.location?.address || 'Local Farm'}</span>
                        </div>
                      </div>
                    </Link>
                    <div className="px-5 pb-5 flex items-center justify-between">
                      <Link 
                        to={`/farmer/${product.farmerId}`}
                        className="text-xs text-stone-400 font-medium hover:text-emerald-700 transition-colors flex items-center gap-1"
                      >
                        By {product.farmerName}
                        {farmers.find(f => f.uid === product.farmerId)?.isVerified && (
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        )}
                      </Link>
                      <div className="flex gap-2">
                        <Link
                          to={`/product/${product.id}`}
                          className="p-2 rounded-lg bg-stone-100 text-stone-600 hover:bg-stone-200 transition-all"
                        >
                          <Eye className="w-5 h-5" />
                        </Link>
                        <button
                          onClick={(e) => handleAddToCart(e, product)}
                          className={`p-2 rounded-lg transition-all ${
                            items.find(i => i.id === product.id)
                              ? 'bg-emerald-700 text-white'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-700 hover:text-white'
                          }`}
                        >
                          {items.find(i => i.id === product.id) ? <Check className="w-5 h-5" /> : <ShoppingCart className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {!loading && filteredProducts.length === 0 && (
              <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-stone-200">
                <p className="text-stone-500">No products found matching your criteria.</p>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="farms"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredFarmers.map(farmer => (
                <Link 
                  key={farmer.uid}
                  to={`/farmer/${farmer.uid}`}
                  className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm hover:shadow-xl transition-all group"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-50 overflow-hidden border-2 border-white shadow-sm">
                      <img 
                        src={farmer.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${farmer.displayName}`} 
                        alt={farmer.displayName} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div>
                      <h3 className="font-bold text-stone-900 group-hover:text-emerald-700 transition-colors flex items-center gap-2">
                        {farmer.farmName || farmer.displayName}
                        {farmer.isVerified && (
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        )}
                      </h3>
                      <div className="flex items-center gap-1 text-stone-400 text-xs">
                        <MapPin className="w-3 h-3" />
                        <span>{farmer.location?.address || 'Local Farm'}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-stone-500 text-sm line-clamp-2 mb-4">
                    {farmer.businessType || 'Passionate local farmer providing fresh produce.'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {farmer.certifications?.slice(0, 2).map(cert => (
                      <span key={cert} className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full text-[10px] font-bold">
                        {cert}
                      </span>
                    ))}
                  </div>
                </Link>
              ))}
            </div>

            {filteredFarmers.length === 0 && (
              <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-stone-200">
                <p className="text-stone-500">No farms found matching your criteria.</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      <Toast 
        message={toast.message} 
        type={toast.type} 
        isVisible={toast.isVisible} 
        onClose={() => setToast(prev => ({ ...prev, isVisible: false }))} 
      />
    </div>
  );
};

const LeafIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 3.5 1 9.2C17 19 13 20 11 20z" />
    <path d="M11 20c-1-3-6-3-9-11 4-1 7 1 9 11z" />
    <path d="M9 11l-5-4" />
    <path d="M11 14l-3-3" />
    <path d="M13 17l-3-3" />
  </svg>
);

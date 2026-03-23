import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, onSnapshot, query, orderBy, where, updateDoc, doc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useChat } from '../context/ChatContext';
import { Product, UserProfile, Review } from '../types';
import { Search, MapPin, Filter, ShoppingCart, Check, Store, Award, Heart, Eye, ShieldCheck, Video, Map as MapIcon, LayoutGrid, Navigation, MessageSquare, Zap, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Toast } from '../components/Toast';
import { Map, AdvancedMarker, Pin, InfoWindow, useMap } from '@vis.gl/react-google-maps';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import type { Marker } from '@googlemaps/markerclusterer';

export const Marketplace: React.FC = () => {
  const { user, profile } = useAuth();
  const { addToCart, items } = useCart();
  const { openChat } = useChat();
  const [products, setProducts] = useState<Product[]>([]);
  const [farmers, setFarmers] = useState<UserProfile[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<{ type: 'product' | 'category' | 'seller'; value: string }[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchMode, setSearchMode] = useState<'products' | 'sellers'>('products');
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const [selectedMarker, setSelectedMarker] = useState<Product | UserProfile | null>(null);
  const [mapCenter, setMapCenter] = useState({ lat: -1.2921, lng: 36.8219 }); // Default to Nairobi
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; isVisible: boolean }>({
    message: '',
    type: 'success',
    isVisible: false
  });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type, isVisible: true });
  };

  const categories = ['All', 'Fruits & Vegetables', 'Grains & Cereals', 'Herbs & Spices', 'Dairy Products', 'Meat & Poultry'];

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
  };

  const deg2rad = (deg: number) => {
    return deg * (Math.PI / 180);
  };

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
    const q = query(
      collection(db, 'products'), 
      where('status', '==', 'approved'),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(docs);
      setLoading(false);
    });

    const qFarmers = query(collection(db, 'users'), where('role', 'in', ['farmer', 'retailer', 'admin']));
    const unsubscribeFarmers = onSnapshot(qFarmers, (snapshot) => {
      setFarmers(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
    });

    const qReviews = query(collection(db, 'reviews'));
    const unsubscribeReviews = onSnapshot(qReviews, (snapshot) => {
      setReviews(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review)));
    });

    return () => {
      unsubscribe();
      unsubscribeFarmers();
      unsubscribeReviews();
    };
  }, []);

  const getAverageRating = (id: string, type: 'product' | 'farmer' | 'retailer') => {
    const relevantReviews = reviews.filter(r => 
      type === 'product' ? r.productId === id : r.farmerId === id
    );
    if (relevantReviews.length === 0) return 0;
    const sum = relevantReviews.reduce((acc, r) => acc + r.rating, 0);
    return sum / relevantReviews.length;
  };

  useEffect(() => {
    // Try to get user's current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(pos);
          if (!profile?.location?.lat) {
            setMapCenter(pos);
          }
        },
        () => {
          console.log("Geolocation permission denied or error.");
        }
      );
    }
  }, [profile?.location?.lat]);

  useEffect(() => {
    if (profile?.location?.lat && profile?.location?.lng) {
      setMapCenter({ lat: profile.location.lat, lng: profile.location.lng });
    }
  }, [profile?.location]);

  useEffect(() => {
    if (searchTerm.length > 1) {
      const productSuggestions = products
        .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
        .slice(0, 3)
        .map(p => ({ type: 'product' as const, value: p.name }));

      const categorySuggestions = categories
        .filter(c => c !== 'All' && c.toLowerCase().includes(searchTerm.toLowerCase()))
        .slice(0, 2)
        .map(c => ({ type: 'category' as const, value: c }));

      const sellerSuggestions = farmers
        .filter(f => (f.farmName || f.businessName || f.displayName || '').toLowerCase().includes(searchTerm.toLowerCase()))
        .slice(0, 3)
        .map(f => ({ type: 'seller' as const, value: f.farmName || f.businessName || f.displayName }));

      setSuggestions([...productSuggestions, ...categorySuggestions, ...sellerSuggestions]);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [searchTerm, products, farmers]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!(event.target as HTMLElement).closest('.search-container')) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
          <p className="text-emerald-100 mb-8">Discover fresh produce directly from local farmers and retailers. Quality guaranteed, transparent pricing.</p>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative search-container">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 w-5 h-5" />
              <input
                type="text"
                placeholder={searchMode === 'products' ? "Search products..." : "Search sellers by name or location..."}
                className="w-full pl-12 pr-4 py-3 rounded-xl bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => searchTerm.length > 1 && setShowSuggestions(true)}
              />
              
              <AnimatePresence>
                {showSuggestions && suggestions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-stone-100 overflow-hidden z-50"
                  >
                    {suggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setSearchTerm(suggestion.value);
                          setShowSuggestions(false);
                          if (suggestion.type === 'category') {
                            setSelectedCategory(suggestion.value);
                            setSearchMode('products');
                          } else if (suggestion.type === 'seller') {
                            setSearchMode('sellers');
                          }
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-stone-50 flex items-center gap-3 transition-colors border-b border-stone-50 last:border-0"
                      >
                        {suggestion.type === 'product' && <ShoppingCart className="w-4 h-4 text-emerald-600" />}
                        {suggestion.type === 'category' && <Filter className="w-4 h-4 text-amber-600" />}
                        {suggestion.type === 'seller' && <Store className="w-4 h-4 text-blue-600" />}
                        <div>
                          <p className="text-sm font-bold text-stone-900">{suggestion.value}</p>
                          <p className="text-[10px] text-stone-400 uppercase tracking-wider font-medium">{suggestion.type}</p>
                        </div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="flex gap-2">
              <div className="flex bg-emerald-800/50 p-1 rounded-xl border border-emerald-700">
                <button 
                  onClick={() => setSearchMode('products')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${searchMode === 'products' ? 'bg-emerald-500 text-white shadow-md' : 'text-emerald-200 hover:text-white'}`}
                >
                  Products
                </button>
                <button 
                  onClick={() => setSearchMode('sellers')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${searchMode === 'sellers' ? 'bg-emerald-500 text-white shadow-md' : 'text-emerald-200 hover:text-white'}`}
                >
                  Sellers
                </button>
              </div>
              <div className="flex bg-emerald-800/50 p-1 rounded-xl border border-emerald-700">
                <button 
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-emerald-500 text-white shadow-md' : 'text-emerald-200 hover:text-white'}`}
                  title="Grid View"
                >
                  <LayoutGrid className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setViewMode('map')}
                  className={`p-2 rounded-lg transition-all ${viewMode === 'map' ? 'bg-emerald-500 text-white shadow-md' : 'text-emerald-200 hover:text-white'}`}
                  title="Map View"
                >
                  <MapIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none">
          <LeafIcon className="w-64 h-64" />
        </div>
      </div>

      <AnimatePresence mode="wait">
        {viewMode === 'map' ? (
          <motion.div
            key="map-view"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="h-[600px] rounded-3xl overflow-hidden border border-stone-100 shadow-xl relative"
          >
            <Map
              center={mapCenter}
              onCenterChanged={(e) => setMapCenter(e.detail.center)}
              defaultZoom={10}
              mapId="MARKETPLACE_MAP"
              gestureHandling={'greedy'}
              disableDefaultUI={false}
            >
              <MarkersWithClustering 
                searchMode={searchMode}
                products={filteredProducts}
                farmers={filteredFarmers}
                onMarkerClick={setSelectedMarker}
                userLocation={userLocation}
                calculateDistance={calculateDistance}
              />

              {userLocation && (
                <AdvancedMarker position={userLocation}>
                  <div className="relative">
                    <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg animate-pulse" />
                    <div className="absolute -inset-2 bg-blue-500/20 rounded-full animate-ping" />
                  </div>
                </AdvancedMarker>
              )}

              {selectedMarker && (
                <InfoWindow
                  position={{ 
                    lat: (selectedMarker as any).location.lat, 
                    lng: (selectedMarker as any).location.lng 
                  }}
                  onCloseClick={() => setSelectedMarker(null)}
                >
                  <div className="p-2 max-w-[220px]">
                    {'name' in selectedMarker ? (
                      // Product Info
                      <div className="space-y-3">
                        <div className="relative">
                          <img 
                            src={(selectedMarker as Product).images?.[0] || `https://picsum.photos/seed/${selectedMarker.id}/200/150`}
                            alt={selectedMarker.name}
                            className="w-full h-28 object-cover rounded-lg"
                          />
                          {userLocation && calculateDistance(userLocation.lat, userLocation.lng, selectedMarker.location.lat, selectedMarker.location.lng) < 20 && (
                            <div className="absolute top-2 left-2 bg-emerald-600 text-white text-[8px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                              <Zap className="w-2 h-2" />
                              NEARBY
                            </div>
                          )}
                        </div>
                        <div>
                          <h3 className="font-bold text-stone-900 text-sm mb-0.5">{selectedMarker.name}</h3>
                          <p className="text-emerald-700 font-bold text-xs">${(selectedMarker.price || 0).toFixed(2)}/{selectedMarker.unit}</p>
                        </div>
                        <div className="flex gap-2">
                          <Link 
                            to={`/product/${selectedMarker.id}`}
                            className="flex-1 bg-emerald-700 text-white text-center py-2 rounded-lg text-[10px] font-bold hover:bg-emerald-800 transition-colors"
                          >
                            View Details
                          </Link>
                          <button 
                            onClick={() => openChat(selectedMarker.farmerId, selectedMarker.farmerName)}
                            className="p-2 rounded-lg border border-emerald-700 text-emerald-700 hover:bg-emerald-50 transition-colors"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      // Farm Info
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-emerald-50 overflow-hidden border border-emerald-100 flex-shrink-0">
                            <img 
                              src={(selectedMarker as UserProfile).photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedMarker.displayName}`}
                              alt={selectedMarker.displayName}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-bold text-stone-900 text-sm truncate">{(selectedMarker as UserProfile).farmName || (selectedMarker as UserProfile).businessName || selectedMarker.displayName}</h3>
                            <p className="text-[10px] text-stone-500 truncate">{(selectedMarker as UserProfile).businessType || ((selectedMarker as UserProfile).role === 'farmer' ? 'Local Farm' : 'Retailer')}</p>
                            {userLocation && calculateDistance(userLocation.lat, userLocation.lng, selectedMarker.location.lat, selectedMarker.location.lng) < 20 && (
                              <span className="text-[8px] font-bold text-emerald-600 flex items-center gap-0.5 mt-0.5">
                                <Zap className="w-2 h-2" />
                                NEARBY
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Link 
                            to={`/farmer/${(selectedMarker as UserProfile).uid}`}
                            className="flex-1 bg-emerald-700 text-white text-center py-2 rounded-lg text-[10px] font-bold hover:bg-emerald-800 transition-colors"
                          >
                            Visit {(selectedMarker as UserProfile).role === 'farmer' ? 'Farm' : 'Store'}
                          </Link>
                          <button 
                            onClick={() => openChat((selectedMarker as UserProfile).uid, (selectedMarker as UserProfile).farmName || selectedMarker.displayName)}
                            className="p-2 rounded-lg border border-emerald-700 text-emerald-700 hover:bg-emerald-50 transition-colors"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </InfoWindow>
              )}
            </Map>
            
            {/* Map Controls */}
            <div className="absolute bottom-8 right-8 flex flex-col gap-2">
              <button 
                onClick={() => userLocation && setMapCenter(userLocation)}
                className="p-3 bg-white text-stone-700 rounded-full shadow-lg hover:bg-stone-50 transition-all border border-stone-100"
                title="My Location"
              >
                <Navigation className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        ) : searchMode === 'products' ? (
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
                        <div className="absolute top-3 left-3 flex flex-col gap-2">
                          <div className="bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-emerald-700 shadow-sm">
                            {product.category}
                          </div>
                          {userLocation && calculateDistance(userLocation.lat, userLocation.lng, product.location.lat, product.location.lng) < 20 && (
                            <div className="bg-emerald-600/90 backdrop-blur px-3 py-1 rounded-full text-[10px] font-bold text-white shadow-sm flex items-center gap-1">
                              <Zap className="w-3 h-3" />
                              Nearby
                            </div>
                          )}
                          {product.videoUrl && (
                            <div className="bg-emerald-600/90 backdrop-blur p-1.5 rounded-full text-white shadow-sm w-fit" title="Video available">
                              <Video className="w-3.5 h-3.5" />
                            </div>
                          )}
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
                          <div>
                            <h3 className="font-bold text-lg text-stone-900">{product.name}</h3>
                            {getAverageRating(product.id, 'product') > 0 && (
                              <div className="flex items-center gap-1 text-amber-500 text-xs font-bold">
                                <Star className="w-3 h-3 fill-current" />
                                <span>{getAverageRating(product.id, 'product').toFixed(1)}</span>
                                <span className="text-stone-400 font-normal">({reviews.filter(r => r.productId === product.id).length})</span>
                              </div>
                            )}
                          </div>
                          <p className="text-emerald-700 font-bold">${(product.price || 0).toFixed(2)}<span className="text-xs text-stone-400 font-normal">/{product.unit}</span></p>
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
            key="sellers"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            {userLocation && filteredFarmers.some(f => f.location?.lat && f.location?.lng && calculateDistance(userLocation.lat, userLocation.lng, f.location.lat, f.location.lng) < 20) && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-emerald-600" />
                  Nearby Sellers
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredFarmers
                    .filter(f => f.location?.lat && f.location?.lng && calculateDistance(userLocation.lat, userLocation.lng, f.location.lat, f.location.lng) < 20)
                    .map(farmer => (
                      <Link 
                        key={`nearby-${farmer.uid}`}
                        to={`/farmer/${farmer.uid}`}
                        className="bg-emerald-50/50 p-6 rounded-3xl border border-emerald-100 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 p-3">
                          <Zap className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div className="flex items-center gap-4 mb-4">
                          <div className="w-16 h-16 rounded-2xl bg-white overflow-hidden border-2 border-emerald-200 shadow-sm">
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
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1 text-stone-400 text-xs">
                                <MapPin className="w-3 h-3" />
                                <span>{farmer.location?.address || 'Local Farm'}</span>
                                <span className="text-emerald-600 font-bold ml-1">
                                  • {calculateDistance(userLocation.lat, userLocation.lng, farmer.location!.lat, farmer.location!.lng).toFixed(1)}km
                                </span>
                              </div>
                              {getAverageRating(farmer.uid, 'farmer') > 0 && (
                                <div className="flex items-center gap-1 text-amber-500 text-xs font-bold">
                                  <Star className="w-3 h-3 fill-current" />
                                  <span>{getAverageRating(farmer.uid, 'farmer').toFixed(1)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <p className="text-stone-500 text-sm line-clamp-2">
                          {farmer.businessType || (farmer.role === 'farmer' ? 'Passionate local farmer providing fresh produce.' : 'Dedicated retailer providing quality products.')}
                        </p>
                      </Link>
                    ))}
                </div>
                <div className="h-px bg-stone-100 my-8" />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredFarmers.map(farmer => (
                <Link 
                  key={farmer.uid}
                  to={`/farmer/${farmer.uid}`}
                  className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm hover:shadow-xl transition-all group"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-50 overflow-hidden border-2 border-white shadow-sm relative">
                      <img 
                        src={farmer.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${farmer.displayName}`} 
                        alt={farmer.displayName} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      {userLocation && farmer.location?.lat && farmer.location?.lng && calculateDistance(userLocation.lat, userLocation.lng, farmer.location.lat, farmer.location.lng) < 20 && (
                        <div className="absolute -top-1 -right-1 bg-emerald-600 text-white p-1 rounded-full shadow-sm border border-white">
                          <Zap className="w-2 h-2" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-stone-900 group-hover:text-emerald-700 transition-colors flex items-center gap-2">
                        {farmer.farmName || farmer.businessName || farmer.displayName}
                        {farmer.isVerified && (
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        )}
                        {farmer.role === 'retailer' && (
                          <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Retailer</span>
                        )}
                      </h3>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 text-stone-400 text-xs">
                          <MapPin className="w-3 h-3" />
                          <span>{farmer.location?.address || 'Local Farm'}</span>
                          {userLocation && farmer.location?.lat && farmer.location?.lng && (
                            <span className="text-emerald-600 font-bold ml-1">
                              • {calculateDistance(userLocation.lat, userLocation.lng, farmer.location.lat, farmer.location.lng).toFixed(1)}km
                            </span>
                          )}
                        </div>
                        {getAverageRating(farmer.uid, 'farmer') > 0 && (
                          <div className="flex items-center gap-1 text-amber-500 text-xs font-bold">
                            <Star className="w-3 h-3 fill-current" />
                            <span>{getAverageRating(farmer.uid, 'farmer').toFixed(1)}</span>
                          </div>
                        )}
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
                <p className="text-stone-500">No sellers found matching your criteria.</p>
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

const MarkersWithClustering = ({ 
  searchMode, 
  products, 
  farmers, 
  onMarkerClick,
  userLocation,
  calculateDistance
}: { 
  searchMode: 'products' | 'sellers', 
  products: Product[], 
  farmers: UserProfile[], 
  onMarkerClick: (m: Product | UserProfile) => void,
  userLocation: { lat: number, lng: number } | null,
  calculateDistance: (lat1: number, lon1: number, lat2: number, lon2: number) => number
}) => {
  const map = useMap();
  const [markers, setMarkers] = useState<{[key: string]: Marker}>({});
  const [clusterer, setClusterer] = useState<MarkerClusterer | null>(null);

  // Initialize clusterer
  useEffect(() => {
    if (!map) return;
    if (!clusterer) {
      setClusterer(new MarkerClusterer({ map }));
    }
  }, [map]);

  // Update markers when data changes
  useEffect(() => {
    if (!clusterer) return;

    clusterer.clearMarkers();
    setMarkers({});
  }, [searchMode, products, farmers, clusterer]);

  const setMarkerRef = (marker: Marker | null, key: string) => {
    if (marker && markers[key]) return;
    if (!marker && !markers[key]) return;

    setMarkers(prev => {
      if (marker) {
        return { ...prev, [key]: marker };
      } else {
        const next = { ...prev };
        delete next[key];
        return next;
      }
    });
  };

  useEffect(() => {
    if (!clusterer) return;
    clusterer.addMarkers(Object.values(markers));
  }, [markers, clusterer]);

  return (
    <>
      {searchMode === 'products' ? (
        products.map(product => {
          const isNearby = userLocation && product.location?.lat && product.location?.lng && calculateDistance(userLocation.lat, userLocation.lng, product.location.lat, product.location.lng) < 20;
          return product.location?.lat && product.location?.lng && (
            <AdvancedMarker
              key={product.id}
              position={{ lat: product.location.lat, lng: product.location.lng }}
              onClick={() => onMarkerClick(product)}
              ref={marker => setMarkerRef(marker as any, product.id)}
            >
              <Pin 
                background={isNearby ? "#059669" : "#10b981"} 
                glyphColor="#fff" 
                borderColor={isNearby ? "#064e3b" : "#065f46"}
                scale={isNearby ? 1.2 : 1}
              />
            </AdvancedMarker>
          );
        })
      ) : (
        farmers.map(farmer => {
          const isNearby = userLocation && farmer.location?.lat && farmer.location?.lng && calculateDistance(userLocation.lat, userLocation.lng, farmer.location.lat, farmer.location.lng) < 20;
          return farmer.location?.lat && farmer.location?.lng && (
            <AdvancedMarker
              key={farmer.uid}
              position={{ lat: farmer.location.lat, lng: farmer.location.lng }}
              onClick={() => onMarkerClick(farmer)}
              ref={marker => setMarkerRef(marker as any, farmer.uid)}
            >
              <Pin 
                background={isNearby ? "#064e3b" : "#047857"} 
                glyphColor="#fff" 
                borderColor="#064e3b"
                scale={isNearby ? 1.2 : 1}
              />
            </AdvancedMarker>
          );
        })
      )}
    </>
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

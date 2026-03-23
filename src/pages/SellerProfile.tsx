import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, arrayUnion, arrayRemove, onSnapshot, orderBy, addDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { UserProfile, Product, Review } from '../types';
import { MapPin, Award, Package, ArrowLeft, ShoppingCart, Check, ExternalLink, MessageSquare, Store, TrendingUp, ShieldCheck, Star, Navigation, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useCart } from '../context/CartContext';
import { useChat } from '../context/ChatContext';
import { Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import { ReviewModal } from '../components/ReviewModal';
import { Toast } from '../components/Toast';

export const SellerProfile: React.FC = () => {
  const { farmerId: sellerId } = useParams<{ farmerId: string }>();
  const [seller, setSeller] = useState<UserProfile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'products' | 'reviews'>('products');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' as 'success' | 'error' });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ isVisible: true, message, type });
  };
  const [isPreferred, setIsPreferred] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const { addToCart, items } = useCart();
  const { openChat } = useChat();

  useEffect(() => {
    const fetchSellerData = async () => {
      if (!sellerId) return;
      
      try {
        // Fetch seller profile
        const sellerDoc = await getDoc(doc(db, 'users', sellerId));
        if (sellerDoc.exists()) {
          setSeller({ uid: sellerDoc.id, ...sellerDoc.data() } as UserProfile);
        }

        // Fetch current user profile to check preferred status
        if (auth.currentUser) {
          const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data() as UserProfile;
            setUserProfile(data);
            setIsPreferred(data.preferredPartners?.includes(sellerId) || false);
          }
        }

        // Fetch seller products
        const q = query(collection(db, 'products'), where('farmerId', '==', sellerId));
        const productsSnap = await getDocs(q);
        setProducts(productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
      } catch (error) {
        console.error("Error fetching seller profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSellerData();
  }, [sellerId]);

  useEffect(() => {
    if (!sellerId) return;
    const q = query(
      collection(db, 'reviews'),
      where('farmerId', '==', sellerId),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setReviews(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review)));
    });
    return () => unsubscribe();
  }, [sellerId]);

  useEffect(() => {
    const checkPurchase = async () => {
      if (!auth.currentUser || !sellerId) return;
      try {
        const q = query(
          collection(db, 'orders'),
          where('buyerId', '==', auth.currentUser.uid),
          where('farmerId', '==', sellerId),
          where('status', '==', 'completed')
        );
        const snapshot = await getDocs(q);
        setHasPurchased(!snapshot.empty);
      } catch (error) {
        console.error("Error checking purchase status:", error);
      }
    };
    checkPurchase();
  }, [auth.currentUser, sellerId]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !sellerId) return;
    if (!newReview.comment.trim()) {
      showToast('Please enter a comment', 'error');
      return;
    }

    setSubmittingReview(true);
    try {
      await addDoc(collection(db, 'reviews'), {
        farmerId: sellerId,
        buyerId: auth.currentUser.uid,
        buyerName: auth.currentUser.displayName || 'Anonymous',
        buyerPhoto: auth.currentUser.photoURL || '',
        rating: newReview.rating,
        comment: newReview.comment,
        createdAt: new Date().toISOString()
      });
      setNewReview({ rating: 5, comment: '' });
      showToast('Review submitted successfully!');
    } catch (error) {
      console.error("Error submitting review:", error);
      showToast('Failed to submit review', 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  const averageRating = reviews.length > 0 
    ? reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length 
    : 0;

  const togglePreferred = async () => {
    if (!auth.currentUser || !sellerId) return;

    const userRef = doc(db, 'users', auth.currentUser.uid);
    try {
      if (isPreferred) {
        await updateDoc(userRef, {
          preferredPartners: arrayRemove(sellerId)
        });
        setIsPreferred(false);
      } else {
        await updateDoc(userRef, {
          preferredPartners: arrayUnion(sellerId)
        });
        setIsPreferred(true);
      }
    } catch (error) {
      console.error("Error toggling preferred partner:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-700"></div>
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold mb-4">Seller not found</h2>
        <Link to="/marketplace" className="text-emerald-700 font-bold hover:underline flex items-center justify-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to Marketplace
        </Link>
      </div>
    );
  }

  const isFarmer = seller.role === 'farmer';
  const isRetailer = seller.role === 'retailer';
  const businessDisplayName = seller.farmName || seller.businessName || seller.displayName;

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <div className="relative h-64 md:h-80 rounded-3xl overflow-hidden shadow-2xl">
        <img 
          src={`https://picsum.photos/seed/${seller.uid}/1200/400?blur=2`} 
          alt="Seller Cover" 
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-0 left-0 p-8 flex items-end gap-6">
          <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl border-4 border-white overflow-hidden bg-white shadow-lg">
            <img 
              src={seller.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${seller.displayName}`} 
              alt={seller.displayName} 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="text-white pb-2 flex-1">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-3xl md:text-4xl font-bold">{businessDisplayName}</h1>
                  {seller.isVerified && (
                    <ShieldCheck className="w-8 h-8 text-emerald-400 drop-shadow-lg" title={`Verified ${isFarmer ? 'Farmer' : 'Retailer'}`} />
                  )}
                </div>
                <div className="flex items-center gap-2 text-emerald-100">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm font-medium">{seller.location?.address || (isFarmer ? 'Local Farm' : 'Local Business')}</span>
                  <span className="mx-2 opacity-50">•</span>
                  <Package className="w-4 h-4" />
                  <span className="text-sm font-medium">{products.length} Products Listed</span>
                </div>
              </div>

              {auth.currentUser && auth.currentUser.uid !== seller.uid && (
                <button
                  onClick={togglePreferred}
                  className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all shadow-lg backdrop-blur-md ${
                    isPreferred 
                      ? 'bg-yellow-400 text-yellow-950 hover:bg-yellow-500' 
                      : 'bg-white/20 text-white hover:bg-white/30 border border-white/30'
                  }`}
                >
                  <Star className={`w-5 h-5 ${isPreferred ? 'fill-current' : ''}`} />
                  {isPreferred ? `Preferred ${isFarmer ? 'Farmer' : 'Retailer'}` : `Save to Preferred`}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Sidebar Info */}
        <div className="space-y-8">
          <section className="bg-white p-8 rounded-3xl border border-stone-100 shadow-sm">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Award className="w-5 h-5 text-emerald-600" />
              About the {isFarmer ? 'Farm' : 'Business'}
            </h2>
            
            {seller.description && (
              <p className="text-stone-600 leading-relaxed mb-8">
                {seller.description}
              </p>
            )}
            
            <div className="space-y-6">
              {/* Seller Details Grid */}
              <div className="grid grid-cols-1 gap-4">
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-stone-50 border border-stone-100">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-emerald-600 shadow-sm">
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Business Type</p>
                    <p className="text-sm font-bold text-stone-900">{seller.businessType || (isFarmer ? 'Local Producer' : 'Retailer')}</p>
                  </div>
                </div>

                {isFarmer && (
                  <div className="flex items-center gap-3 p-4 rounded-2xl bg-stone-50 border border-stone-100">
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-emerald-600 shadow-sm">
                      <Package className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Farm Size</p>
                      <p className="text-sm font-bold text-stone-900">{seller.farmSize || 'N/A'}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 p-4 rounded-2xl bg-stone-50 border border-stone-100">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-emerald-600 shadow-sm">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Location</p>
                    <p className="text-sm font-bold text-stone-900">{seller.location?.address || (isFarmer ? 'Local Farm' : 'Local Business')}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 rounded-2xl bg-stone-50 border border-stone-100">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-emerald-600 shadow-sm">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Business Model</p>
                    <div className="flex gap-2 mt-0.5">
                      {seller.isRetail && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">Retail</span>
                      )}
                      {seller.isWholesale && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-100">Wholesale</span>
                      )}
                      {!seller.isRetail && !seller.isWholesale && <span className="text-sm font-bold text-stone-900">Direct Sales</span>}
                    </div>
                  </div>
                </div>
              </div>

              {seller.certifications && seller.certifications.length > 0 && (
                <div className="pt-4 border-t border-stone-100">
                  <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-3">Certifications</h3>
                  <div className="flex flex-wrap gap-2">
                    {seller.certifications.map((cert, idx) => (
                      <span key={idx} className="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full text-xs font-bold border border-emerald-100 flex items-center gap-1.5">
                        <Check className="w-3 h-3" />
                        {cert}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="bg-white p-8 rounded-3xl border border-stone-100 shadow-sm">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-emerald-600" />
              {isFarmer ? 'Farm' : 'Business'} Location
            </h2>
            
            {seller.location?.lat && seller.location?.lng ? (
              <div className="h-64 rounded-2xl overflow-hidden border border-stone-100 shadow-sm mb-4">
                <Map
                  defaultCenter={{ lat: seller.location.lat, lng: seller.location.lng }}
                  defaultZoom={13}
                  mapId="SELLER_PROFILE_MAP"
                  gestureHandling={'greedy'}
                  disableDefaultUI={true}
                >
                  <AdvancedMarker position={{ lat: seller.location.lat, lng: seller.location.lng }}>
                    <Pin background="#10b981" glyphColor="#fff" borderColor="#065f46" />
                  </AdvancedMarker>
                </Map>
              </div>
            ) : (
              <div className="h-64 rounded-2xl bg-stone-100 flex items-center justify-center text-stone-400 border border-dashed border-stone-200 mb-4">
                <p className="text-sm">Location coordinates not available</p>
              </div>
            )}
            <p className="text-sm text-stone-500 flex items-center gap-2">
              <Navigation className="w-4 h-4" />
              {seller.location?.address || (isFarmer ? 'Local Farm' : 'Local Business')}
            </p>
          </section>

          <section className="bg-emerald-900 text-white p-8 rounded-3xl shadow-xl">
            <h2 className="text-xl font-bold mb-4">Contact Information</h2>
            <p className="text-emerald-100 text-sm mb-6">Reach out for bulk orders or {isFarmer ? 'farm visits' : 'business inquiries'}.</p>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-800 rounded-lg">
                  <ExternalLink className="w-4 h-4" />
                </div>
                <span className="text-sm">{seller.email}</span>
              </div>
              {seller.phone && (
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-800 rounded-lg">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <span className="text-sm">{seller.phone}</span>
                </div>
              )}
              <button 
                onClick={() => openChat(seller.uid, businessDisplayName)}
                className="w-full bg-white text-emerald-900 py-3 rounded-xl font-bold hover:bg-emerald-50 transition-all flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-4 h-4" />
                Message {isFarmer ? 'Farmer' : 'Retailer'}
              </button>
            </div>
          </section>
        </div>

        {/* Products & Reviews Tabs */}
        <div className="lg:col-span-2 space-y-8">
          <div className="flex items-center gap-8 border-b border-stone-100">
            <button
              onClick={() => setActiveTab('products')}
              className={`pb-4 text-lg font-bold transition-all relative ${
                activeTab === 'products' ? 'text-emerald-700' : 'text-stone-400 hover:text-stone-600'
              }`}
            >
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Available Produce ({products.length})
              </div>
              {activeTab === 'products' && (
                <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-700" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`pb-4 text-lg font-bold transition-all relative ${
                activeTab === 'reviews' ? 'text-emerald-700' : 'text-stone-400 hover:text-stone-600'
              }`}
            >
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5" />
                {isFarmer ? 'Seller' : 'Retailer'} Reviews ({reviews.length})
              </div>
              {activeTab === 'reviews' && (
                <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-700" />
              )}
            </button>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'products' ? (
              <motion.div
                key="products"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="grid grid-cols-1 sm:grid-cols-2 gap-6"
              >
                {products.map(product => (
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    key={product.id}
                    className="bg-white rounded-2xl border border-stone-100 shadow-sm hover:shadow-xl transition-all group overflow-hidden"
                  >
                    <div className="aspect-video bg-stone-100 relative overflow-hidden">
                      <img
                        src={product.images?.[0] || `https://picsum.photos/seed/${product.id}/400/300`}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute top-3 right-3 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-emerald-700 shadow-sm">
                        {product.category}
                      </div>
                    </div>
                    <div className="p-5">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-lg text-stone-900">{product.name}</h3>
                        <p className="text-emerald-700 font-bold">${(product.price || 0).toFixed(2)}<span className="text-xs text-stone-400 font-normal">/{product.unit}</span></p>
                      </div>
                      <p className="text-stone-500 text-sm line-clamp-2 mb-4">{product.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-stone-400 uppercase tracking-tighter">{product.growingMethod}</span>
                        <button
                          onClick={() => addToCart(product, 1)}
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
                {products.length === 0 && (
                  <div className="col-span-full text-center py-20 bg-stone-50 rounded-3xl border border-dashed border-stone-200">
                    <p className="text-stone-400">No products currently listed by this {isFarmer ? 'farm' : 'seller'}.</p>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="reviews"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
                  <div>
                    <h2 className="text-2xl font-bold text-stone-900 mb-2">Customer Feedback</h2>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star 
                            key={star} 
                            className={`w-5 h-5 ${star <= Math.round(averageRating) ? 'text-amber-400 fill-current' : 'text-stone-200'}`} 
                          />
                        ))}
                      </div>
                      <span className="text-lg font-bold text-stone-900">{(averageRating || 0).toFixed(1)}</span>
                      <span className="text-stone-400 font-medium">({reviews.length} reviews)</span>
                    </div>
                  </div>

                  {hasPurchased && !reviews.some(r => r.buyerId === auth.currentUser?.uid) && (
                    <div className="bg-emerald-50 p-8 rounded-3xl flex-1 max-w-md border border-emerald-100 shadow-sm">
                      <h3 className="font-bold text-emerald-900 mb-2 text-lg">Share your experience</h3>
                      <p className="text-emerald-700 text-sm mb-6">Your feedback helps other buyers and supports our local sellers.</p>
                      <button
                        onClick={() => setShowReviewModal(true)}
                        className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-2"
                      >
                        <Star className="w-4 h-4 fill-current" />
                        Rate this {isFarmer ? 'Seller' : 'Retailer'}
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {reviews.map((review) => (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      key={review.id} 
                      className="bg-stone-50 p-6 rounded-2xl space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-stone-200 overflow-hidden">
                            {review.buyerPhoto ? (
                              <img src={review.buyerPhoto} alt={review.buyerName} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-stone-400">
                                <User className="w-5 h-5" />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-stone-900 text-sm">{review.buyerName}</p>
                            <p className="text-[10px] text-stone-400 font-medium">{new Date(review.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star 
                                key={star} 
                                className={`w-3 h-3 ${star <= review.rating ? 'text-amber-400 fill-current' : 'text-stone-200'}`} 
                              />
                            ))}
                          </div>
                          <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 rounded-full">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Verified Buyer</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-stone-600 text-sm italic leading-relaxed">
                        "{review.comment}"
                      </p>
                    </motion.div>
                  ))}
                  {reviews.length === 0 && (
                    <div className="col-span-full text-center py-16 bg-stone-50 rounded-3xl border border-dashed border-stone-200">
                      <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <MessageSquare className="w-8 h-8 text-stone-300" />
                      </div>
                      <p className="text-stone-400 font-medium">No reviews yet. Be the first to share your experience with this {isFarmer ? 'seller' : 'retailer'}!</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <ReviewModal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        targetId={sellerId!}
        targetType="seller"
        targetName={seller?.farmName || seller?.businessName || seller?.displayName || 'Seller'}
        onSuccess={() => {
          // The onSnapshot will handle the update automatically
        }}
      />

      <Toast 
        message={toast.message} 
        type={toast.type} 
        isVisible={toast.isVisible} 
        onClose={() => setToast(prev => ({ ...prev, isVisible: false }))} 
      />
    </div>
  );
};

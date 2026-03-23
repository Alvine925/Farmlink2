import React, { useState } from 'react';
import { Star, X, MessageSquare, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Toast } from './Toast';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetId: string;
  targetType: 'product' | 'seller';
  targetName: string;
  onSuccess?: () => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  onClose,
  targetId,
  targetType,
  targetName,
  onSuccess
}) => {
  const { user, profile } = useAuth();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; isVisible: boolean }>({
    message: '',
    type: 'success',
    isVisible: false
  });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type, isVisible: true });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) {
      showToast('Please login to leave a review', 'error');
      return;
    }

    if (rating === 0) {
      showToast('Please select a rating', 'error');
      return;
    }

    if (comment.trim().length < 5) {
      showToast('Please leave a more detailed comment', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const reviewData: any = {
        buyerId: user.uid,
        buyerName: profile.displayName || 'Anonymous Buyer',
        buyerPhoto: profile.photoURL || '',
        rating,
        comment: comment.trim(),
        createdAt: new Date().toISOString(),
        timestamp: serverTimestamp()
      };

      if (targetType === 'product') {
        reviewData.productId = targetId;
      } else {
        reviewData.farmerId = targetId;
      }

      await addDoc(collection(db, 'reviews'), reviewData);
      
      showToast('Review submitted successfully!');
      setTimeout(() => {
        onSuccess?.();
        onClose();
        setRating(0);
        setComment('');
      }, 1500);
    } catch (error) {
      console.error('Error submitting review:', error);
      showToast('Failed to submit review. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 sm:p-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-stone-900">Write a Review</h2>
                    <p className="text-stone-500 text-sm mt-1">Share your experience with {targetName}</p>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-stone-100 rounded-full transition-colors"
                  >
                    <X className="w-6 h-6 text-stone-400" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="flex flex-col items-center justify-center p-6 bg-stone-50 rounded-2xl border border-stone-100">
                    <p className="text-sm font-medium text-stone-600 mb-3">Overall Rating</p>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          onMouseEnter={() => setHover(star)}
                          onMouseLeave={() => setHover(0)}
                          className="p-1 transition-transform hover:scale-110"
                        >
                          <Star
                            className={`w-10 h-10 ${
                              star <= (hover || rating)
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-stone-300'
                            } transition-colors`}
                          />
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-stone-400 mt-4 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      Your review will be public and verified
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-stone-900 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-emerald-600" />
                      Your Feedback
                    </label>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder={`What did you think about this ${targetType === 'product' ? 'product' : 'seller'}?`}
                      className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-100 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[120px] resize-none"
                      required
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 px-6 py-3 rounded-xl font-bold text-stone-600 hover:bg-stone-100 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || rating === 0}
                      className={`flex-[2] px-6 py-3 rounded-xl font-bold text-white shadow-lg transition-all ${
                        isSubmitting || rating === 0
                          ? 'bg-stone-300 cursor-not-allowed'
                          : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
                      }`}
                    >
                      {isSubmitting ? 'Submitting...' : 'Submit Review'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
      />
    </>
  );
};

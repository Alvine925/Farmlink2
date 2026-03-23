import React from 'react';
import { Bell, Check, Trash2, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Notification } from '../types';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface NotificationListProps {
  notifications: Notification[];
}

export const NotificationList: React.FC<NotificationListProps> = ({ notifications }) => {
  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unread = notifications.filter(n => !n.read);
      await Promise.all(unread.map(n => updateDoc(doc(db, 'notifications', n.id), { read: true })));
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'notifications', id));
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Bell className="w-5 h-5 text-emerald-600" />
          Notifications
        </h3>
        {notifications.filter(n => !n.read).length > 0 && (
          <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-1 rounded-full">
            {notifications.filter(n => !n.read).length} New
          </span>
        )}
        {notifications.filter(n => !n.read).length > 0 && (
          <button 
            onClick={markAllAsRead}
            className="text-xs text-emerald-700 font-bold hover:underline ml-auto"
          >
            Mark all as read
          </button>
        )}
      </div>

      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {notifications.length > 0 ? (
            notifications.map((n) => (
              <motion.div
                key={n.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`p-4 rounded-2xl border transition-all ${
                  n.read ? 'bg-white border-stone-100' : 'bg-emerald-50/50 border-emerald-100 shadow-sm'
                }`}
              >
                <div className="flex justify-between gap-4">
                  <div className="flex-1">
                    <h4 className={`text-sm font-bold mb-1 ${n.read ? 'text-stone-700' : 'text-emerald-900'}`}>
                      {n.title}
                    </h4>
                    <p className="text-xs text-stone-600 leading-relaxed mb-2">
                      {n.message}
                    </p>
                    <div className="flex items-center gap-3 text-[10px] text-stone-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(n.createdAt)}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {!n.read && (
                      <button
                        onClick={() => markAsRead(n.id)}
                        className="p-1.5 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors"
                        title="Mark as read"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotification(n.id)}
                      className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-stone-200">
              <Bell className="w-8 h-8 text-stone-200 mx-auto mb-3" />
              <p className="text-stone-400 text-sm">No notifications yet</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

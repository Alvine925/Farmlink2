import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, doc, getDoc, addDoc, updateDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { ChatRoom, ChatMessage, UserProfile } from '../types';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { MessageSquare, User, Send, Search, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const Messages: React.FC = () => {
  const { user } = useAuth();
  const [chatRooms, setChatRooms] = useState<(ChatRoom & { recipient?: UserProfile })[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'chatRooms'),
      where('participants', 'array-contains', user.uid),
      orderBy('lastMessageAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const rooms = await Promise.all(snapshot.docs.map(async (roomDoc) => {
        const data = roomDoc.data() as ChatRoom;
        const recipientId = data.participants.find(p => p !== user.uid);
        let recipientData: UserProfile | undefined;

        if (recipientId) {
          const userDoc = await getDoc(doc(db, 'users', recipientId));
          if (userDoc.exists()) {
            recipientData = { uid: userDoc.id, ...userDoc.data() } as UserProfile;
          }
        }

        return { id: roomDoc.id, ...data, recipient: recipientData };
      }));
      setChatRooms(rooms);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'chatRooms');
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!activeChatId || !user) return;

    // Mark notifications for this chat as read
    const markAsRead = async () => {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', user.uid),
        where('relatedId', '==', activeChatId),
        where('read', '==', false)
      );
      const snapshot = await getDocs(q);
      snapshot.docs.forEach(async (notificationDoc) => {
        await updateDoc(doc(db, 'notifications', notificationDoc.id), { read: true });
      });
    };
    markAsRead();

    const q = query(
      collection(db, 'chatRooms', activeChatId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `chatRooms/${activeChatId}/messages`);
    });

    return () => unsubscribe();
  }, [activeChatId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeChatId || !newMessage.trim()) return;

    const text = newMessage.trim();
    setNewMessage('');

    try {
      await addDoc(collection(db, 'chatRooms', activeChatId, 'messages'), {
        chatRoomId: activeChatId,
        senderId: user.uid,
        text,
        createdAt: new Date().toISOString()
      });

      // Create notification for recipient
      const recipientId = activeRoom?.participants.find(p => p !== user.uid);
      if (recipientId) {
        await addDoc(collection(db, 'notifications'), {
          userId: recipientId,
          title: 'New Message',
          message: `You have a new message from ${user.displayName || 'a user'}`,
          type: 'system',
          relatedId: activeChatId,
          read: false,
          createdAt: new Date().toISOString()
        });
      }

      await updateDoc(doc(db, 'chatRooms', activeChatId), {
        lastMessage: text,
        lastMessageAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const activeRoom = chatRooms.find(r => r.id === activeChatId);

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-12rem)] bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden flex">
      {/* Sidebar */}
      <div className="w-full md:w-80 border-r border-stone-100 flex flex-col">
        <div className="p-6 border-b border-stone-100">
          <h1 className="text-2xl font-bold text-stone-900 mb-4">Messages</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-stone-50 border border-stone-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-700"></div>
            </div>
          ) : chatRooms.length === 0 ? (
            <div className="p-10 text-center">
              <MessageSquare className="w-12 h-12 text-stone-200 mx-auto mb-2" />
              <p className="text-stone-400 text-sm">No conversations yet.</p>
            </div>
          ) : (
            chatRooms
              .filter(room => room.recipient?.displayName.toLowerCase().includes(searchTerm.toLowerCase()))
              .map((room) => (
                <button
                  key={room.id}
                  onClick={() => setActiveChatId(room.id)}
                  className={`w-full p-4 flex items-center gap-4 hover:bg-stone-50 transition-colors border-b border-stone-50 ${activeChatId === room.id ? 'bg-emerald-50/50' : ''}`}
                >
                  <div className="w-12 h-12 rounded-full bg-stone-100 overflow-hidden flex-shrink-0">
                    {room.recipient?.photoURL ? (
                      <img src={room.recipient.photoURL} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-stone-400">
                        <User className="w-6 h-6" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <h3 className="font-bold text-stone-900 truncate">{room.recipient?.displayName || 'Unknown User'}</h3>
                      <span className="text-[10px] text-stone-400 whitespace-nowrap">
                        {new Date(room.lastMessageAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 truncate">{room.lastMessage || 'No messages yet'}</p>
                  </div>
                </button>
              ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-stone-50/30">
        {activeChatId ? (
          <>
            {/* Chat Header */}
            <div className="p-4 bg-white border-b border-stone-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-stone-100 overflow-hidden">
                  {activeRoom?.recipient?.photoURL ? (
                    <img src={activeRoom.recipient.photoURL} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-stone-400">
                      <User className="w-5 h-5" />
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-stone-900">{activeRoom?.recipient?.displayName}</h3>
                  <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">{activeRoom?.recipient?.role}</p>
                </div>
              </div>
            </div>

            {/* Messages List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.senderId === user?.uid ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] p-4 rounded-2xl text-sm ${
                      msg.senderId === user?.uid
                        ? 'bg-emerald-700 text-white rounded-tr-none shadow-md'
                        : 'bg-white text-stone-900 border border-stone-100 rounded-tl-none shadow-sm'
                    }`}
                  >
                    {msg.text}
                    <div className={`text-[10px] mt-2 ${msg.senderId === user?.uid ? 'text-emerald-200' : 'text-stone-400'}`}>
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Message Input */}
            <form onSubmit={handleSendMessage} className="p-6 bg-white border-t border-stone-100 flex gap-4">
              <input
                type="text"
                placeholder="Type your message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-1 bg-stone-50 border border-stone-100 rounded-2xl px-6 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
              <button
                type="submit"
                disabled={!newMessage.trim()}
                className="bg-emerald-700 text-white px-6 py-3 rounded-2xl font-bold hover:bg-emerald-800 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                <span>Send</span>
                <Send className="w-4 h-4" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm mb-6">
              <MessageSquare className="w-10 h-10 text-emerald-700" />
            </div>
            <h2 className="text-xl font-bold text-stone-900 mb-2">Select a conversation</h2>
            <p className="text-stone-500 max-w-xs">Choose a conversation from the list on the left to start messaging.</p>
          </div>
        )}
      </div>
    </div>
  );
};

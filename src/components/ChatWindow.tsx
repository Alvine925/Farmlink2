import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot, addDoc, orderBy, serverTimestamp, doc, updateDoc, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { ChatMessage, ChatRoom } from '../types';
import { Send, X, MessageSquare, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ChatWindowProps {
  recipientId: string;
  recipientName: string;
  onClose: () => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ recipientId, recipientName, onClose }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatRoomId, setChatRoomId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!user || !recipientId) return;

    const findOrCreateChatRoom = async () => {
      setLoading(true);
      try {
        // Look for existing chat room with these two participants
        const q = query(
          collection(db, 'chatRooms'),
          where('participants', 'array-contains', user.uid)
        );
        
        const querySnapshot = await getDocs(q);
        let existingRoomId = null;
        
        querySnapshot.forEach((doc) => {
          const data = doc.data() as ChatRoom;
          if (data.participants.includes(recipientId)) {
            existingRoomId = doc.id;
          }
        });

        if (existingRoomId) {
          setChatRoomId(existingRoomId);
        } else {
          // Create new chat room
          const newRoomRef = await addDoc(collection(db, 'chatRooms'), {
            participants: [user.uid, recipientId],
            createdAt: new Date().toISOString(),
            lastMessage: '',
            lastMessageAt: new Date().toISOString()
          });
          setChatRoomId(newRoomRef.id);
        }
      } catch (error) {
        console.error("Error finding/creating chat room:", error);
      } finally {
        setLoading(false);
      }
    };

    findOrCreateChatRoom();
  }, [user, recipientId]);

  useEffect(() => {
    if (!chatRoomId) return;

    const q = query(
      collection(db, 'chatRooms', chatRoomId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, [chatRoomId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !chatRoomId || !newMessage.trim()) return;

    const messageText = newMessage.trim();
    setNewMessage('');

    try {
      const messageData = {
        chatRoomId,
        senderId: user.uid,
        text: messageText,
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'chatRooms', chatRoomId, 'messages'), messageData);

      // Update last message in chat room
      await updateDoc(doc(db, 'chatRooms', chatRoomId), {
        lastMessage: messageText,
        lastMessageAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 20 }}
      className="fixed bottom-4 right-4 z-50 w-80 md:w-96 bg-white rounded-2xl shadow-2xl border border-stone-100 flex flex-col overflow-hidden"
      style={{ height: '500px' }}
    >
      {/* Header */}
      <div className="bg-emerald-700 p-4 text-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center">
            <User className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm">{recipientName}</h3>
            <p className="text-[10px] text-emerald-200 uppercase tracking-wider">Farmer</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-emerald-600 rounded-lg transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-stone-50">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-700"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-10">
            <MessageSquare className="w-12 h-12 text-stone-200 mx-auto mb-2" />
            <p className="text-stone-400 text-sm">No messages yet. Say hello!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.senderId === user?.uid ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                  msg.senderId === user?.uid
                    ? 'bg-emerald-600 text-white rounded-tr-none'
                    : 'bg-white text-stone-900 border border-stone-100 rounded-tl-none shadow-sm'
                }`}
              >
                {msg.text}
                <div className={`text-[10px] mt-1 ${msg.senderId === user?.uid ? 'text-emerald-200' : 'text-stone-400'}`}>
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-stone-100 flex gap-2">
        <input
          type="text"
          placeholder="Type a message..."
          className="flex-1 bg-stone-50 border border-stone-100 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
        />
        <button
          type="submit"
          disabled={!newMessage.trim()}
          className="bg-emerald-700 text-white p-2 rounded-xl hover:bg-emerald-800 transition-all disabled:opacity-50"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </motion.div>
  );
};

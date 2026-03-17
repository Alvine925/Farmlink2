export type UserRole = 'farmer' | 'buyer' | 'admin';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: UserRole;
  farmName?: string;
  location?: {
    lat: number;
    lng: number;
    address: string;
  };
  certifications?: string[];
  businessType?: string;
  isVerified?: boolean;
  createdAt: string;
  favorites?: string[]; // Array of product IDs
}

export interface Product {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  price: number;
  description: string;
  harvestDate: string;
  growingMethod: string;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  images: string[];
  farmerId: string;
  farmerName: string;
  createdAt: string;
}

export interface Order {
  id: string;
  buyerId: string;
  buyerName: string;
  farmerId: string;
  farmerName: string;
  items: {
    productId: string;
    name: string;
    quantity: number;
    price: number;
  }[];
  totalAmount: number;
  status: 'pending' | 'accepted' | 'declined' | 'fulfilled' | 'completed';
  deliveryMethod: 'pickup' | 'delivery';
  deliveryOption?: 'standard' | 'express' | null;
  deliveryFee: number;
  paymentMethod: string;
  createdAt: string;
  acceptedAt?: string;
  fulfilledAt?: string;
  completedAt?: string;
  declinedAt?: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'order_new' | 'order_status' | 'system';
  relatedId?: string; // e.g., orderId
  read: boolean;
  createdAt: string;
}

export interface ChatRoom {
  id: string;
  participants: string[];
  lastMessage?: string;
  lastMessageAt?: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  chatRoomId: string;
  senderId: string;
  text: string;
  createdAt: string;
}

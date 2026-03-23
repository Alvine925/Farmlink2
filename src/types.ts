export type UserRole = 'farmer' | 'buyer' | 'retailer' | 'admin';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: UserRole;
  farmName?: string;
  businessName?: string;
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
  phone?: string;
  farmSize?: string;
  isWholesale?: boolean;
  isRetail?: boolean;
  description?: string;
  savedAddresses?: {
    id: string;
    label: string;
    address: string;
    estateName?: string;
    landmark?: string;
    blockOrApartment?: string;
    directionsNarrative?: string;
    googlePin?: {
      lat: number;
      lng: number;
      address: string;
    };
    isDefault: boolean;
  }[];
  savedPaymentMethods?: {
    id: string;
    type: 'card' | 'mobile_money';
    lastFour?: string;
    provider?: string;
    isDefault: boolean;
  }[];
  preferredPartners?: string[]; // Array of user IDs (farmers for buyers, buyers for farmers)
}

export interface BulkPricing {
  minQuantity: number;
  pricePerUnit: number;
}

export type ProductStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected';

export interface Product {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  price: number;
  description: string;
  detailedDescription?: string;
  videoUrl?: string;
  features?: string[];
  qualities?: string[];
  bulkPricing?: BulkPricing[];
  paymentMethods?: ('on_delivery' | 'in_app')[];
  status: ProductStatus;
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
  status: 'pending' | 'accepted' | 'shipped' | 'declined' | 'received' | 'fulfilled' | 'completed';
  deliveryMethod: 'pickup' | 'delivery';
  deliveryOption?: 'standard' | 'express' | null;
  deliveryFee: number;
  deliveryAddress?: string;
  deliveryDetails?: {
    estateName?: string;
    landmark?: string;
    blockOrApartment?: string;
    directionsNarrative?: string;
    googlePin?: {
      lat: number;
      lng: number;
      address: string;
    };
  };
  buyerEmail: string;
  buyerPhone?: string;
  paymentMethod: string;
  createdAt: string;
  acceptedAt?: string;
  shippedAt?: string;
  receivedAt?: string;
  fulfilledAt?: string;
  completedAt?: string;
  declinedAt?: string;
  trackingNumber?: string;
  carrier?: string;
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
  read?: boolean;
  createdAt: string;
}

export interface Review {
  id: string;
  productId?: string;
  farmerId?: string;
  buyerId: string;
  buyerName: string;
  buyerPhoto?: string;
  rating: number; // 1-5
  comment: string;
  createdAt: string;
}

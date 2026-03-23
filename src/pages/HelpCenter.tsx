import React, { useState } from 'react';
import { Search, ChevronRight, BookOpen, ShieldCheck, Truck, CreditCard, MessageSquare, User, HelpCircle } from 'lucide-react';
import { motion } from 'motion/react';

const categories = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: BookOpen,
    description: 'Learn the basics of using FarmLink as a buyer or farmer.',
    articles: [
      'How to create an account',
      'Verifying your identity',
      'Setting up your profile',
      'Navigating the marketplace'
    ]
  },
  {
    id: 'for-farmers',
    title: 'For Farmers',
    icon: User,
    description: 'Everything you need to know about selling your produce.',
    articles: [
      'Listing your first product',
      'Managing inventory',
      'Communicating with buyers',
      'Fulfilling orders'
    ]
  },
  {
    id: 'for-buyers',
    title: 'For Buyers',
    icon: ShoppingCart,
    description: 'Find, buy, and track your favorite local produce.',
    articles: [
      'How to place an order',
      'Tracking your delivery',
      'Rating and reviewing products',
      'Managing your wishlist'
    ]
  },
  {
    id: 'payments',
    title: 'Payments & Security',
    icon: CreditCard,
    description: 'Safe and secure transactions for everyone.',
    articles: [
      'Accepted payment methods',
      'How payouts work for farmers',
      'Refund policy',
      'Protecting your account'
    ]
  },
  {
    id: 'shipping',
    title: 'Shipping & Logistics',
    icon: Truck,
    description: 'Getting produce from the farm to your table.',
    articles: [
      'Delivery options',
      'Shipping fees',
      'Handling damaged goods',
      'International shipping'
    ]
  },
  {
    id: 'trust',
    title: 'Trust & Safety',
    icon: ShieldCheck,
    description: 'Our commitment to a fair and honest marketplace.',
    articles: [
      'Verified farmer program',
      'Reporting suspicious activity',
      'Community guidelines',
      'Dispute resolution'
    ]
  }
];

import { ShoppingCart } from 'lucide-react';

export const HelpCenter: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCategories = categories.filter(cat => 
    cat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cat.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cat.articles.some(art => art.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-12 pb-20">
      {/* Hero Section */}
      <section className="relative h-80 rounded-3xl overflow-hidden bg-emerald-900 flex items-center justify-center text-center px-4">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-400 via-transparent to-transparent" />
        </div>
        <div className="relative z-10 max-w-2xl w-full space-y-6">
          <h1 className="text-4xl md:text-5xl font-bold text-white">How can we help you?</h1>
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Search for articles, guides, or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border-none focus:ring-2 focus:ring-emerald-500 shadow-xl text-stone-900"
            />
          </div>
        </div>
      </section>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredCategories.map((cat, idx) => (
          <motion.div
            key={cat.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white p-8 rounded-3xl border border-stone-100 shadow-sm hover:shadow-md transition-all group"
          >
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-6 group-hover:scale-110 transition-transform">
              <cat.icon className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-stone-900 mb-2">{cat.title}</h2>
            <p className="text-stone-500 text-sm mb-6 leading-relaxed">{cat.description}</p>
            <ul className="space-y-3">
              {cat.articles.map((art, i) => (
                <li key={i}>
                  <button className="flex items-center justify-between w-full text-left text-sm text-stone-600 hover:text-emerald-700 font-medium group/item">
                    <span>{art}</span>
                    <ChevronRight className="w-4 h-4 opacity-0 group-hover/item:opacity-100 -translate-x-2 group-hover/item:translate-x-0 transition-all" />
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>

      {/* FAQ Section */}
      <section className="bg-stone-50 rounded-3xl p-12 border border-stone-100">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold text-stone-900">Frequently Asked Questions</h2>
            <p className="text-stone-500">Quick answers to common questions.</p>
          </div>
          <div className="space-y-4">
            {[
              { q: "Is FarmLink available in my area?", a: "FarmLink is currently expanding across several regions. You can check availability by entering your location in the marketplace filters." },
              { q: "How do I know if a farmer is verified?", a: "Verified farmers have a green shield icon next to their name. This means we've verified their identity and farming certifications." },
              { q: "What happens if my produce arrives damaged?", a: "We have a comprehensive refund policy. Simply take a photo of the damaged goods and contact our support team within 24 hours of delivery." }
            ].map((faq, i) => (
              <div key={i} className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm">
                <h3 className="font-bold text-stone-900 mb-2 flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-emerald-600" />
                  {faq.q}
                </h3>
                <p className="text-stone-600 text-sm leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="text-center space-y-6 py-12">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-700">
          <MessageSquare className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-stone-900">Still have questions?</h2>
          <p className="text-stone-500">Our support team is always here to help you.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button className="bg-emerald-700 text-white px-8 py-3 rounded-xl font-bold hover:bg-emerald-800 transition-all shadow-lg">
            Contact Support
          </button>
          <button className="bg-white text-stone-700 border border-stone-200 px-8 py-3 rounded-xl font-bold hover:bg-stone-50 transition-all">
            Visit Community Forum
          </button>
        </div>
      </section>
    </div>
  );
};

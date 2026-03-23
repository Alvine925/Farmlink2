import React from 'react';
import { motion } from 'motion/react';
import { BookOpen, User, Sprout, ShieldCheck, CreditCard, Truck, MessageSquare, Star, ArrowRight } from 'lucide-react';

export const Guides: React.FC = () => {
  const farmerGuides = [
    {
      title: 'Getting Started as a Farmer',
      description: 'Learn how to set up your farm profile, list products, and start selling.',
      icon: Sprout,
      steps: [
        'Complete your farm profile with high-quality photos.',
        'List your products with clear descriptions and pricing.',
        'Set up your delivery and pickup options.',
        'Verify your account to build trust with buyers.'
      ]
    },
    {
      title: 'Managing Orders & Customers',
      description: 'Best practices for handling orders and building long-term relationships.',
      icon: Truck,
      steps: [
        'Respond to new orders within 24 hours.',
        'Keep your inventory up to date.',
        'Communicate clearly with buyers via the built-in chat.',
        'Add loyal customers to your "Preferred Buyers" list.'
      ]
    },
    {
      title: 'Maximizing Your Sales',
      description: 'Tips and tricks to make your farm stand out in the marketplace.',
      icon: Star,
      steps: [
        'Use the analytics dashboard to track performance.',
        'Offer seasonal promotions or bulk discounts.',
        'Collect and showcase positive reviews.',
        'Participate in community events and forums.'
      ]
    }
  ];

  const buyerGuides = [
    {
      title: 'Finding the Best Produce',
      description: 'How to navigate the marketplace and find exactly what you need.',
      icon: BookOpen,
      steps: [
        'Use filters to sort by category, price, and location.',
        'Check farmer ratings and reviews before buying.',
        'Follow your favorite farmers to get updates.',
        'Look for "Verified" badges for guaranteed quality.'
      ]
    },
    {
      title: 'Safe & Secure Payments',
      description: 'Understanding our payment system and buyer protection.',
      icon: ShieldCheck,
      steps: [
        'Save your preferred payment methods for faster checkout.',
        'Payments are held in escrow until delivery is confirmed.',
        'Report any issues within 48 hours of delivery.',
        'Never share your payment details outside the platform.'
      ]
    },
    {
      title: 'Building Your Network',
      description: 'How to connect with farmers and get the best deals.',
      icon: User,
      steps: [
        'Add farmers to your "Preferred Farmers" list.',
        'Message farmers directly for custom orders or inquiries.',
        'Leave detailed reviews to help the community.',
        'Refer friends to earn platform credits.'
      ]
    }
  ];

  return (
    <div className="max-w-6xl mx-auto py-12 px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-16"
      >
        <h1 className="text-4xl font-bold text-slate-900 mb-4">Platform Guides</h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          Everything you need to know to succeed on our platform, whether you're growing fresh produce or looking for the best local food.
        </p>
      </motion.div>

      <div className="space-y-24">
        {/* Farmer Section */}
        <section>
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-emerald-100 text-emerald-700 rounded-2xl">
              <Sprout className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-slate-900">For Farmers</h2>
              <p className="text-slate-500">Grow your business and reach more customers.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {farmerGuides.map((guide, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow"
              >
                <guide.icon className="w-10 h-10 text-emerald-600 mb-6" />
                <h3 className="text-xl font-bold text-slate-900 mb-3">{guide.title}</h3>
                <p className="text-slate-600 mb-6 text-sm">{guide.description}</p>
                <ul className="space-y-3">
                  {guide.steps.map((step, sIndex) => (
                    <li key={sIndex} className="flex gap-3 text-sm text-slate-500">
                      <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                      {step}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Buyer Section */}
        <section>
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-blue-100 text-blue-700 rounded-2xl">
              <User className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-slate-900">For Buyers</h2>
              <p className="text-slate-500">Find the freshest produce and support local farms.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {buyerGuides.map((guide, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow"
              >
                <guide.icon className="w-10 h-10 text-blue-600 mb-6" />
                <h3 className="text-xl font-bold text-slate-900 mb-3">{guide.title}</h3>
                <p className="text-slate-600 mb-6 text-sm">{guide.description}</p>
                <ul className="space-y-3">
                  {guide.steps.map((step, sIndex) => (
                    <li key={sIndex} className="flex gap-3 text-sm text-slate-500">
                      <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                      {step}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </section>

        {/* FAQ Section */}
        <section className="bg-slate-900 rounded-[3rem] p-12 text-white overflow-hidden relative">
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">Still have questions?</h2>
              <p className="text-slate-400 mb-8">
                Our support team is here to help you with any issues or questions you might have about using the platform.
              </p>
              <div className="flex flex-wrap gap-4">
                <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-2xl font-bold transition-all flex items-center gap-2">
                  Visit Help Center <ArrowRight className="w-5 h-5" />
                </button>
                <button className="bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-2xl font-bold transition-all">
                  Contact Support
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                  <MessageSquare className="w-6 h-6 text-emerald-400 mb-4" />
                  <h4 className="font-bold mb-2">24/7 Chat Support</h4>
                  <p className="text-xs text-slate-400">Get help anytime from our dedicated team.</p>
                </div>
                <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                  <CreditCard className="w-6 h-6 text-blue-400 mb-4" />
                  <h4 className="font-bold mb-2">Secure Payments</h4>
                  <p className="text-xs text-slate-400">Learn about our escrow and protection.</p>
                </div>
              </div>
              <div className="space-y-4 mt-8">
                <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                  <ShieldCheck className="w-6 h-6 text-purple-400 mb-4" />
                  <h4 className="font-bold mb-2">Buyer Protection</h4>
                  <p className="text-xs text-slate-400">Your purchases are always covered.</p>
                </div>
                <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                  <BookOpen className="w-6 h-6 text-amber-400 mb-4" />
                  <h4 className="font-bold mb-2">Video Tutorials</h4>
                  <p className="text-xs text-slate-400">Watch step-by-step guides on YouTube.</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Background Decoration */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-600/10 blur-[100px] -mr-48 -mt-48" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-600/10 blur-[100px] -ml-48 -mb-48" />
        </section>
      </div>
    </div>
  );
};

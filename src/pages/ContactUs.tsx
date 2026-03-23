import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, MessageSquare, Clock, ShieldCheck, User, CheckCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { Toast } from '../components/Toast';

export const ContactUs: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; isVisible: boolean }>({
    message: '',
    type: 'success',
    isVisible: false
  });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type, isVisible: true });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      showToast('Message sent successfully! We will get back to you soon.');
      setFormData({ name: '', email: '', subject: '', message: '' });
    }, 1500);
  };

  return (
    <div className="space-y-16 pb-20">
      {/* Hero Section */}
      <section className="text-center space-y-4 max-w-2xl mx-auto py-12">
        <h1 className="text-4xl md:text-5xl font-bold text-stone-900">Get in Touch</h1>
        <p className="text-stone-500 text-lg leading-relaxed">
          Have questions about FarmLink? Whether you're a farmer looking to sell or a buyer with questions, our team is here to help.
        </p>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Contact Info */}
        <div className="lg:col-span-1 space-y-8">
          <div className="bg-white p-8 rounded-3xl border border-stone-100 shadow-sm space-y-8">
            <h2 className="text-2xl font-bold text-stone-900">Contact Information</h2>
            
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Email Us</p>
                  <p className="text-stone-900 font-medium">support@farmlink.com</p>
                  <p className="text-stone-500 text-sm">We respond within 24 hours.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Call Us</p>
                  <p className="text-stone-900 font-medium">+1 (555) 123-4567</p>
                  <p className="text-stone-500 text-sm">Mon-Fri, 9am - 6pm EST.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 flex-shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Visit Us</p>
                  <p className="text-stone-900 font-medium">123 FarmLink Way</p>
                  <p className="text-stone-500 text-sm">Agriculture City, AC 12345</p>
                </div>
              </div>
            </div>

            <div className="pt-8 border-t border-stone-100">
              <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider mb-4">Support Hours</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-stone-500">Monday - Friday</span>
                  <span className="text-stone-900 font-medium">9:00 AM - 6:00 PM</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-stone-500">Saturday</span>
                  <span className="text-stone-900 font-medium">10:00 AM - 4:00 PM</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-stone-500">Sunday</span>
                  <span className="text-stone-900 font-medium">Closed</span>
                </div>
              </div>
            </div>
          </div>

          {/* Trust Badge */}
          <div className="bg-emerald-900 text-white p-8 rounded-3xl shadow-xl space-y-4">
            <div className="w-12 h-12 bg-emerald-800 rounded-2xl flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
            </div>
            <h3 className="text-xl font-bold">Safe & Secure</h3>
            <p className="text-emerald-100 text-sm leading-relaxed">
              Your data is protected by industry-standard encryption. We never share your personal information with third parties.
            </p>
          </div>
        </div>

        {/* Contact Form */}
        <div className="lg:col-span-2">
          <div className="bg-white p-10 rounded-3xl border border-stone-100 shadow-sm space-y-8">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold text-stone-900">Send us a Message</h2>
              <p className="text-stone-500">Fill out the form below and we'll get back to you as soon as possible.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-400 uppercase tracking-wider ml-1">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 w-4 h-4" />
                    <input 
                      type="text" 
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="John Doe"
                      className="w-full pl-12 pr-4 py-4 rounded-2xl bg-stone-50 border-none focus:ring-2 focus:ring-emerald-500 text-stone-900"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-400 uppercase tracking-wider ml-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 w-4 h-4" />
                    <input 
                      type="email" 
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="john@example.com"
                      className="w-full pl-12 pr-4 py-4 rounded-2xl bg-stone-50 border-none focus:ring-2 focus:ring-emerald-500 text-stone-900"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-400 uppercase tracking-wider ml-1">Subject</label>
                <div className="relative">
                  <MessageSquare className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 w-4 h-4" />
                  <input 
                    type="text" 
                    required
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="How can we help?"
                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-stone-50 border-none focus:ring-2 focus:ring-emerald-500 text-stone-900"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-400 uppercase tracking-wider ml-1">Message</label>
                <textarea 
                  required
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Tell us more about your inquiry..."
                  rows={6}
                  className="w-full px-6 py-4 rounded-2xl bg-stone-50 border-none focus:ring-2 focus:ring-emerald-500 text-stone-900 resize-none"
                />
              </div>

              <button 
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-emerald-700 text-white py-4 rounded-2xl font-bold text-lg hover:bg-emerald-800 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Send Message
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Social Proof Section */}
      <section className="bg-stone-50 rounded-3xl p-12 border border-stone-100 text-center space-y-8">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-stone-900">Join our Community</h2>
          <p className="text-stone-500">Connect with thousands of farmers and buyers across the country.</p>
        </div>
        <div className="flex flex-wrap justify-center gap-8">
          {[
            { label: 'Verified Farmers', value: '5,000+' },
            { label: 'Happy Buyers', value: '50,000+' },
            { label: 'Produce Delivered', value: '100,000+' },
            { label: 'Success Rate', value: '99.9%' }
          ].map((stat, i) => (
            <div key={i} className="space-y-1">
              <p className="text-3xl font-bold text-emerald-700">{stat.value}</p>
              <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <Toast 
        message={toast.message} 
        type={toast.type} 
        isVisible={toast.isVisible} 
        onClose={() => setToast(prev => ({ ...prev, isVisible: false }))} 
      />
    </div>
  );
};

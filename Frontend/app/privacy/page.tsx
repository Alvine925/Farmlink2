"use client";

import React from 'react';
import { ShieldCheck, Lock, Eye, FileText, UserCheck, Bell, Globe, Mail } from 'lucide-react';
import { motion } from 'motion/react';

export default function PrivacyPolicy() {
  const sections = [
    {
      title: '1. Information We Collect',
      icon: Eye,
      content: 'We collect information you provide directly to us, such as when you create or modify your account, request services, contact customer support, or otherwise communicate with us. This information may include: name, email, phone number, postal address, profile picture, payment method, and other information you choose to provide.'
    },
    {
      title: '2. How We Use Your Information',
      icon: Lock,
      content: 'We use the information we collect to provide, maintain, and improve our services, such as to facilitate payments, send receipts, provide products and services you request (and send related information), develop new features, provide customer support, and send administrative and promotional communications.'
    },
    {
      title: '3. Sharing of Information',
      icon: Globe,
      content: 'We may share the information we collect about you as described in this statement or as described at the time of collection or sharing, including: with third-party service providers to provide services on our behalf; with other users in connection with the services you request; and in response to a request for information by a competent authority.'
    },
    {
      title: '4. Data Security',
      icon: ShieldCheck,
      content: 'We take reasonable measures to help protect information about you from loss, theft, misuse and unauthorized access, disclosure, alteration and destruction. We use industry-standard encryption and security protocols to ensure your data remains safe and private.'
    },
    {
      title: '5. Your Choices',
      icon: UserCheck,
      content: 'You may update, correct or delete information about you at any time by logging into your online account or by emailing us. If you wish to delete your account, please email us, but note that we may retain certain information as required by law or for legitimate business purposes.'
    },
    {
      title: '6. Cookies and Other Tracking Technologies',
      icon: FileText,
      content: 'Most web browsers are set to accept cookies by default. If you prefer, you can usually choose to set your browser to remove or reject browser cookies. Please note that if you choose to remove or reject cookies, this could affect the availability and functionality of our services.'
    },
    {
      title: '7. Changes to the Statement',
      icon: Bell,
      content: 'We may change this Privacy Statement from time to time. If we make significant changes in the way we treat your personal information, or to the Privacy Statement, we will provide you notice through the Services or by some other means, such as email.'
    },
    {
      title: '8. Contact Us',
      icon: Mail,
      content: 'If you have any questions about this Privacy Statement, please contact us at privacy@tellus.com or through our contact page.'
    }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-20">
      {/* Header */}
      <section className="text-center space-y-4 py-12">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-700 mb-6">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-stone-900">Privacy Policy</h1>
        <p className="text-stone-500 text-lg">
          Last Updated: March 20, 2026
        </p>
        <div className="max-w-2xl mx-auto pt-4">
          <p className="text-stone-600 leading-relaxed">
            At Tellus, we take your privacy seriously. This policy describes how we collect, use, and protect your personal information when you use our platform.
          </p>
        </div>
      </section>

      {/* Content Sections */}
      <div className="space-y-8">
        {sections.map((section, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white p-8 rounded-3xl border border-stone-100 shadow-sm space-y-4"
          >
            <div className="flex items-center gap-3 text-emerald-700">
              <div className="p-2 bg-emerald-50 rounded-lg">
                <section.icon className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold">{section.title}</h2>
            </div>
            <p className="text-stone-600 leading-relaxed pl-11">
              {section.content}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Footer Note */}
      <section className="bg-stone-50 rounded-3xl p-10 border border-stone-100 text-center space-y-4">
        <h3 className="text-xl font-bold text-stone-900">Questions about our policy?</h3>
        <p className="text-stone-500 max-w-lg mx-auto">
          If you have any questions or concerns regarding our privacy practices, please don't hesitate to reach out to our dedicated privacy team.
        </p>
        <button className="bg-emerald-700 text-white px-8 py-3 rounded-xl font-bold hover:bg-emerald-800 transition-all shadow-lg mt-4">
          Contact Privacy Team
        </button>
      </section>
    </div>
  );
}

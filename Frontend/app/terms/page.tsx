"use client";

import React from 'react';
import { FileText, Scale, UserCheck, AlertCircle, CheckCircle2, Info, Gavel, Mail } from 'lucide-react';
import { motion } from 'motion/react';

export default function TermsOfService() {
  const sections = [
    {
      title: '1. Acceptance of Terms',
      icon: CheckCircle2,
      content: 'By accessing or using the Tellus platform, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this site.'
    },
    {
      title: '2. Use License',
      icon: FileText,
      content: 'Permission is granted to temporarily download one copy of the materials (information or software) on Tellus\'s website for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title.'
    },
    {
      title: '3. User Accounts',
      icon: UserCheck,
      content: 'When you create an account with us, you must provide information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Service.'
    },
    {
      title: '4. Farmer and Buyer Responsibilities',
      icon: Scale,
      content: 'Farmers are responsible for the accuracy of their product listings and the quality of their products. Buyers are responsible for providing accurate shipping information and making timely payments. Tellus acts as a facilitator and is not responsible for the actual transaction between farmers and buyers.'
    },
    {
      title: '5. Prohibited Conduct',
      icon: AlertCircle,
      content: 'You agree not to use the platform for any unlawful purpose or in any way that could damage, disable, overburden, or impair the platform. This includes, but is not limited to, uploading malicious code, engaging in fraudulent activities, or harassing other users.'
    },
    {
      title: '6. Limitation of Liability',
      icon: Gavel,
      content: 'In no event shall Tellus or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on Tellus\'s website.'
    },
    {
      title: '7. Governing Law',
      icon: Info,
      content: 'These terms and conditions are governed by and construed in accordance with the laws of the jurisdiction in which Tellus operates and you irrevocably submit to the exclusive jurisdiction of the courts in that State or location.'
    },
    {
      title: '8. Changes to Terms',
      icon: Mail,
      content: 'Tellus reserves the right, at its sole discretion, to modify or replace these Terms at any time. If a revision is material, we will try to provide at least 30 days\' notice prior to any new terms taking effect.'
    }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-20">
      {/* Header */}
      <section className="text-center space-y-4 py-12">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-700 mb-6">
          <FileText className="w-8 h-8" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-stone-900">Terms of Service</h1>
        <p className="text-stone-500 text-lg">
          Last Updated: March 20, 2026
        </p>
        <div className="max-w-2xl mx-auto pt-4">
          <p className="text-stone-600 leading-relaxed">
            Welcome to Tellus. These terms and conditions outline the rules and regulations for the use of our platform. By accessing this website, we assume you accept these terms and conditions.
          </p>
        </div>
      </section>

      {/* Content Sections */}
      <div className="space-y-8">
        {sections.map((section, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
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
        <h3 className="text-xl font-bold text-stone-900">Need clarification?</h3>
        <p className="text-stone-500 max-w-lg mx-auto">
          If you have any questions about our Terms of Service, please reach out to our legal support team for more information.
        </p>
        <button className="bg-emerald-700 text-white px-8 py-3 rounded-xl font-bold hover:bg-emerald-800 transition-all shadow-lg mt-4">
          Contact Legal Team
        </button>
      </section>
    </div>
  );
}

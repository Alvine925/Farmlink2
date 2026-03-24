import Link from "next/link";

export default function Home() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Tellus",
    "url": "https://tellus-marketplace.com",
    "logo": "https://tellus-marketplace.com/logo.png",
    "description": "Direct agricultural marketplace connecting farmers and buyers.",
    "sameAs": [
      "https://twitter.com/tellus",
      "https://facebook.com/tellus"
    ]
  };

  return (
    <div className="text-center py-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <h1 className="text-5xl font-bold tracking-tight text-stone-900 mb-6">Direct from Farm to Your Table</h1>
      <p className="text-xl text-stone-600 mb-10 max-w-2xl mx-auto">
        Connect directly with local farmers, get better prices, and ensure the highest quality produce for your business or home.
      </p>
      <div className="flex justify-center gap-4">
        <Link 
          href="/marketplace"
          className="bg-emerald-700 text-white px-8 py-3 rounded-full font-bold text-lg hover:bg-emerald-800 transition-all shadow-lg"
        >
          Browse Marketplace
        </Link>
        <Link 
          href="/signup"
          className="bg-white text-stone-900 border border-stone-200 px-8 py-3 rounded-full font-bold text-lg hover:bg-stone-50 transition-all"
        >
          Sell Your Produce
        </Link>
      </div>
    </div>
  );
}

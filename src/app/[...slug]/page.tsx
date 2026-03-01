import React from 'react';
import { Home } from 'lucide-react';
import Link from 'next/link';

export default async function CatchAllPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const path = slug.join(' / ');

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-56px)] text-center px-4 space-y-6">
      <div className="empty-dropzone w-full max-w-3xl border-gray-700">
        <h1 className="text-3xl font-bold text-white mb-4">
          Demo of Infereconomics
        </h1>
        <p className="text-gray-400 mb-8 max-w-xl mx-auto">
          You navigated to: <span className="text-[#E0FF4F] font-mono">{path}</span>
        </p>
        <p className="text-gray-500 mb-8">
          This is a placeholder page. The actual implementation focuses on the Inferomics dashboard.
        </p>
        <Link
          href="/Inferomics"
          className="inline-flex items-center gap-2 bg-[#6B4EFF] hover:bg-[#5a41d9] text-white px-6 py-3 rounded-md font-medium btn-lift"
        >
          <Home size={18} />
          Go to Inferomics
        </Link>
      </div>
    </div>
  );
}

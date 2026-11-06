import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#F4F4F2] flex items-center justify-center p-6 select-none">
      <div className="max-w-md w-full bg-white border border-[#E8E8E8] rounded-lg p-8 shadow-sm text-center space-y-4">
        <div className="inline-flex w-12 h-12 rounded-lg bg-[#171717] items-center justify-center p-2 mb-2">
          <img
            src="/images/phd-logo.png"
            alt="PHD Services"
            className="w-full h-full object-contain filter invert"
          />
        </div>
        <div className="space-y-1">
          <span className="font-mono text-xs uppercase tracking-widest text-[#777777]">
            HTTP 404
          </span>
          <h1 className="text-xl font-bold text-[#171717]">Page Not Found</h1>
          <p className="text-xs text-[#777777] leading-relaxed">
            The release record, document, or management route you requested does not exist or has been relocated.
          </p>
        </div>

        <div className="pt-4 border-t border-[#E8E8E8] flex justify-center">
          <Link
            href="/"
            className="inline-flex items-center space-x-2 px-4 py-2 bg-[#171717] hover:bg-[#262626] text-white rounded-lg text-xs font-medium transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Portal</span>
          </Link>
        </div>
      </div>
    </div>
  );
}


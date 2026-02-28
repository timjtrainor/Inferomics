import React from 'react';
import { FileText, MessageCircle, ChevronDown, User } from 'lucide-react';

export function TopNav() {
  return (
    <header className="h-14 border-b border-[#1F2937] bg-[#001A2B] flex items-center justify-between px-4 sticky top-0 z-50">
      <div className="flex items-center gap-4">
        {/* Left icon wrapper */}
        <div className="w-8 h-8 rounded border border-[#1F2937] flex items-center justify-center bg-[#0D1117]">
          <div className="w-4 h-4 border border-gray-400 rounded-sm"></div>
        </div>

        {/* Logo area */}
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-tight text-white flex items-center">
            NEBIUS
            <span className="ml-2 text-xs border border-blue-500 text-blue-400 rounded px-1 py-0.5 uppercase tracking-wider">
              Token Factory
            </span>
          </span>
        </div>

        {/* Project Selector Dropdown */}
        <div className="ml-4 flex items-center gap-2 bg-[#0D1117] border border-[#1F2937] rounded px-3 py-1.5 cursor-pointer hover:bg-[#1F2937] transition-colors">
          <span className="text-sm font-medium">go_emotions-test</span>
          <ChevronDown size={14} className="text-gray-400" />
        </div>
      </div>

      <div className="flex items-center gap-6 text-sm text-gray-300">
        <a href="#" className="flex items-center gap-2 hover:text-white transition-colors">
          <MessageCircle size={16} />
          <span>Contact us</span>
        </a>
        <a href="#" className="flex items-center gap-2 hover:text-white transition-colors">
          <FileText size={16} />
          <span>Documentation</span>
        </a>

        {/* Trial info */}
        <div className="bg-[#0D1117] border border-[#1F2937] rounded px-3 py-1.5 flex items-center gap-2 text-green-500">
          <span>Trial: $1.00 - 24 days</span>
        </div>

        {/* User profile dropdown */}
        <div className="flex items-center gap-2 cursor-pointer hover:bg-[#1F2937] p-1 rounded transition-colors">
          <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center overflow-hidden">
            <User size={16} className="text-gray-300" />
          </div>
          <ChevronDown size={14} className="text-gray-400" />
        </div>
      </div>
    </header>
  );
}

import React from 'react';
import { Settings, BarChart3, Clock, Zap, UploadCloud } from 'lucide-react';

export default function InferonomicsPage() {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Breadcrumb / Header */}
      <div className="flex items-center justify-between pb-6 border-b border-[#1F2937]">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2 font-mono">
            <span>Project</span>
            <span>/</span>
            <span>Inference</span>
            <span>/</span>
            <span className="text-gray-300">Inferonomics</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Inferonomics</h1>
          <p className="text-gray-400 mt-2 max-w-2xl">
            A decision-engine for AI unit economics mapping Accuracy, Latency, and Cost against Nebius Token Factory.
          </p>
        </div>
        <button className="bg-[#6B4EFF] hover:bg-[#5a41d9] text-white px-4 py-2 rounded-md font-medium text-sm flex items-center gap-2 btn-lift shadow-lg shadow-[#6B4EFF]/20">
          <Settings size={16} />
          <span>Configure Engine</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="mt-8">
        <div className="empty-dropzone flex flex-col items-center justify-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-[#6B4EFF]/10 flex items-center justify-center">
            <UploadCloud className="text-[#6B4EFF] w-8 h-8" />
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-xl font-semibold text-white">Engine Under Construction</h2>
            <p className="text-gray-400 max-w-md mx-auto">
              Upload your benchmark data or connect an existing endpoint to visualize the Pareto frontier for your deployment.
            </p>
          </div>
          <button className="bg-[#1F2937] hover:bg-[#2d3748] border border-[#1F2937] text-white px-6 py-2.5 rounded-md font-medium text-sm mt-4 btn-lift transition-all hover:border-gray-500">
            Connect Data Source
          </button>
        </div>
      </div>

      {/* Model Comparison / Weighted Sliders Section */}
      <div className="mt-12">
        <h2 className="text-lg font-semibold text-white mb-6">Optimization Weights</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          <div className="decision-card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-[#1F2937] flex items-center justify-center">
                  <BarChart3 size={16} className="text-[#6B4EFF]" />
                </div>
                <h3 className="font-semibold text-white">Accuracy</h3>
              </div>
              <span className="text-gray-400 font-mono text-sm">75%</span>
            </div>
            <p className="text-sm text-gray-500 mb-6">Weight priority for model precision and correctness.</p>
            <div>
              <input type="range" className="custom-slider" defaultValue="75" />
            </div>
          </div>

          <div className="decision-card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-[#1F2937] flex items-center justify-center">
                  <Clock size={16} className="text-[#6B4EFF]" />
                </div>
                <h3 className="font-semibold text-white">Latency</h3>
              </div>
              <span className="text-gray-400 font-mono text-sm">40%</span>
            </div>
            <p className="text-sm text-gray-500 mb-6">Weight priority for time-to-first-token and throughput.</p>
            <div>
              <input type="range" className="custom-slider" defaultValue="40" />
            </div>
          </div>

          <div className="decision-card recommended relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
            <div className="absolute top-0 right-0 px-3 py-1 bg-[#E0FF4F] text-black text-xs font-bold rounded-bl-lg shadow-sm">
              OPTIMAL
            </div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded bg-[#E0FF4F]/10 flex items-center justify-center">
                <Zap size={16} className="text-[#E0FF4F]" />
              </div>
              <h3 className="font-semibold text-white group-hover:text-[#E0FF4F] transition-colors">Cost-Efficiency Target</h3>
            </div>
            <p className="text-sm text-gray-500 mb-6">Projected token economics based on current weights.</p>
            <div className="mt-auto flex items-center justify-between pt-2 border-t border-[#1F2937]/50">
              <span className="text-[#E0FF4F] font-mono text-lg font-semibold tracking-tight">$0.45 <span className="text-sm text-gray-500 font-sans">/ 1M tokens</span></span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 uppercase tracking-wider">Live</span>
                <span className="status-pulse"></span>
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}

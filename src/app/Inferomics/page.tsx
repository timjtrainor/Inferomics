"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Settings, BarChart3, Clock, Zap, Database, ChevronDown, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppContext } from '@/context/AppContext';
import { calculateCochran } from '@/lib/statistics';

interface Dataset {
  id: string;
  name: string;
  createdAt: string;
  url: string;
  recordCount: number;
}

interface Profile {
  id: string;
  name: string;
  description: string;
  logic: string;
  config: {
    n: number;
    weights: {
      accuracy: number;
      reliability: number;
      cost: number;
      performance: number;
    };
  };
}

const PROFILES: Profile[] = [
  {
    id: 'bulk',
    name: 'Bulk Processor',
    description: 'Systematic background tasks (parsing, tagging, masking) executed at massive scale.',
    logic: 'Prioritizes minimizing the "Friction". A 1% increase in cost or latency is more damaging than a 1% decrease in accuracy.',
    config: {
      n: 1.0,
      weights: { accuracy: 10, reliability: 10, cost: 50, performance: 30 }
    }
  },
  {
    id: 'interactive',
    name: 'Real-Time Interactive',
    description: 'Live, user-facing features (chat, autocomplete) where speed defines the product\'s success.',
    logic: 'Latency is the "Hard Constraint." The score drops significantly if response time exceeds "real-time" threshold.',
    config: {
      n: 1.2,
      weights: { accuracy: 30, reliability: 10, cost: 10, performance: 50 }
    }
  },
  {
    id: 'analytical',
    name: 'Analytical Agent',
    description: 'Human-in-the-loop tasks like summarization, research, or drafting.',
    logic: 'A balanced trade-off. We seek a "Sweet Spot" where gain in intelligence justifies the resource spend.',
    config: {
      n: 1.5,
      weights: { accuracy: 40, reliability: 20, cost: 20, performance: 20 }
    }
  },
  {
    id: 'autonomous',
    name: 'Autonomous Expert',
    description: 'Logic-heavy tasks (legal, medical, coding) where errors carry significant operational risk.',
    logic: 'Prioritizes the "Value". Uses a Quadratic Exponent (n=2) to aggressively penalize non-perfect models.',
    config: {
      n: 2.0,
      weights: { accuracy: 50, reliability: 35, cost: 7.5, performance: 7.5 }
    }
  }
];

export default function InferonomicsPage() {
  const {
    selectedDatasetId,
    setSelectedDatasetId,
    accuracy,
    setAccuracy,
    sampledData,
    setSampledData,
    selectedProfileId,
    setSelectedProfileId
  } = useAppContext();

  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [isSampling, setIsSampling] = useState(false);

  const selectedProfile = PROFILES.find(p => p.id === selectedProfileId) || PROFILES[2];

  // Derived state for the UI boxes
  const selectedDataset = datasets.find((d: Dataset) => d.id === selectedDatasetId);

  // Calculate scientific sample size for immediate feedback
  const predictedSampleSize = useMemo(() => {
    if (!selectedDataset) return 0;
    const marginOfError = accuracy === 'High' ? 0.01 : accuracy === 'Standard' ? 0.05 : 0.10;
    return calculateCochran(selectedDataset.recordCount, marginOfError);
  }, [selectedDataset, accuracy]);

  const isLocked = !!sampledData;

  useEffect(() => {
    fetch('/api/datasets')
      .then(res => res.json())
      .then(data => {
        if (data.datasets) setDatasets(data.datasets);
      })
      .catch(console.error);
  }, []);

  const handleSample = async () => {
    if (!selectedDatasetId || isLocked) return;
    setIsSampling(true);
    try {
      const res = await fetch('/api/inferomics/sample', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ datasetId: selectedDatasetId, accuracy })
      });
      const data = await res.json();
      if (data.success) {
        setSampledData({
          sampleSize: data.sampleSize,
          totalRecords: data.totalRecords,
          sample: data.sample
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSampling(false);
    }
  };

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
            <span className="text-gray-300">Inferomics</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Inferomics</h1>
          <p className="text-gray-400 mt-2 max-w-2xl text-lg">
            A decision-engine for AI unit economics mapping Accuracy, Latency, Performance, and Cost against Nebius Token Factory.
          </p>
        </div>
        <button className="bg-[#6B4EFF] hover:bg-[#5a41d9] text-white px-4 py-2 rounded-md font-medium text-sm flex items-center gap-2 btn-lift shadow-lg shadow-[#6B4EFF]/20">
          <Settings size={16} />
          <span>Configure Engine</span>
        </button>
      </div>

      {/* Implementation Objective Selector */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <Zap className="text-[#E0FF4F]" size={24} />
          Implementation Objective
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {PROFILES.map((profile) => (
            <button
              key={profile.id}
              onClick={() => setSelectedProfileId(profile.id)}
              className={cn(
                "text-left p-6 rounded-xl border transition-all duration-300 group",
                selectedProfileId === profile.id
                  ? "bg-[#6B4EFF]/10 border-[#6B4EFF] shadow-lg shadow-[#6B4EFF]/10"
                  : "bg-[#0D1117] border-[#1F2937] hover:border-gray-600"
              )}
            >
              <div className="flex justify-between items-start mb-3">
                <h3 className={cn(
                  "text-xl font-bold transition-colors",
                  selectedProfileId === profile.id ? "text-[#E0FF4F]" : "text-white group-hover:text-[#E0FF4F]"
                )}>
                  {profile.name}
                </h3>
                <span className="text-sm font-mono text-gray-500 bg-[#1F2937] px-2 py-1 rounded">n={profile.config.n.toFixed(1)}</span>
              </div>
              <p className="text-base text-gray-400 mb-6 leading-relaxed">
                {profile.description}
              </p>

              <div className="space-y-4 pt-4 border-t border-[#1F2937]">
                <div className="flex justify-between items-center text-sm uppercase tracking-wider text-gray-500 font-medium">
                  <span>Pillar Distribution</span>
                </div>
                <div className="h-2.5 w-full bg-[#1F2937] rounded-full overflow-hidden flex">
                  <div style={{ width: `${profile.config.weights.accuracy}%` }} className="h-full bg-[#6B4EFF]" title={`Accuracy: ${profile.config.weights.accuracy}%`} />
                  <div style={{ width: `${profile.config.weights.reliability}%` }} className="h-full bg-[#E0FF4F]" title={`Reliability: ${profile.config.weights.reliability}%`} />
                  <div style={{ width: `${profile.config.weights.performance}%` }} className="h-full bg-blue-500" title={`Performance: ${profile.config.weights.performance}%`} />
                  <div style={{ width: `${profile.config.weights.cost}%` }} className="h-full bg-orange-500" title={`Cost: ${profile.config.weights.cost}%`} />
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-2 mt-2">
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#6B4EFF]" /> Acc
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#E0FF4F]" /> Rel
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Perf
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <div className="w-2.5 h-2.5 rounded-full bg-orange-500" /> Cost
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
        {selectedProfile && (
          <div className="text-lg text-gray-200 bg-[#0D1117]/80 p-6 rounded-lg border border-[#6B4EFF]/20 mt-4 shadow-inner">
            <span className="text-[#E0FF4F] font-bold uppercase text-sm tracking-widest block mb-2">Logic Pattern</span>
            {selectedProfile.logic}
          </div>
        )}
      </div>

      {/* Main Content Area: Data Selection */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Source Selection Panel */}
        <div className={cn(
          "bg-[#0D1117] border border-[#1F2937] rounded-xl p-6 transition-opacity",
          isLocked && "opacity-75"
        )}>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="text-[#6B4EFF]" size={20} />
              Data Source Selection
            </div>
            {isLocked && <span className="text-[10px] bg-[#6B4EFF]/20 text-[#6B4EFF] px-2 py-0.5 rounded border border-[#6B4EFF]/30 uppercase tracking-widest font-bold">Session Locked</span>}
          </h2>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Select Dataset (.jsonl)</label>
              <div className="relative">
                <select
                  className={cn(
                    "w-full bg-[#1F2937] border border-[#374151] text-white pl-4 pr-10 py-2.5 rounded-lg appearance-none focus:outline-none focus:border-[#6B4EFF] transition-colors",
                    isLocked && "cursor-not-allowed opacity-50 bg-[#0D1117]"
                  )}
                  value={selectedDatasetId}
                  onChange={(e) => setSelectedDatasetId(e.target.value)}
                  disabled={isLocked}
                >
                  <option value="" disabled>Choose a dataset...</option>
                  {datasets.map(ds => (
                    <option key={ds.id} value={ds.id}>{ds.name} (uploaded {new Date(ds.createdAt).toLocaleDateString()})</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Margin of Error (Accuracy Tier)</label>
              <div className="grid grid-cols-3 gap-3">
                {['High', 'Standard', 'Low'].map((tier) => (
                  <button
                    key={tier}
                    onClick={() => setAccuracy(tier)}
                    disabled={isLocked}
                    className={cn(
                      "py-2 rounded-md text-sm font-medium border transition-colors",
                      accuracy === tier
                        ? 'bg-[#6B4EFF]/10 border-[#6B4EFF] text-[#6B4EFF]'
                        : 'bg-[#1F2937] border-[#374151] text-gray-400 hover:text-white hover:border-gray-500',
                      isLocked && accuracy !== tier && "opacity-30 cursor-not-allowed",
                      isLocked && accuracy === tier && "cursor-default"
                    )}
                  >
                    {tier}
                    <span className="block text-xs opacity-70 mt-0.5">
                      {tier === 'High' ? '(1%)' : tier === 'Standard' ? '(5%)' : '(10%)'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleSample}
              disabled={!selectedDatasetId || isSampling || isLocked}
              className={cn(
                "w-full px-4 py-3 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all",
                isLocked
                  ? "bg-[#1F2937] text-gray-500 border border-[#374151] cursor-default"
                  : "bg-[#E0FF4F] hover:bg-[#d4f535] text-black btn-lift shadow-lg shadow-[#E0FF4F]/10 disabled:opacity-50"
              )}
            >
              {isSampling ? 'Processing...' : isLocked ? 'Sample Locked for Session' : 'Generate Sample Data'}
            </button>
          </div>
        </div>

        {/* Sampling Results Panel */}
        <div className="bg-[#0D1117] border border-[#1F2937] rounded-xl p-6 flex flex-col justify-center relative overflow-hidden min-h-[320px]">
          {!selectedDatasetId ? (
            <div className="flex flex-col items-center justify-center text-center space-y-4 opacity-50">
              <div className="w-16 h-16 rounded-full border border-dashed border-gray-500 flex items-center justify-center">
                <BarChart3 className="text-gray-500" size={24} />
              </div>
              <div>
                <p className="text-gray-400 text-sm">No dataset selected.</p>
                <p className="text-gray-500 text-xs mt-1">Select a dataset and accuracy to see thresholds.</p>
              </div>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col items-center text-center z-10">
              <div className={cn(
                "w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors",
                sampledData ? "bg-[#E0FF4F]/10" : "bg-[#6B4EFF]/10"
              )}>
                {sampledData ? (
                  <CheckCircle2 className="text-[#E0FF4F] w-8 h-8" />
                ) : (
                  <BarChart3 className="text-[#6B4EFF] w-8 h-8" />
                )}
              </div>

              <h3 className="text-2xl font-bold text-white mb-2">Sample Size</h3>
              <p className="text-gray-400 mb-8 max-w-sm">
                Sample size is mathematically optimized to ensure a{' '}
                <span className="text-[#6B4EFF] font-semibold">
                  {accuracy === 'High' ? '1%' : accuracy === 'Standard' ? '5%' : '10%'}
                </span>{' '}
                margin of error across the entire population.
              </p>

              <div className="w-full space-y-6">
                <div className="grid grid-cols-2 gap-4 w-full">
                  <div className="bg-[#1F2937] rounded-lg p-4 border border-[#374151]">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Population</p>
                    <p className="text-2xl font-mono text-white">
                      {selectedDataset ? selectedDataset.recordCount.toLocaleString() : '...'}
                    </p>
                  </div>
                  <div className="bg-[#1F2937] rounded-lg p-4 border border-[#6B4EFF]/30 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-[#6B4EFF]/10 rounded-bl-full"></div>
                    <p className="text-xs text-[#6B4EFF] uppercase tracking-wider mb-1 font-semibold">Sample Size</p>
                    <p className="text-2xl font-mono text-white">
                      {sampledData ? sampledData.sampleSize : Math.min(predictedSampleSize, selectedDataset?.recordCount ?? 0)}
                    </p>
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

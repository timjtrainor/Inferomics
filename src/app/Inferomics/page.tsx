"use client";

import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { encode } from 'gpt-tokenizer';
import { Settings, BarChart3, Zap, Database, ChevronDown, CheckCircle2, Search, TrendingUp, DollarSign, Activity, Cloud, Play, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppContext } from '@/context/AppContext';
import { calculateCochran } from '@/lib/statistics';
import PlaygroundModal from '@/components/PlaygroundModal';

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

// Hardcoded AVAILABLE_MODELS removed - now fetched dynamically from /api/models

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

interface LeverInputProps {
  label: string;
  icon: React.ReactNode;
  value: number;
  onChange: (val: number) => void;
  unit: string;
  description: string;
  colorClass: string;
  isCurrency?: boolean;
  secondsValue?: number;
}

function LeverInput({ label, icon, value, onChange, unit, description, colorClass, isCurrency, secondsValue }: LeverInputProps) {
  const [internalValue, setInternalValue] = useState(value.toString());

  // Sync with prop when external changes occur (like objective selection)
  useEffect(() => {
    setInternalValue(value.toString());
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9.]/g, '');
    setInternalValue(val);
    const num = parseFloat(val);
    if (!isNaN(num)) {
      onChange(num);
    } else if (val === '') {
      onChange(0);
    }
  };

  const ringColor = colorClass.includes('6B4EFF') ? 'focus:border-[#6B4EFF]' :
    colorClass.includes('E0FF4F') ? 'focus:border-[#E0FF4F]' :
      'focus:border-blue-500';

  const textColor = colorClass.includes('6B4EFF') ? 'text-[#6B4EFF]' :
    colorClass.includes('E0FF4F') ? 'text-[#E0FF4F]' :
      'text-blue-400';

  const hoverBorder = colorClass.includes('6B4EFF') ? 'hover:border-[#6B4EFF]/50' :
    colorClass.includes('E0FF4F') ? 'hover:border-[#E0FF4F]/50' :
      'hover:border-blue-500/50';

  return (
    <div className={cn("lever-card p-6 rounded-xl border border-[#1F2937] bg-[#0D1117] flex flex-col gap-3 group transition-all", hoverBorder)}>
      <div className={cn("flex items-center justify-between", textColor)}>
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-semibold uppercase tracking-wider">{label}</span>
        </div>
        {secondsValue !== undefined && (
          <div className="bg-[#E0FF4F] text-[#001A2B] font-mono text-[11px] font-black px-2.5 py-1 rounded-md shadow-[0_0_15px_rgba(224,255,79,0.4)]">
            ~{secondsValue.toFixed(2)}s
          </div>
        )}
      </div>
      <div className="relative flex items-center">
        {isCurrency && <span className="absolute left-4 z-10 text-gray-400 font-mono pointer-events-none">$</span>}
        <input
          type="text"
          value={internalValue}
          onFocus={() => {
            if (value === 0) setInternalValue("");
          }}
          onBlur={() => setInternalValue(value.toString())}
          onChange={handleChange}
          className={cn(
            "w-full bg-[#1F2937] border border-[#374151] rounded-lg px-4 py-3 text-2xl font-mono text-white focus:outline-none transition-colors",
            ringColor,
            isCurrency && "pl-8"
          )}
        />
        {unit && (
          <span className="absolute right-4 text-gray-500 font-mono text-xs pointer-events-none">{unit}</span>
        )}
      </div>
      <p className="text-xs text-gray-500">{description}</p>
    </div>
  );
}


type BenchmarkMetrics = {
  accuracy: number;
  reliability: number;
  total_cost: number;
  avg_latency: number;
  tei: number;
  ies: number;
  processed_count: number;
};

type NebiusModel = {
  id: string;
  name: string;
  provider: string;
  priceIn?: number;
  priceOut?: number;
  description?: string;
  context_window?: number;
  isFast?: boolean;
  type?: string;
};

export default function InferomicsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center text-white">Loading Discovery Engine...</div>}>
      <InferomicsContent />
    </Suspense>
  );
}

function InferomicsContent() {
  const {
    selectedDatasetId,
    setSelectedDatasetId,
    accuracy,
    setAccuracy,
    sampledData,
    setSampledData,
    selectedProfileId,
    setSelectedProfileId,
    masterPrompt,
    setMasterPrompt,
    selectedModels,
    setSelectedModels,
    projectedVolume,
    setProjectedVolume,
    latencyTolerance,
    setLatencyTolerance,
    errorRiskCost,
    setErrorRiskCost,
    configStatus,
    saveStatus,
    isResetForDemo,
    persistedConfig,
    restoreField,
    activeRunId,
    setActiveRunId,
    runStatus,
    setRunStatus,
  } = useAppContext();

  const searchParams = useSearchParams();
  const router = useRouter();
  const urlRunId = searchParams.get('runId');

  // Handle URL-based direct access to a run
  useEffect(() => {
    if (urlRunId && urlRunId !== activeRunId) {
      setActiveRunId(urlRunId);
      setRunStatus('COMPLETE');
    }
  }, [urlRunId, activeRunId, setActiveRunId, setRunStatus]);

  const handleRunDiscovery = async () => {
    if (configStatus !== 'COMPLETE' || runStatus === 'COMPLETE' || runStatus === 'RUNNING' || runStatus === 'PENDING') return;

    setRunStatus('PENDING');
    try {
      // 1. Create the Run record
      const createRes = await fetch('/api/objective/run/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objectiveId: 'default',
          modelIds: selectedModels
        })
      });
      const { runId } = await createRes.json();
      setActiveRunId(runId);

      setRunStatus('RUNNING');

      // 2. Trigger the actual Engine (async)
      const runRes = await fetch('/api/inferomics/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objectiveId: 'default',
          runId,
          selectedModels,
          datasetId: selectedDatasetId,
          accuracy
        })
      });

      const result = await runRes.json();
      if (result.success) {
        setRunStatus('COMPLETE');
        router.push(`/Inferomics?runId=${runId}`);
      } else {
        setRunStatus('ERROR');
      }
    } catch (error) {
      console.error('Failed to run discovery:', error);
      setRunStatus('ERROR');
    }
  };

  const [localPrompt, setLocalPrompt] = useState(masterPrompt);
  const [tokenCount, setTokenCount] = useState(0);
  const [modelSearch, setModelSearch] = useState('');
  const [runResults, setRunResults] = useState<Record<string, BenchmarkMetrics> | null>(null);
  const [activeTuneModelId, setActiveTuneModelId] = useState<string | null>(null);
  const [isConfigExpanded, setIsConfigExpanded] = useState(true);

  // Auto-collapse configuration when run completes
  useEffect(() => {
    if (runStatus === 'COMPLETE') {
      setIsConfigExpanded(false);
    }
  }, [runStatus]);

  // Sync from context on load
  useEffect(() => {
    setLocalPrompt(masterPrompt);
  }, [masterPrompt]);

  const masterPromptRef = useRef(masterPrompt);
  useEffect(() => {
    masterPromptRef.current = masterPrompt;
  }, [masterPrompt]);

  // If a run completes, fetch the detailed metrics
  useEffect(() => {
    if (runStatus === 'COMPLETE' && activeRunId) {
      const fetchResults = async () => {
        try {
          const res = await fetch(`/api/objective/run/status?runId=${activeRunId}`);
          const data = await res.json();
          if (data.success && data.run?.metrics) {
            setRunResults(data.run.metrics);
          }
        } catch (e) {
          console.error('Failed to fetch run metrics:', e);
        }
      };
      fetchResults();
    } else if (runStatus === 'RUNNING' || runStatus === 'PENDING') {
      setRunResults(null);
    }
  }, [runStatus, activeRunId]);

  // Handle token counting and debounced save
  useEffect(() => {
    // If empty, update immediately for better UX responsiveness
    if (!localPrompt.trim()) {
      setTokenCount(0);
    }

    const timer = setTimeout(() => {
      // 1. Sync token count on rest (for non-empty)
      if (localPrompt.trim()) {
        try {
          setTokenCount(encode(localPrompt).length);
        } catch (e) {
          console.error(e);
        }
      }

      // 2. Sync master state on rest
      if (localPrompt !== masterPromptRef.current) {
        setMasterPrompt(localPrompt);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [localPrompt, setMasterPrompt]);

  // Recalculate metrics dynamically based on levers and profile weights
  const dynamicResults = useMemo(() => {
    if (!runResults) return null;

    const profile = PROFILES.find(p => p.id === selectedProfileId) || PROFILES[2]; // fallback to analytical
    const { weights } = profile.config;
    const totalWeight = weights.accuracy + weights.reliability + weights.cost + weights.performance;

    // Normalize weights
    const wa = weights.accuracy / totalWeight;
    const wr = weights.reliability / totalWeight;
    const wc = weights.cost / totalWeight;
    const wl = weights.performance / totalWeight;

    const entries = Object.entries(runResults);
    const maxLatency = Math.max(...entries.map(([, m]) => m.avg_latency)) || 1;
    const maxCost = Math.max(...entries.map(([, m]) => m.total_cost || 0.01)) || 0.01;

    const updated: Record<string, BenchmarkMetrics> = {};

    for (const [modelId, m] of entries) {
      // 1. Recalculate TEI
      // TotalCost + ((1 - Accuracy) * ProjectedVolume * ErrorRiskCost)
      const accDecimal = m.accuracy / 100;
      const dynamicTei = m.total_cost + ((1 - accDecimal) * projectedVolume * errorRiskCost);

      // 2. Recalculate IES
      const nl = m.avg_latency / maxLatency;
      const nc = (m.total_cost || 0) / maxCost;

      const reliabilityDecimal = (m.reliability ?? 100) / 100;
      const numerator = (accDecimal * wa) + (reliabilityDecimal * wr);
      const denominator = (nl * wl) + (nc * wc) + 0.01;
      const dynamicIes = numerator / denominator;

      updated[modelId] = {
        ...m,
        tei: Math.round(dynamicTei * 100) / 100,
        ies: Math.round(dynamicIes * 100) / 100
      };
    }

    return updated;
  }, [runResults, selectedProfileId, projectedVolume, errorRiskCost]);


  // Persistence is now unified in AppContext via /api/objective.
  // The redundant /api/inferomics/config logic is removed.

  const toggleModel = (modelId: string) => {
    // If we're in reset mode, interact with the pool restores all saved models first
    if (isResetForDemo) {
      restoreField('selectedModels');
      return;
    }

    if (selectedModels.includes(modelId)) {
      setSelectedModels(selectedModels.filter(id => id !== modelId));
    } else {
      if (selectedModels.length < 5) {
        setSelectedModels([...selectedModels, modelId]);
      }
    }
  };

  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [availableModels, setAvailableModels] = useState<NebiusModel[]>([]);
  const [isModelsLoading, setIsModelsLoading] = useState(true);

  const selectedProfile = PROFILES.find(p => p.id === selectedProfileId) || PROFILES[2];

  // Derived state for the UI boxes
  const selectedDataset = datasets.find((d: Dataset) => d.id === selectedDatasetId);

  // Calculate scientific sample size for immediate feedback
  const predictedSampleSize = useMemo(() => {
    if (!selectedDataset) return 0;
    const marginOfError = accuracy === 'High' ? 0.01 : accuracy === 'Standard' ? 0.05 : 0.10;
    return calculateCochran(selectedDataset.recordCount, marginOfError);
  }, [selectedDataset, accuracy]);

  const isSessionLocked = !!sampledData || runStatus === 'COMPLETE' || runStatus === 'RUNNING' || runStatus === 'PENDING';
  const isDataSelectionLocked = isSessionLocked || configStatus === 'DRAFT';

  const filteredModels = useMemo(() => {
    return availableModels.filter(m =>
      m.name.toLowerCase().includes(modelSearch.toLowerCase()) ||
      m.provider.toLowerCase().includes(modelSearch.toLowerCase())
    );
  }, [modelSearch, availableModels]);
  const [isSampling, setIsSampling] = useState(false);

  useEffect(() => {
    // 1. Fetch Datasets
    fetch('/api/datasets')
      .then(res => res.json())
      .then(data => {
        if (data.datasets) setDatasets(data.datasets);
      })
      .catch(console.error);

    // 2. Fetch Dynamic Models from Nebius
    setIsModelsLoading(true);
    fetch('/api/models')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setAvailableModels(data.models);
        }
      })
      .catch(console.error)
      .finally(() => setIsModelsLoading(false));
  }, []);

  const handleSample = async () => {
    const datasetToUse = selectedDatasetId || persistedConfig?.selected_dataset_id;
    const accuracyToUse = selectedDatasetId ? accuracy : (persistedConfig?.accuracy || accuracy);

    if (!datasetToUse) return;
    setIsSampling(true);
    try {
      const res = await fetch('/api/inferomics/sample', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ datasetId: datasetToUse, accuracy: accuracyToUse })
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
            A decision-engine for AI unit economics mapping Accuracy, Reliability, Performance, and Cost against Nebius Token Factory.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {saveStatus !== 'IDLE' && (
            <div className={cn(
              "flex items-center gap-2 text-xs font-mono transition-all duration-500",
              saveStatus === 'SAVING' ? "text-blue-400 animate-pulse" : "text-[#E0FF4F]"
            )}>
              {saveStatus === 'SAVING' ? <Activity size={12} /> : <CheckCircle2 size={12} />}
              <span>{saveStatus === 'SAVING' ? 'Auto-saving...' : 'Changes Saved'}</span>
            </div>
          )}
          <button className="bg-[#6B4EFF] hover:bg-[#5a41d9] text-white px-4 py-2 rounded-md font-medium text-sm flex items-center gap-2 btn-lift shadow-lg shadow-[#6B4EFF]/20">
            <Settings size={16} />
            <span>Configure Engine</span>
          </button>
        </div>
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

      {/* Economic Levers Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <TrendingUp className="text-[#E0FF4F]" size={24} />
          Economic Levers
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <LeverInput
            label="Projected Monthly Volume"
            icon={<Activity size={18} />}
            value={projectedVolume}
            onChange={setProjectedVolume}
            unit="REQS"
            description="Scale factor determining absolute infrastructure spend & amortized costs."
            colorClass="[#6B4EFF]"
          />

          <LeverInput
            label="Latency Tolerance"
            icon={<Cloud size={18} />}
            value={latencyTolerance}
            onChange={setLatencyTolerance}
            unit="ms"
            description="The &quot;Hard Constraint&quot; for performance-weighted profile scoring logic."
            colorClass="blue-500"
            secondsValue={latencyTolerance / 1000}
          />

          <LeverInput
            label="Error Risk Cost (Per instance)"
            icon={<DollarSign size={18} />}
            value={errorRiskCost}
            onChange={setErrorRiskCost}
            unit=""
            isCurrency
            description="Calculative penalty for reliability failures (Impact on Economic Winner)."
            colorClass="[#E0FF4F]"
          />
        </div>
      </div>

      {/* TEI Formula Display */}
      {/* <div className="bg-[#0D1117] border border-[#1F2937] rounded-lg p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-[#6B4EFF]/10 p-2 rounded text-[#6B4EFF]">
            <TrendingUp size={16} />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Economic Scoring Logic</p>
            <div className="font-mono text-sm text-[#E0FF4F] mt-1">
              TEI = (Avg Token Cost × Volume) + ((1 - Reliability%) × Volume × Error Risk Cost)
            </div>
          </div>
        </div>
        <div className="text-[10px] text-gray-500 font-mono uppercase tracking-tighter text-right">
          Nebius<br />Unit Economics Framework
        </div>
      </div> */}

      {/* Configuration & Data Accordion */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Settings className="text-[#6B4EFF]" size={24} />
            Configuration Logic
            {runStatus === 'COMPLETE' && <span className="text-[10px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded font-mono uppercase ml-2 tracking-widest border border-gray-700">Locked Reference</span>}
          </h2>
          {runStatus === 'COMPLETE' && (
            <button
              onClick={() => setIsConfigExpanded(!isConfigExpanded)}
              className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-md bg-[#1F2937] hover:bg-[#374151] border border-[#374151] hover:border-gray-500 text-gray-300 transition-all shadow-sm"
            >
              {isConfigExpanded ? 'Collapse' : 'Expand'}
              <ChevronDown className={cn("transition-transform text-gray-400", isConfigExpanded ? "rotate-180" : "")} size={14} />
            </button>
          )}
        </div>

        <div className={cn(
          "transition-all duration-500 overflow-hidden",
          !isConfigExpanded ? "max-h-0 opacity-0 space-y-0" : "max-h-[5000px] opacity-100 space-y-8"
        )}>
          {/* Configuration Step Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Master Prompt */}
            <div className="bg-[#0D1117] border border-[#1F2937] rounded-xl p-6 flex flex-col h-[480px]">
              <h3 className="text-lg font-semibold text-white mb-2 flex items-center justify-between">
                Master System Prompt
                <span className={cn(
                  "text-xs px-2 py-1 rounded font-mono",
                  localPrompt.trim().length > 0 ? "bg-[#6B4EFF]/20 text-[#6B4EFF]" : "bg-[#1F2937] text-gray-400"
                )}>
                  ~{tokenCount} Tokens
                </span>
              </h3>
              <p className="text-sm text-gray-400 mb-4">
                Enter the system instructions that will be applied across all candidate models. State saves automatically.
              </p>
              <textarea
                className={cn(
                  "w-full bg-[#1F2937] border border-[#374151] rounded-lg p-4 text-white placeholder-gray-500 focus:outline-none focus:border-[#6B4EFF] resize-y min-h-[160px] flex-grow transition-colors",
                  isSessionLocked && "opacity-50 cursor-not-allowed"
                )}
                placeholder="Enter the system instructions that will be applied across all candidate models..."
                onFocus={() => {
                  if (isResetForDemo) {
                    restoreField('masterPrompt');
                  }
                }}
                value={localPrompt}
                onChange={(e) => setLocalPrompt(e.target.value)}
                disabled={isSessionLocked}
              />
            </div>

            {/* Model Selection Basket */}
            <div className="bg-[#0D1117] border border-[#1F2937] rounded-xl p-6 flex flex-col h-[480px]">
              <h3 className="text-lg font-semibold text-white mb-2 flex items-center justify-between">
                Model Candidate Pool
                <span className={cn(
                  "text-xs px-2 py-1 rounded font-semibold",
                  selectedModels.length >= 2 && selectedModels.length <= 5
                    ? "bg-[#E0FF4F]/20 text-[#E0FF4F]"
                    : "bg-orange-500/20 text-orange-400"
                )}>
                  {selectedModels.length} / 5 Selected (Min 2)
                </span>
              </h3>
              <p className="text-sm text-gray-400 mb-4">
                Select between 2 to 5 foundational models to test your objective logic.
              </p>

              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Search models or providers..."
                  className="w-full bg-[#1F2937] border border-[#374151] pl-10 pr-4 py-2 rounded-lg text-sm text-white focus:outline-none focus:border-[#6B4EFF]"
                  onFocus={() => {
                    if (isResetForDemo) {
                      restoreField('selectedModels');
                    }
                  }}
                  value={modelSearch}
                  onChange={(e) => setModelSearch(e.target.value)}
                  disabled={isSessionLocked}
                />
              </div>

              <div className="flex-grow overflow-y-auto space-y-2 pr-2 custom-scrollbar border-t border-[#1F2937] pt-2 max-h-[400px]">
                {isModelsLoading ? (
                  // Loading Skeleton
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="w-full h-20 bg-[#1F2937] border border-[#374151] rounded-lg animate-pulse" />
                  ))
                ) : (
                  filteredModels.map(model => {
                    const isSelected = selectedModels.includes(model.id);
                    const isDisabled = isSessionLocked || (!isSelected && selectedModels.length >= 5);

                    return (
                      <button
                        key={model.id}
                        onClick={() => toggleModel(model.id)}
                        disabled={isDisabled}
                        className={cn(
                          "w-full flex items-center justify-between p-3 rounded-lg border text-left transition-all relative overflow-hidden",
                          isSelected
                            ? "bg-[#6B4EFF]/10 border-[#6B4EFF] shadow-sm shadow-[#6B4EFF]/10"
                            : "bg-[#1F2937] border-[#374151] hover:border-gray-600",
                          isDisabled && !isSelected && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <div className="flex-grow">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-white">{model.name}</span>
                            {model.isFast ? (
                              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-[#6B4EFF]/20 text-[#6B4EFF] border border-[#6B4EFF]/30">Fast</span>
                            ) : (
                              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-gray-500/10 text-gray-400 border border-gray-500/20">Base</span>
                            )}
                          </div>
                          <div className="text-[11px] text-gray-500 mt-0.5 font-medium">
                            {model.provider} &middot; {model.type}
                          </div>
                          <div className="flex gap-3 mt-2 font-mono text-[10px]">
                            <div className="flex items-center gap-1.5">
                              <span className="text-gray-500">In:</span>
                              <span className="text-[#E0FF4F]">${(model.priceIn || 0).toFixed(2)}/1M</span>
                            </div>
                            {model.priceOut !== undefined && model.priceOut > 0 && (
                              <div className="flex items-center gap-1.5">
                                <span className="text-gray-500">Out:</span>
                                <span className="text-[#6B4EFF]">${(model.priceOut || 0).toFixed(2)}/1M</span>
                              </div>
                            )}
                            {model.context_window !== undefined && model.context_window > 0 && (
                              <div className="flex items-center gap-1.5">
                                <span className="text-gray-500">Ctx:</span>
                                <span className="text-gray-300">{Math.round((model.context_window || 0) / 1024)}k</span>
                              </div>
                            )}
                          </div>
                        </div>
                        {isSelected && <CheckCircle2 className="text-[#E0FF4F]" size={18} />}
                      </button>
                    );
                  })
                )}
                {!isModelsLoading && filteredModels.length === 0 && (
                  <div className="text-center text-sm text-gray-500 py-4">No models found matching &quot;{modelSearch}&quot;</div>
                )}
              </div>
            </div>
          </div>

          {/* Main Content Area: Data Selection */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* Source Selection Panel */}
            <div className={cn(
              "bg-[#0D1117] border border-[#1F2937] rounded-xl p-6 transition-opacity relative",
              isDataSelectionLocked && "opacity-60 pointer-events-none cursor-not-allowed"
            )}>
              {/* Overlay for Draft Config Status */}
              {configStatus === 'DRAFT' && !isSessionLocked && (
                <div className="absolute inset-0 z-10 bg-[#0D1117]/60 backdrop-blur-[2px] rounded-xl flex items-center justify-center pointer-events-auto">
                  <div className="bg-[#1F2937] border border-[#374151] px-6 py-4 rounded-lg text-center shadow-xl max-w-[280px]">
                    <Settings className="text-[#6B4EFF] mx-auto mb-2" size={24} />
                    <p className="text-white font-medium text-sm">Configuration Incomplete</p>
                    <p className="text-xs text-gray-400 mt-1">Provide a Master System Prompt and select 2-5 model candidates to unlock.</p>
                  </div>
                </div>
              )}

              <h2 className="text-lg font-semibold text-white mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="text-[#6B4EFF]" size={20} />
                  Data Source Selection
                </div>
                {isSessionLocked && <span className="text-[10px] bg-[#6B4EFF]/20 text-[#6B4EFF] px-2 py-0.5 rounded border border-[#6B4EFF]/30 uppercase tracking-widest font-bold">Session Locked</span>}
              </h2>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Select Dataset (.jsonl)</label>
                  <div className="relative">
                    <select
                      className={cn(
                        "w-full bg-[#1F2937] border border-[#374151] text-white pl-4 pr-10 py-2.5 rounded-lg appearance-none focus:outline-none focus:border-[#6B4EFF] transition-colors",
                        isDataSelectionLocked && "bg-[#0D1117]"
                      )}
                      value={selectedDatasetId}
                      onChange={(e) => setSelectedDatasetId(e.target.value)}
                      disabled={isDataSelectionLocked}
                    >
                      <option value="" disabled>Choose a dataset...</option>
                      {datasets.map(ds => (
                        <option key={ds.id} value={ds.id}>{ds.name} (uploaded {new Date(ds.createdAt).toLocaleDateString()})</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                  </div>
                  {selectedDataset && (
                    <div className="flex items-center gap-2 text-[10px] font-bold text-[#E0FF4F] uppercase tracking-widest bg-[#E0FF4F]/10 px-2 py-1 rounded border border-[#E0FF4F]/20 animate-in zoom-in duration-300">
                      <CheckCircle2 size={12} />
                      <span>GoEmotions Dataset Linked</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Margin of Error (Accuracy Tier)</label>
                  <div className="grid grid-cols-3 gap-3">
                    {['High', 'Standard', 'Low'].map((tier) => (
                      <button
                        key={tier}
                        onClick={() => setAccuracy(tier)}
                        disabled={isDataSelectionLocked}
                        className={cn(
                          "py-2 rounded-md text-sm font-medium border transition-colors",
                          accuracy === tier
                            ? 'bg-[#6B4EFF]/10 border-[#6B4EFF] text-[#6B4EFF]'
                            : 'bg-[#1F2937] border-[#374151] text-gray-400 hover:text-white hover:border-gray-500',
                          isDataSelectionLocked && accuracy !== tier && "opacity-30",
                          isDataSelectionLocked && accuracy === tier && "cursor-default"
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
                  disabled={!selectedDatasetId || isSampling || isDataSelectionLocked}
                  className={cn(
                    "w-full px-4 py-3 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all",
                    isSessionLocked
                      ? "bg-[#1F2937] text-gray-500 border border-[#374151] cursor-default"
                      : "bg-[#E0FF4F] hover:bg-[#d4f535] text-black btn-lift shadow-lg shadow-[#E0FF4F]/10 disabled:opacity-50"
                  )}
                >
                  {isSampling ? 'Processing...' : isSessionLocked ? 'Sample Locked for Session' : 'Generate Sample Data'}
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

                    {sampledData && (
                      <div className="pt-4 animate-in fade-in zoom-in duration-700">
                        <button
                          onClick={handleRunDiscovery}
                          disabled={configStatus !== 'COMPLETE' || runStatus === 'PENDING' || runStatus === 'RUNNING'}
                          className={cn(
                            "w-full py-4 rounded-xl font-bold flex items-center justify-center gap-3 transition-all duration-300 shadow-2xl overflow-hidden relative group",
                            configStatus !== 'COMPLETE'
                              ? "bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700"
                              : runStatus === 'PENDING' || runStatus === 'RUNNING'
                                ? "bg-[#6B4EFF]/20 text-[#6B4EFF] border border-[#6B4EFF]/30 cursor-wait"
                                : runStatus === 'COMPLETE'
                                  ? "bg-green-500/10 text-green-400 border border-green-500/50"
                                  : "bg-[#E0FF4F] text-[#0D1117] hover:bg-[#d0f040] hover:scale-[1.02] active:scale-[0.98] shadow-[#E0FF4F]/20"
                          )}
                        >
                          {runStatus === 'PENDING' || runStatus === 'RUNNING' ? (
                            <>
                              <Loader2 className="animate-spin" size={20} />
                              <span className="uppercase tracking-widest text-sm">Engine Executing...</span>
                              <div className="absolute bottom-0 left-0 h-1 bg-[#6B4EFF] animate-[shimmer_2s_infinite]"></div>
                            </>
                          ) : runStatus === 'COMPLETE' ? (
                            <>
                              <CheckCircle2 size={20} />
                              <span className="uppercase tracking-widest text-sm">Baseline Established</span>
                            </>
                          ) : (
                            <>
                              <Play size={20} className="fill-current" />
                              <span className="uppercase tracking-widest text-sm">Run Discovery Engine</span>
                            </>
                          )}
                        </button>

                        {configStatus !== 'COMPLETE' && (
                          <p className="text-[10px] text-gray-500 uppercase tracking-tighter mt-2 font-mono">
                            Configure 2-5 models and Master Prompt to unlock Engine
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Discovery Results Dashboard */}
      {dynamicResults && (
        <div className="mt-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="bg-[#0D1117] border border-[#6B4EFF]/30 rounded-2xl overflow-hidden shadow-2xl shadow-[#6B4EFF]/10">
            <div className="bg-[#6B4EFF]/10 px-8 py-5 border-b border-[#6B4EFF]/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-[#6B4EFF] p-2 rounded-lg">
                  <BarChart3 className="text-white" size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">Discovery Engine Results</h2>
                  <p className="text-xs text-[#6B4EFF] uppercase tracking-widest font-bold">Inference Batch {activeRunId}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest">Run Status</p>
                  <div className="flex items-center gap-2 justify-end">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-sm font-mono text-green-400 font-bold">LIVE DATA PERSISTED</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Global Metrics Summary */}
                <div className="bg-[#1F2937]/30 rounded-xl p-5 border border-[#374151]/50">
                  <div className="flex items-center gap-3 mb-3">
                    <TrendingUp className="text-[#E0FF4F]" size={18} />
                    <span className="text-sm text-gray-400 font-medium">Top Accuracy</span>
                  </div>
                  <div className="text-3xl font-mono text-white">
                    {(() => {
                      const values = Object.values(dynamicResults);
                      return values.length > 0 ? `${Math.max(...values.map(m => m.accuracy)).toFixed(2)}%` : '0.00%';
                    })()}
                  </div>
                </div>
                <div className="bg-[#1F2937]/30 rounded-xl p-5 border border-[#374151]/50">
                  <div className="flex items-center gap-3 mb-3">
                    <DollarSign className="text-green-400" size={18} />
                    <span className="text-sm text-gray-400 font-medium">Best TEI (Impact)</span>
                  </div>
                  <div className="text-3xl font-mono text-white">
                    {(() => {
                      const teis = Object.values(dynamicResults).map(m => m.tei).filter(t => t !== undefined && !isNaN(t));
                      return teis.length > 0 ? `$${Math.min(...teis).toLocaleString()}` : 'N/A';
                    })()}
                  </div>
                </div>
                <div className="bg-[#1F2937]/30 rounded-xl p-5 border border-[#374151]/50">
                  <div className="flex items-center gap-3 mb-3">
                    <Activity className="text-[#6B4EFF]" size={18} />
                    <span className="text-sm text-gray-400 font-medium">Top Efficiency (IES)</span>
                  </div>
                  <div className="text-3xl font-mono text-white">
                    {(() => {
                      const ies = Object.values(dynamicResults).map(m => m.ies).filter(i => i !== undefined && !isNaN(i));
                      return ies.length > 0 ? Math.max(...ies).toFixed(2) : 'N/A';
                    })()}
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-[#1F2937] text-gray-500 text-[10px] uppercase tracking-[0.2em] font-bold">
                      <th className="pb-4 pl-4">Model Candidate</th>
                      <th className="pb-4">Accuracy</th>
                      <th className="pb-4">Reliability</th>
                      <th className="pb-4">Latency</th>
                      <th className="pb-4">TEI</th>
                      <th className="pb-4">IES Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1F2937]">
                    {Object.entries(dynamicResults).map(([modelId, metrics]: [string, BenchmarkMetrics]) => {
                      const modelData = availableModels.find(m => m.id === modelId);
                      const isHighAccuracy = metrics.accuracy > 70;

                      return (
                        <tr key={modelId} className="group hover:bg-[#1F2937]/20 transition-colors">
                          <td className="py-5 pl-4">
                            <div className="flex flex-col">
                              <span className="text-white font-bold tracking-tight">{modelData?.name || modelId}</span>
                              <span className="text-[10px] text-gray-500 font-mono">{modelId}</span>
                            </div>
                          </td>
                          <td className="py-5">
                            <div className="flex items-center gap-3">
                              <span className={cn("text-lg font-mono font-bold", isHighAccuracy ? "text-[#E0FF4F]" : "text-orange-500")}>
                                {metrics.accuracy.toFixed(2)}%
                              </span>
                            </div>
                          </td>
                          <td className="py-5">
                            <span className="text-sm text-gray-400 font-mono">
                              {metrics.reliability !== undefined ? `${metrics.reliability.toFixed(2)}%` : 'N/A'}
                            </span>
                          </td>
                          <td className="py-5">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-white font-mono">{metrics.avg_latency}ms</span>
                              {metrics.avg_latency < latencyTolerance ? (
                                <Zap size={12} className="text-[#E0FF4F] fill-[#E0FF4F]" />
                              ) : (
                                <Activity size={12} className="text-orange-400" />
                              )}
                            </div>
                          </td>
                          <td className="py-5">
                            <div className="flex flex-col">
                              <span className="text-white font-mono font-bold">
                                {metrics.tei !== undefined ? `$${metrics.tei.toLocaleString()}` : 'N/A'}
                              </span>
                              <span className="text-[8px] text-gray-500 uppercase tracking-widest">Economic Impact</span>
                            </div>
                          </td>
                          <td className="py-5">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-lg font-bold text-[#6B4EFF] font-mono">
                                  {metrics.ies ?? 'N/A'}
                                </span>
                                {metrics.ies !== undefined && metrics.ies === Math.max(...Object.values(dynamicResults).map(m => m.ies || 0)) && (
                                  <span className="text-[8px] bg-[#6B4EFF]/20 text-[#6B4EFF] px-1.5 py-0.5 rounded border border-[#6B4EFF]/30 font-bold uppercase">Best</span>
                                )}
                              </div>
                              <button
                                onClick={() => setActiveTuneModelId(modelId)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#1F2937] hover:bg-[#374151] border border-[#374151] hover:border-[#BFAF6B] text-xs font-semibold text-gray-300 hover:text-white transition-all shadow-sm group"
                              >
                                <Settings size={12} className="text-[#6B4EFF] group-hover:rotate-90 transition-transform duration-300" /> Tune
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mt-8 pt-6 border-t border-[#1F2937] flex items-center justify-between">
                <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">
                  Result generated using scientific sample of {sampledData?.sampleSize || 0} records
                </p>
                <div className="flex gap-4">
                  <button className="text-[10px] text-[#6B4EFF] font-bold uppercase tracking-widest hover:text-white transition-colors">Export RAW JSON</button>
                  <button className="text-[10px] text-[#6B4EFF] font-bold uppercase tracking-widest hover:text-white transition-colors">Compare History</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Playground Modal */}
      {activeTuneModelId && (
        <PlaygroundModal
          initialModelId={activeTuneModelId}
          isModal={true}
          onClose={() => setActiveTuneModelId(null)}
        />
      )}

    </div >
  );
}

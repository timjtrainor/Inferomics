"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { encode } from 'gpt-tokenizer';
import { Settings, BarChart3, Zap, Database, ChevronDown, CheckCircle2, Search, TrendingUp, DollarSign, Activity, Cloud } from 'lucide-react';
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

const AVAILABLE_MODELS = [
  { id: 'bge-icl', name: 'BGE-ICL', provider: 'BAAI', type: 'Embedding', priceIn: 0.01, priceOut: 0, isFast: false, throughput: 4096 },
  { id: 'bge-multilingual', name: 'bge-multilingual-gemma2', provider: 'BAAI', type: 'Embedding', priceIn: 0.01, priceOut: 0, isFast: false, throughput: 0 },
  { id: 'deepseek-r1-base', name: 'DeepSeek-R1-0528', provider: 'DeepSeek', type: 'Text-to-text', priceIn: 0.80, priceOut: 2.40, isFast: false, throughput: 20 },
  { id: 'deepseek-r1-fast', name: 'DeepSeek-R1-0528', provider: 'DeepSeek', type: 'Text-to-text', priceIn: 2.00, priceOut: 6.00, isFast: true, throughput: 120 },
  { id: 'deepseek-v3-base', name: 'DeepSeek-V3-0324', provider: 'DeepSeek', type: 'Text-to-text', priceIn: 0.50, priceOut: 1.50, isFast: false, throughput: 25 },
  { id: 'deepseek-v3-fast', name: 'DeepSeek-V3-0324', provider: 'DeepSeek', type: 'Text-to-text', priceIn: 0.75, priceOut: 2.25, isFast: true, throughput: 120 },
  { id: 'deepseek-v3.2', name: 'DeepSeek-V3.2', provider: 'DeepSeek', type: 'Text-to-text', priceIn: 0.30, priceOut: 0.45, isFast: false, throughput: 20 },
  { id: 'e5-mistral', name: 'e5-mistral-7b-instruct', provider: 'intfloat', type: 'Embedding', priceIn: 0.01, priceOut: 0, isFast: false, throughput: 4096 },
  { id: 'flux-dev', name: 'FLUX.1-dev', provider: 'Black Forest Labs', type: 'Text-to-image', priceIn: 0.007, priceOut: 0.02, isFast: false, throughput: 0 },
  { id: 'flux-schnell', name: 'FLUX.1-schnell', provider: 'Black Forest Labs', type: 'Text-to-image', priceIn: 0.001, priceOut: 0.01, isFast: false, throughput: 0 },
  { id: 'gemma-2-2b', name: 'Gemma-2-2b-it', provider: 'Google', type: 'Text-to-text', priceIn: 0.02, priceOut: 0.06, isFast: false, throughput: 80 },
  { id: 'gemma-2-9b', name: 'Gemma-2-9b-it', provider: 'Google', type: 'Text-to-text', priceIn: 0.03, priceOut: 0.09, isFast: true, throughput: 90 },
  { id: 'gemma-3-base', name: 'Gemma-3-27b-it', provider: 'Google', type: 'Vision', priceIn: 0.10, priceOut: 0.30, isFast: false, throughput: 20 },
  { id: 'gemma-3-fast', name: 'Gemma-3-27b-it', provider: 'Google', type: 'Vision', priceIn: 0.20, priceOut: 0.60, isFast: true, throughput: 55 },
  { id: 'glm-4.5', name: 'GLM-4.5', provider: 'Z.ai', type: 'Text-to-text', priceIn: 0.60, priceOut: 2.20, isFast: false, throughput: 30 },
  { id: 'glm-4.5-air', name: 'GLM-4.5-Air', provider: 'Z.ai', type: 'Text-to-text', priceIn: 0.20, priceOut: 1.20, isFast: false, throughput: 25 },
  { id: 'glm-4.7', name: 'GLM-4.7', provider: 'Z.ai', type: 'Text-to-text', priceIn: 0.40, priceOut: 2.00, isFast: false, throughput: 30 },
  { id: 'gpt-oss-120b', name: 'gpt-oss-120b', provider: 'OpenAI', type: 'Text-to-text', priceIn: 0.15, priceOut: 0.60, isFast: false, throughput: 40 },
  { id: 'gpt-oss-20b', name: 'gpt-oss-20b', provider: 'OpenAI', type: 'Text-to-text', priceIn: 0.05, priceOut: 0.20, isFast: false, throughput: 64 },
  { id: 'hermes-4-405b', name: 'Hermes-4-405B', provider: 'NousResearch', type: 'Text-to-text', priceIn: 1.00, priceOut: 3.00, isFast: false, throughput: 20 },
  { id: 'hermes-4-70b', name: 'Hermes-4-70B', provider: 'NousResearch', type: 'Text-to-text', priceIn: 0.13, priceOut: 0.40, isFast: false, throughput: 20 },
  { id: 'intellect-3', name: 'INTELLECT-3', provider: 'Prime Intellect', type: 'Text-to-text', priceIn: 0.20, priceOut: 1.10, isFast: false, throughput: 35 },
  { id: 'kimi-k2-instruct', name: 'Kimi-K2-Instruct', provider: 'Moonshot AI', type: 'Text-to-text', priceIn: 0.50, priceOut: 2.40, isFast: false, throughput: 40 },
  { id: 'kimi-k2-thinking', name: 'Kimi-K2-Thinking', provider: 'Moonshot AI', type: 'Text-to-text', priceIn: 0.60, priceOut: 2.50, isFast: false, throughput: 45.7 },
  { id: 'kimi-k2.5', name: 'Kimi-K2.5', provider: 'Moonshot AI', type: 'Text-to-text', priceIn: 0.50, priceOut: 2.50, isFast: false, throughput: 60 },
  { id: 'llama-3-1-nemotron', name: 'Llama-3_1-Nemotron-Ultra-253B-v1', provider: 'NVIDIA', type: 'Text-to-text', priceIn: 0.60, priceOut: 1.80, isFast: false, throughput: 25 },
  { id: 'llama-3-3-base', name: 'Llama-3.3-70B-Instruct', provider: 'Meta', type: 'Text-to-text', priceIn: 0.13, priceOut: 0.40, isFast: false, throughput: 25 },
  { id: 'llama-3-3-fast', name: 'Llama-3.3-70B-Instruct', provider: 'Meta', type: 'Text-to-text', priceIn: 0.25, priceOut: 0.75, isFast: true, throughput: 120 },
  { id: 'meta-llama-8b-base', name: 'Meta-Llama-3.1-8B-Instruct', provider: 'Meta', type: 'Text-to-text', priceIn: 0.02, priceOut: 0.06, isFast: false, throughput: 30 },
  { id: 'meta-llama-8b-fast', name: 'Meta-Llama-3.1-8B-Instruct', provider: 'Meta', type: 'Text-to-text', priceIn: 0.03, priceOut: 0.09, isFast: true, throughput: 155 },
  { id: 'llama-guard-3', name: 'Meta-Llama-Guard-3-8B', provider: 'Meta', type: 'Safety guardrail', priceIn: 0.02, priceOut: 0.06, isFast: false, throughput: 118 },
  { id: 'minimax-m2.1', name: 'MiniMax-M2.1', provider: 'Minimax', type: 'Text-to-text', priceIn: 0.30, priceOut: 1.20, isFast: false, throughput: 36.8 },
  { id: 'nemotron-3-nano', name: 'Nemotron-3-Nano-30B-A3B', provider: 'NVIDIA', type: 'Text-to-text', priceIn: 0.06, priceOut: 0.24, isFast: false, throughput: 60 },
  { id: 'nemotron-nano', name: 'Nemotron-Nano-V2-12b', provider: 'NVIDIA', type: 'Vision', priceIn: 0.07, priceOut: 0.20, isFast: false, throughput: 70 },
  { id: 'qwen-coder-7b-fast', name: 'Qwen2.5-Coder-7B', provider: 'Qwen', type: 'Text-to-text', priceIn: 0.03, priceOut: 0.09, isFast: true, throughput: 125 },
  { id: 'qwen-vl-72b', name: 'Qwen2.5-VL-72B-Instruct', provider: 'Qwen', type: 'Vision', priceIn: 0.25, priceOut: 0.75, isFast: false, throughput: 20 },
  { id: 'qwen3-235b-instruct', name: 'Qwen3-235B-A22B-Instruct-2507', provider: 'Qwen', type: 'Text-to-text', priceIn: 0.20, priceOut: 0.60, isFast: false, throughput: 27 },
  { id: 'qwen3-235b-thinking', name: 'Qwen3-235B-A22B-Thinking-2507', provider: 'Qwen', type: 'Text-to-text', priceIn: 0.20, priceOut: 0.80, isFast: false, throughput: 27 },
  { id: 'qwen3-30b-instruct', name: 'Qwen3-30B-A3B-Instruct-2507', provider: 'Qwen', type: 'Text-to-text', priceIn: 0.10, priceOut: 0.30, isFast: false, throughput: 70 },
  { id: 'qwen3-30b-thinking', name: 'Qwen3-30B-A3B-Thinking-2507', provider: 'Qwen', type: 'Text-to-text', priceIn: 0.10, priceOut: 0.30, isFast: false, throughput: 56 },
  { id: 'qwen3-32b-base', name: 'Qwen3-32B', provider: 'Qwen', type: 'Text-to-text', priceIn: 0.10, priceOut: 0.30, isFast: false, throughput: 23 },
  { id: 'qwen3-32b-fast', name: 'Qwen3-32B', provider: 'Qwen', type: 'Text-to-text', priceIn: 0.20, priceOut: 0.60, isFast: true, throughput: 110 },
  { id: 'qwen3-coder-30b', name: 'Qwen3-Coder-30B-A3B-Instruct', provider: 'Qwen', type: 'Text-to-text', priceIn: 0.10, priceOut: 0.30, isFast: false, throughput: 60 },
  { id: 'qwen3-coder-480b', name: 'Qwen3-Coder-480B-A35B-Instruct', provider: 'Qwen', type: 'Text-to-text', priceIn: 0.40, priceOut: 1.80, isFast: false, throughput: 35 },
  { id: 'qwen-embedding', name: 'Qwen3-Embedding-8B', provider: 'Qwen', type: 'Embedding', priceIn: 0.01, priceOut: 0, isFast: false, throughput: 4096 },
  { id: 'qwen3-next-80b', name: 'Qwen3-Next-80B-A3B-Thinking', provider: 'Qwen', type: 'Text-to-text', priceIn: 0.15, priceOut: 1.20, isFast: false, throughput: 85 },
];

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

export default function InferomicsPage() {
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
    restoreField
  } = useAppContext();

  const [localPrompt, setLocalPrompt] = useState(masterPrompt);
  const [tokenCount, setTokenCount] = useState(0);
  const [modelSearch, setModelSearch] = useState('');

  // Sync from context on load
  useEffect(() => {
    setLocalPrompt(masterPrompt);
  }, [masterPrompt]);

  const masterPromptRef = useRef(masterPrompt);
  useEffect(() => {
    masterPromptRef.current = masterPrompt;
  }, [masterPrompt]);

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

  const filteredModels = useMemo(() => {
    return AVAILABLE_MODELS.filter(m =>
      (m.type === 'Text-to-text' || m.type === 'Vision') &&
      (m.name.toLowerCase().includes(modelSearch.toLowerCase()) ||
        m.provider.toLowerCase().includes(modelSearch.toLowerCase()))
    );
  }, [modelSearch]);

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

  const isSessionLocked = !!sampledData;
  const isDataSelectionLocked = isSessionLocked || configStatus === 'DRAFT';

  useEffect(() => {
    fetch('/api/datasets')
      .then(res => res.json())
      .then(data => {
        if (data.datasets) setDatasets(data.datasets);
      })
      .catch(console.error);
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

      {/* Configuration Step */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <Settings className="text-[#6B4EFF]" size={24} />
          Configuration Logic
        </h2>

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
              {filteredModels.map(model => {
                const isSelected = selectedModels.includes(model.id);
                const isDisabled = isSessionLocked || (!isSelected && selectedModels.length >= 5);

                return (
                  <button
                    key={model.id}
                    onClick={() => toggleModel(model.id)}
                    disabled={isDisabled}
                    aria-pressed={isSelected}
                    aria-label={`${model.name} by ${model.provider} — ${model.isFast ? 'Fast' : 'Base'} tier`}
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
                          <span className="text-[#E0FF4F]">${model.priceIn.toFixed(2)}/1M</span>
                        </div>
                        {model.priceOut > 0 && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-gray-500">Out:</span>
                            <span className="text-[#6B4EFF]">${model.priceOut.toFixed(2)}/1M</span>
                          </div>
                        )}
                        {model.throughput > 0 && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-gray-500">Speed:</span>
                            <span className="text-gray-300">{model.throughput} Tok/s</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {isSelected && <CheckCircle2 className="text-[#E0FF4F]" size={18} />}
                  </button>
                );
              })}
              {filteredModels.length === 0 && (
                <div className="text-center text-sm text-gray-500 py-4">No models found matching &quot;{modelSearch}&quot;</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area: Data Selection */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">

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

              </div>
            </div>
          )}
        </div>
      </div>

    </div >
  );
}

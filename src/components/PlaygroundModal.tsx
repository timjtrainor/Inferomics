"use client";

import React, { useState, useEffect } from 'react';
import { Play, Save, FolderOpen, Code, Plus, Trash2, Loader2, Sparkles, Globe, FileText, HelpCircle, Copy, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppContext } from '@/context/AppContext';

interface PresetParameters {
    temperature?: number;
    max_tokens?: number;
    presence_penalty?: number;
    top_p?: number;
    top_k?: number;
}

interface FewShotExample {
    input: string;
    output: string;
}

interface CurrentPreset {
    id?: string;
    preset_name?: string;
    model_id: string;
    master_prompt: string;
    few_shot_examples: FewShotExample[];
    parameters: PresetParameters;
}

interface Capabilities {
    supportsTemperature: boolean;
    supportsMaxTokens: boolean;
    supportsTopP: boolean;
    supportsTopK: boolean;
    supportsPresencePenalty: boolean;
    maxContextWindow: number;
}

interface PlaygroundModalProps {
    initialModelId: string;
    onClose?: () => void;
    isModal?: boolean;
}

export default function PlaygroundModal({ initialModelId, onClose, isModal = false }: PlaygroundModalProps) {
    const { masterPrompt, setMasterPrompt } = useAppContext();

    const [currentPreset, setCurrentPreset] = useState<CurrentPreset>({
        model_id: initialModelId,
        master_prompt: masterPrompt || '',
        few_shot_examples: [],
        parameters: {
            temperature: 0.3,
            max_tokens: 512,
            top_p: 0.95,
            presence_penalty: 0,
            top_k: -1
        }
    });

    const [capabilities, setCapabilities] = useState<Capabilities | null>(null);
    const [isLoadingCaps, setIsLoadingCaps] = useState(true);
    const [isInitializing, setIsInitializing] = useState(true);

    // Modal states
    const [showViewCode, setShowViewCode] = useState(false);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [showOpenModal, setShowOpenModal] = useState(false);

    // Data states
    const [presetNameInput, setPresetNameInput] = useState('');
    const [savedPresets, setSavedPresets] = useState<CurrentPreset[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isRunning, setIsRunning] = useState(false);

    useEffect(() => {
        const initializePlayground = async () => {
            setIsInitializing(true);
            try {
                // 1. Fetch Capabilities
                const capsRes = await fetch(`/api/model/${encodeURIComponent(currentPreset.model_id)}/capabilities`);
                if (capsRes.ok) {
                    const data = await capsRes.json();
                    if (data.success && data.capabilities) {
                        setCapabilities(data.capabilities);
                    }
                }

                // 2. Fetch latest preset for this model
                const presetRes = await fetch('/api/preset');
                if (presetRes.ok) {
                    const presetData = await presetRes.json();
                    if (presetData.data && Array.isArray(presetData.data)) {
                        // The API returns them sorted by updated_at desc, so we just find the first match
                        const latestPreset = presetData.data.find((p: CurrentPreset) => p.model_id === initialModelId);
                        if (latestPreset) {
                            setCurrentPreset(latestPreset);
                        }
                    }
                }
            } catch (err) {
                console.error("Failed to initialize playground", err);
            } finally {
                setIsLoadingCaps(false);
                setIsInitializing(false);
            }
        };

        initializePlayground();
    }, [initialModelId]); // Run once when the model ID is defined

    const updateParameter = (key: keyof PresetParameters, value: number) => {
        setCurrentPreset(prev => ({
            ...prev,
            parameters: { ...prev.parameters, [key]: value }
        }));
    };

    const addFewShot = () => {
        setCurrentPreset(prev => ({
            ...prev,
            few_shot_examples: [...prev.few_shot_examples, { input: '', output: '' }]
        }));
    };

    const updateFewShot = (index: number, field: 'input' | 'output', value: string) => {
        const newExamples = [...currentPreset.few_shot_examples];
        newExamples[index][field] = value;
        setCurrentPreset(prev => ({ ...prev, few_shot_examples: newExamples }));
    };

    const removeFewShot = (index: number) => {
        const newExamples = [...currentPreset.few_shot_examples];
        newExamples.splice(index, 1);
        setCurrentPreset(prev => ({ ...prev, few_shot_examples: newExamples }));
    };

    const handleSavePreset = async () => {
        if (!presetNameInput.trim()) return;
        setIsSaving(true);
        try {
            const payload = { ...currentPreset, preset_name: presetNameInput };
            const res = await fetch('/api/preset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success) {
                setCurrentPreset(prev => ({ ...prev, id: data.id, preset_name: presetNameInput }));
                setShowSaveModal(false);
            }
        } catch (err) {
            console.error("Save failed", err);
        } finally {
            setIsSaving(false);
        }
    };

    const loadSavedPresets = async () => {
        try {
            const res = await fetch('/api/preset');
            const data = await res.json();
            if (data.data) {
                setSavedPresets(data.data);
            }
        } catch (err) {
            console.error("Load failed", err);
        }
    };

    const handleOpenModal = () => {
        loadSavedPresets();
        setShowOpenModal(true);
    };

    const selectPreset = (preset: CurrentPreset) => {
        setCurrentPreset(preset);
        setShowOpenModal(false);
    };

    const handleRunTest = async () => {
        setIsRunning(true);
        try {
            setMasterPrompt(currentPreset.master_prompt);
            const runId = `run_override_${Date.now()}`;
            await fetch('/api/inferomics/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    objectiveId: 'default',
                    runId,
                    selectedModels: [currentPreset.model_id],
                    datasetId: '',
                    accuracy: 'Standard',
                    masterPrompt: currentPreset.master_prompt,
                    parametersOverride: currentPreset.parameters
                })
            });
            setTimeout(() => setIsRunning(false), 1000);
            if (onClose) onClose();
        } catch (err) {
            console.error(err);
            setIsRunning(false);
        }
    };

    const content = (
        <div className={cn("flex overflow-hidden bg-[#0D1117] relative", isModal ? "h-[85vh] rounded-xl border border-[#1F2937]" : "h-full")}>

            {/* LEFT PANEL */}
            <div className="w-[320px] bg-[#0D1117] border-r border-[#1F2937] flex flex-col h-full shrink-0">
                <div className="p-4 border-b border-[#1F2937] flex items-center justify-between">
                    <h2 className="font-semibold text-white">Playground Config</h2>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
                    {/* Parameters Configuration */}
                    {(isLoadingCaps || isInitializing) ? (
                        <div className="flex items-center justify-center p-8">
                            <Loader2 className="animate-spin text-gray-500" size={24} />
                        </div>
                    ) : (
                        <>
                            {capabilities?.supportsTemperature && (
                                <div className="space-y-3">
                                    <div className="flex justify-between">
                                        <label className="text-sm font-medium text-gray-300 flex items-center gap-1">
                                            Temperature <HelpCircle size={14} className="opacity-50" />
                                        </label>
                                        <input
                                            type="number"
                                            min="0" max="2" step="0.1"
                                            value={currentPreset.parameters.temperature}
                                            onChange={(e) => updateParameter('temperature', parseFloat(e.target.value))}
                                            className="bg-[#1F2937] border border-[#374151] rounded w-16 px-2 py-1 text-sm text-right text-white"
                                        />
                                    </div>
                                    <input
                                        type="range" min="0" max="2" step="0.1"
                                        value={currentPreset.parameters.temperature}
                                        onChange={(e) => updateParameter('temperature', parseFloat(e.target.value))}
                                        className="custom-slider"
                                    />
                                    <div className="flex justify-between text-xs text-gray-500">
                                        <span>0</span><span>2</span>
                                    </div>
                                </div>
                            )}

                            {capabilities?.supportsMaxTokens && (
                                <div className="space-y-3">
                                    <div className="flex justify-between">
                                        <label className="text-sm font-medium text-gray-300 flex items-center gap-1">
                                            Maximum tokens <HelpCircle size={14} className="opacity-50" />
                                        </label>
                                        <input
                                            type="number"
                                            min="0" max={capabilities.maxContextWindow} step="1"
                                            value={currentPreset.parameters.max_tokens}
                                            onChange={(e) => updateParameter('max_tokens', parseInt(e.target.value))}
                                            className="bg-[#1F2937] border border-[#374151] rounded w-20 px-2 py-1 text-sm text-right text-white"
                                        />
                                    </div>
                                    <input
                                        type="range" min="0" max={capabilities.maxContextWindow} step="1"
                                        value={currentPreset.parameters.max_tokens}
                                        onChange={(e) => updateParameter('max_tokens', parseInt(e.target.value))}
                                        className="custom-slider"
                                    />
                                    <div className="flex justify-between text-xs text-gray-500">
                                        <span>0</span><span>{capabilities.maxContextWindow}</span>
                                    </div>
                                </div>
                            )}

                            {capabilities?.supportsPresencePenalty && (
                                <div className="space-y-3">
                                    <div className="flex justify-between">
                                        <label className="text-sm font-medium text-gray-300 flex items-center gap-1">
                                            Presence penalty <HelpCircle size={14} className="opacity-50" />
                                        </label>
                                        <input
                                            type="number"
                                            min="-2" max="2" step="0.1"
                                            value={currentPreset.parameters.presence_penalty}
                                            onChange={(e) => updateParameter('presence_penalty', parseFloat(e.target.value))}
                                            className="bg-[#1F2937] border border-[#374151] rounded w-16 px-2 py-1 text-sm text-right text-white"
                                        />
                                    </div>
                                    <input
                                        type="range" min="-2" max="2" step="0.1"
                                        value={currentPreset.parameters.presence_penalty}
                                        onChange={(e) => updateParameter('presence_penalty', parseFloat(e.target.value))}
                                        className="custom-slider"
                                    />
                                    <div className="flex justify-between text-xs text-gray-500">
                                        <span>-2</span><span>0</span><span>2</span>
                                    </div>
                                </div>
                            )}

                            {capabilities?.supportsTopP && (
                                <div className="space-y-3">
                                    <div className="flex justify-between">
                                        <label className="text-sm font-medium text-gray-300 flex items-center gap-1">
                                            Top-p threshold <HelpCircle size={14} className="opacity-50" />
                                        </label>
                                        <input
                                            type="number"
                                            min="0" max="1" step="0.05"
                                            value={currentPreset.parameters.top_p}
                                            onChange={(e) => updateParameter('top_p', parseFloat(e.target.value))}
                                            className="bg-[#1F2937] border border-[#374151] rounded w-16 px-2 py-1 text-sm text-right text-white"
                                        />
                                    </div>
                                    <input
                                        type="range" min="0" max="1" step="0.05"
                                        value={currentPreset.parameters.top_p}
                                        onChange={(e) => updateParameter('top_p', parseFloat(e.target.value))}
                                        className="custom-slider"
                                    />
                                    <div className="flex justify-between text-xs text-gray-500">
                                        <span>0</span><span>1</span>
                                    </div>
                                </div>
                            )}

                            {capabilities?.supportsTopK && (
                                <div className="space-y-3">
                                    <div className="flex justify-between">
                                        <label className="text-sm font-medium text-gray-300 flex items-center gap-1">
                                            Top-k threshold <HelpCircle size={14} className="opacity-50" />
                                        </label>
                                        <input
                                            type="number"
                                            min="-1" max="200" step="1"
                                            value={currentPreset.parameters.top_k}
                                            onChange={(e) => updateParameter('top_k', parseInt(e.target.value))}
                                            className="bg-[#1F2937] border border-[#374151] rounded w-16 px-2 py-1 text-sm text-right text-white"
                                        />
                                    </div>
                                    <input
                                        type="range" min="-1" max="200" step="1"
                                        value={currentPreset.parameters.top_k}
                                        onChange={(e) => updateParameter('top_k', parseInt(e.target.value))}
                                        className="custom-slider"
                                    />
                                    <div className="flex justify-between text-xs text-gray-500">
                                        <span>-1</span><span>200</span>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* RIGHT PANEL */}
            <div className="flex-1 flex flex-col h-full bg-[#001A2B]">
                <div className="h-16 px-6 border-b border-[#1F2937] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <h1 className="text-xl font-bold text-white tracking-tight">Playground</h1>
                        {!isInitializing && (
                            <span className="bg-[#1F2937] text-gray-300 text-xs px-2 py-1 rounded truncate max-w-[200px]">
                                {currentPreset.preset_name ? currentPreset.preset_name : 'Unsaved Preset'}
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        <button onClick={handleOpenModal} className="flex items-center gap-2 text-sm text-gray-300 hover:text-white px-3 py-1.5 rounded-md hover:bg-[#1F2937] transition-colors">
                            <FolderOpen size={16} /> Open preset
                        </button>
                        <button onClick={() => setShowSaveModal(true)} className="flex items-center gap-2 text-sm text-gray-300 hover:text-white px-3 py-1.5 rounded-md hover:bg-[#1F2937] transition-colors border border-[#374151]">
                            <Save size={16} /> Save preset
                        </button>
                        <div className="w-px h-6 bg-[#374151] mx-2"></div>
                        <button onClick={() => setShowViewCode(true)} className="flex items-center gap-2 text-sm text-[#6B4EFF] hover:text-[#5a41d9] bg-[#6B4EFF]/10 hover:bg-[#6B4EFF]/20 px-3 py-1.5 rounded-md transition-colors btn-lift">
                            <Code size={16} /> View code
                        </button>
                        {isModal && onClose && (
                            <button onClick={onClose} className="p-1 hover:bg-[#1F2937] text-gray-400 hover:text-white rounded-md ml-2 transition-colors">
                                <X size={20} />
                            </button>
                        )}
                    </div>
                </div>

                {/* EDITOR AREA */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                    {isInitializing ? (
                        <div className="flex h-full items-center justify-center">
                            <Loader2 className="animate-spin text-gray-500" size={32} />
                        </div>
                    ) : (
                        <div className="max-w-4xl mx-auto space-y-8">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-semibold tracking-wider text-gray-400 uppercase">System Prompt &middot; <span className="text-[#E0FF4F] tracking-normal font-mono">{currentPreset.model_id}</span></label>
                                </div>
                                <textarea
                                    value={currentPreset.master_prompt}
                                    onChange={(e) => setCurrentPreset({ ...currentPreset, master_prompt: e.target.value })}
                                    placeholder="Enter system instructions"
                                    className="w-full bg-[#0D1117] border border-[#374151] rounded-lg p-4 text-gray-200 min-h-[120px] focus:outline-none focus:border-[#6B4EFF] focus:ring-1 focus:ring-[#6B4EFF] resize-y"
                                />
                            </div>

                            {currentPreset.few_shot_examples.map((example, idx) => (
                                <div key={idx} className="space-y-4 pt-4 border-t border-[#1F2937]">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-semibold tracking-wider text-gray-400 uppercase">Example: User</label>
                                        <button onClick={() => removeFewShot(idx)} className="text-gray-500 hover:text-red-400 transition-colors">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                    <textarea
                                        value={example.input}
                                        onChange={(e) => updateFewShot(idx, 'input', e.target.value)}
                                        placeholder="Enter instructions or prompt for AI assistant"
                                        className="w-full bg-[#0D1117] border border-[#374151] rounded-lg p-4 text-gray-200 focus:outline-none focus:border-[#6B4EFF] focus:ring-1 focus:ring-[#6B4EFF]"
                                        rows={2}
                                    />

                                    <label className="text-xs font-semibold tracking-wider text-gray-400 uppercase block mt-4 mb-2">Example: AI Assistant</label>
                                    <textarea
                                        value={example.output}
                                        onChange={(e) => updateFewShot(idx, 'output', e.target.value)}
                                        placeholder="Enter AI assistant's response"
                                        className="w-full bg-[#0D1117] border border-[#374151] rounded-lg p-4 text-gray-200 focus:outline-none focus:border-[#6B4EFF] focus:ring-1 focus:ring-[#6B4EFF]"
                                        rows={3}
                                    />
                                </div>
                            ))}

                            <button
                                onClick={addFewShot}
                                className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors py-2"
                            >
                                <Plus size={16} /> Add few-shot example
                            </button>
                        </div>
                    )}
                </div>

                {/* BOTTOM CHAT */}
                <div className="p-6 border-t border-[#1F2937] bg-[#001A2B]">
                    <div className="max-w-4xl mx-auto">
                        <div className="relative mb-6">
                            <textarea
                                placeholder="Enter message to test..."
                                className="w-full bg-[#0D1117] border border-[#374151] rounded-xl pl-4 pr-14 py-4 text-gray-200 focus:outline-none focus:border-[#6B4EFF] resize-none h-14 overflow-hidden"
                            />
                            <button className="absolute right-3 top-2.5 bg-[#6B4EFF] hover:bg-[#5a41d9] text-white p-1.5 rounded-lg transition-colors">
                                <Play size={18} className="ml-0.5" />
                            </button>
                        </div>

                        <div className="flex flex-wrap items-center justify-center gap-3">
                            <button className="flex items-center gap-2 bg-[#0D1117] border border-[#1F2937] hover:border-[#6B4EFF] text-gray-300 text-sm px-4 py-2 rounded-lg transition-colors">
                                <Sparkles size={14} className="text-[#E0FF4F]" /> Improve my sentence
                            </button>
                            <button className="flex items-center gap-2 bg-[#0D1117] border border-[#1F2937] hover:border-[#6B4EFF] text-gray-300 text-sm px-4 py-2 rounded-lg transition-colors">
                                <Globe size={14} className="text-blue-400" /> Quick translation
                            </button>
                            <button className="flex items-center gap-2 bg-[#0D1117] border border-[#1F2937] hover:border-[#6B4EFF] text-gray-300 text-sm px-4 py-2 rounded-lg transition-colors">
                                <FileText size={14} className="text-pink-400" /> Summarize quickly
                            </button>
                        </div>

                        <div className="mt-8 flex justify-center">
                            <button
                                onClick={handleRunTest}
                                disabled={isRunning}
                                className="decision-card recommended flex items-center gap-3 w-auto px-8 py-3 btn-lift hover:scale-105"
                            >
                                {isRunning ? (
                                    <>
                                        <Loader2 size={20} className="animate-spin text-[#E0FF4F]" />
                                        <span className="font-bold text-white tracking-wide">RUNNING TEST...</span>
                                    </>
                                ) : (
                                    <>
                                        <Play size={20} className="text-[#E0FF4F]" fill="currentColor" />
                                        <span className="font-bold text-white tracking-wide">RUN TEST ON ENGINE</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* View Code Modal */}
            {showViewCode && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-[#0D1117] border border-[#1F2937] rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl">
                        <div className="px-6 py-4 border-b border-[#1F2937] flex items-center justify-between bg-[#001A2B]">
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                <Code size={18} /> JSON Configuration
                            </h3>
                            <button onClick={() => setShowViewCode(false)} className="text-gray-400 hover:text-white"><X size={20} /></button>
                        </div>
                        <div className="p-6 bg-[#0D1117]">
                            <pre className="text-sm text-green-400 font-mono overflow-auto max-h-[500px] custom-scrollbar">
                                {JSON.stringify(currentPreset, null, 2)}
                            </pre>
                        </div>
                        <div className="px-6 py-4 border-t border-[#1F2937] bg-[#001A2B] flex justify-end">
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(JSON.stringify(currentPreset, null, 2));
                                }}
                                className="flex items-center gap-2 bg-[#1F2937] hover:bg-[#374151] text-white px-4 py-2 rounded-md text-sm transition-colors"
                            >
                                <Copy size={16} /> Copy Code
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Save Preset Modal */}
            {showSaveModal && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-[#0D1117] border border-[#1F2937] rounded-xl w-full max-w-md overflow-hidden shadow-2xl">
                        <div className="px-6 py-4 border-b border-[#1F2937] flex items-center justify-between bg-[#001A2B]">
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                <Save size={18} /> Save Preset
                            </h3>
                            <button onClick={() => setShowSaveModal(false)} className="text-gray-400 hover:text-white"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <label className="text-sm text-gray-300 block">Preset Name</label>
                            <input
                                type="text"
                                value={presetNameInput}
                                onChange={(e) => setPresetNameInput(e.target.value)}
                                placeholder="e.g. Finance Summary Analyzer"
                                className="w-full bg-[#1F2937] border border-[#374151] rounded-lg p-3 text-white focus:outline-none focus:border-[#6B4EFF]"
                                autoFocus
                            />
                        </div>
                        <div className="px-6 py-4 border-t border-[#1F2937] bg-[#001A2B] flex justify-end gap-3">
                            <button onClick={() => setShowSaveModal(false)} className="text-gray-400 hover:text-white px-4 py-2 text-sm transition-colors">
                                Cancel
                            </button>
                            <button
                                onClick={handleSavePreset}
                                disabled={isSaving || !presetNameInput.trim()}
                                className="bg-[#6B4EFF] hover:bg-[#5a41d9] disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-md font-medium text-sm flex items-center gap-2 transition-colors btn-lift"
                            >
                                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                Save Configuration
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Open Preset Modal */}
            {showOpenModal && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-[#0D1117] border border-[#1F2937] rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl">
                        <div className="px-6 py-4 border-b border-[#1F2937] flex items-center justify-between bg-[#001A2B]">
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                <FolderOpen size={18} /> Open Saved Preset
                            </h3>
                            <button onClick={() => setShowOpenModal(false)} className="text-gray-400 hover:text-white"><X size={20} /></button>
                        </div>
                        <div className="p-6 max-h-[400px] overflow-y-auto custom-scrollbar">
                            {savedPresets.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    No saved presets found.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-3">
                                    {savedPresets.map((preset, idx) => (
                                        <button
                                            key={preset.id || idx}
                                            onClick={() => selectPreset(preset)}
                                            className="text-left bg-[#1F2937] hover:bg-[#374151] border border-[#374151] rounded-lg p-4 group transition-colors"
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="font-semibold text-white group-hover:text-[#E0FF4F] transition-colors">{preset.preset_name}</span>
                                                <span className="text-xs text-gray-500 font-mono">{preset.model_id}</span>
                                            </div>
                                            <p className="text-sm text-gray-400 line-clamp-1">{preset.master_prompt}</p>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    if (isModal) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-12 animate-in fade-in duration-200">
                <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose}></div>
                <div className="relative z-10 w-full max-w-[1240px] max-h-[90vh] shadow-2xl animate-in zoom-in-95 duration-200">
                    {content}
                </div>
            </div>
        );
    }

    return <div className="h-[calc(100vh-56px)]">{content}</div>;
}

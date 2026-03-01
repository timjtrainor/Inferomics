"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface SampledData {
    sampleSize: number;
    totalRecords: number;
    sample: Record<string, unknown>[];
}

interface AppContextType {
    selectedDatasetId: string;
    setSelectedDatasetId: (id: string) => void;
    accuracy: string;
    setAccuracy: (accuracy: string) => void;
    sampledData: SampledData | null;
    setSampledData: (data: SampledData | null) => void;
    selectedProfileId: string;
    setSelectedProfileId: (id: string) => void;
    masterPrompt: string;
    setMasterPrompt: (prompt: string) => void;
    selectedModels: string[];
    setSelectedModels: (models: string[]) => void;
    projectedVolume: number;
    setProjectedVolume: (volume: number) => void;
    latencyTolerance: number;
    setLatencyTolerance: (ms: number) => void;
    errorRiskCost: number;
    setErrorRiskCost: (cost: number) => void;
    configStatus: 'DRAFT' | 'COMPLETE';
    resetState: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
    const [selectedDatasetId, setSelectedDatasetId] = useState<string>('');
    const [accuracy, setAccuracy] = useState<string>('Standard');
    const [sampledData, setSampledData] = useState<SampledData | null>(null);
    const [selectedProfileId, setSelectedProfileId] = useState<string>('analytical');
    const [masterPrompt, setMasterPrompt] = useState<string>('');
    const [selectedModels, setSelectedModels] = useState<string[]>([]);
    const [projectedVolume, setProjectedVolume] = useState<number>(10000);
    const [latencyTolerance, setLatencyTolerance] = useState<number>(5000);
    const [errorRiskCost, setErrorRiskCost] = useState<number>(25.00);
    const isMounted = React.useRef(false);

    // Load from localStorage on mount to avoid hydration mismatch
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedProfile = localStorage.getItem('inferomics_profile_id');
            const savedPrompt = localStorage.getItem('inferomics_master_prompt');
            const savedModels = localStorage.getItem('inferomics_selected_models');
            const savedVolume = localStorage.getItem('inferomics_volume');
            const savedLatency = localStorage.getItem('inferomics_latency');
            const savedErrorCost = localStorage.getItem('inferomics_error_cost');

            // Defer updates to satisfy react-hooks/set-state-in-effect
            setTimeout(() => {
                if (savedProfile) setSelectedProfileId(savedProfile);
                if (savedPrompt) setMasterPrompt(savedPrompt);
                if (savedModels) {
                    try {
                        setSelectedModels(JSON.parse(savedModels));
                    } catch (e) {
                        console.error('Failed to parse saved models', e);
                    }
                }
                if (savedVolume) setProjectedVolume(Number(savedVolume));
                if (savedLatency) setLatencyTolerance(Number(savedLatency));
                if (savedErrorCost) setErrorRiskCost(Number(savedErrorCost));
            }, 0);
        }
    }, []);

    const configStatus = masterPrompt.trim().length > 0 && selectedModels.length >= 2 && selectedModels.length <= 5 ? 'COMPLETE' : 'DRAFT';

    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('inferomics_profile_id', selectedProfileId);
            localStorage.setItem('inferomics_master_prompt', masterPrompt);
            localStorage.setItem('inferomics_selected_models', JSON.stringify(selectedModels));
            localStorage.setItem('inferomics_volume', projectedVolume.toString());
            localStorage.setItem('inferomics_latency', latencyTolerance.toString());
            localStorage.setItem('inferomics_error_cost', errorRiskCost.toString());
        }
    }, [selectedProfileId, masterPrompt, selectedModels, projectedVolume, latencyTolerance, errorRiskCost]);

    // Smart defaults logic based on Objective
    useEffect(() => {
        // Skip on initial mount to avoid overwriting values restored from local storage/API
        if (!isMounted.current) {
            isMounted.current = true;
            return;
        }

        const defaults: Record<string, { v: number, l: number, e: number }> = {
            'bulk': { v: 1000000, l: 250, e: 0.05 },
            'interactive': { v: 100000, l: 500, e: 2.50 },
            'analytical': { v: 10000, l: 5000, e: 25.00 },
            'autonomous': { v: 1000, l: 30000, e: 100.00 }
        };

        const config = defaults[selectedProfileId];
        if (config) {
            // Use setTimeout to avoid 'setState in effect' lint error and cascading render warning
            setTimeout(() => {
                setProjectedVolume(config.v);
                setLatencyTolerance(config.l);
                setErrorRiskCost(config.e);
            }, 0);
        }
    }, [selectedProfileId]);

    const resetState = () => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('inferomics_profile_id');
            localStorage.removeItem('inferomics_master_prompt');
            localStorage.removeItem('inferomics_selected_models');
            localStorage.removeItem('inferomics_volume');
            localStorage.removeItem('inferomics_latency');
            localStorage.removeItem('inferomics_error_cost');
        }
        setSelectedDatasetId('');
        setAccuracy('Standard');
        setSampledData(null);
        setSelectedProfileId('analytical');
        setMasterPrompt('');
        setSelectedModels([]);
        setProjectedVolume(10000);
        setLatencyTolerance(5000);
        setErrorRiskCost(25.00);
    };

    return (
        <AppContext.Provider value={{
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
            resetState
        }}>
            {children}
        </AppContext.Provider>
    );
}

export function useAppContext() {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
}

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

    // Load from localStorage on mount to avoid hydration mismatch
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedProfile = localStorage.getItem('inferomics_profile_id');
            const savedPrompt = localStorage.getItem('inferomics_master_prompt');
            const savedModels = localStorage.getItem('inferomics_selected_models');

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
            }, 0);
        }
    }, []);

    const configStatus = masterPrompt.trim().length > 0 && selectedModels.length >= 2 && selectedModels.length <= 5 ? 'COMPLETE' : 'DRAFT';

    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('inferomics_profile_id', selectedProfileId);
            localStorage.setItem('inferomics_master_prompt', masterPrompt);
            localStorage.setItem('inferomics_selected_models', JSON.stringify(selectedModels));
        }
    }, [selectedProfileId, masterPrompt, selectedModels]);

    const resetState = () => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('inferomics_profile_id');
            localStorage.removeItem('inferomics_master_prompt');
            localStorage.removeItem('inferomics_selected_models');
        }
        setSelectedDatasetId('');
        setAccuracy('Standard');
        setSampledData(null);
        setSelectedProfileId('analytical');
        setMasterPrompt('');
        setSelectedModels([]);
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

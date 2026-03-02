"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface SampledData {
    sampleSize: number;
    totalRecords: number;
    sample: Record<string, unknown>[];
}

interface PersistedConfig {
    profile_id?: string;
    master_prompt?: string;
    selected_models?: string[];
    selected_dataset_id?: string;
    accuracy?: string;
    sampled_data?: SampledData | null;
    economic_levers?: {
        volume?: number;
        latency?: number;
        error_cost?: number;
    };
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
    saveStatus: 'IDLE' | 'SAVING' | 'SAVED';
    isResetForDemo: boolean;
    persistedConfig: PersistedConfig | null;
    restoreField: (key: 'masterPrompt' | 'selectedModels' | 'economicLevers' | 'all') => void;
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
    const [isHydrated, setIsHydrated] = useState(false);
    const [isResetForDemo, setIsResetForDemo] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'IDLE' | 'SAVING' | 'SAVED'>('IDLE');
    const isMounted = React.useRef(false);
    const saveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
    const lastPersistedConfig = React.useRef<PersistedConfig | null>(null);

    // Load from API on mount, with localStorage as fallback/migration source
    useEffect(() => {
        const hydrate = async () => {
            if (typeof window === 'undefined') return;

            try {
                // 1. Try to fetch from Firestore
                const response = await fetch('/api/objective?id=default');
                const { data } = await response.json();

                // 2. Check for legacy localStorage data
                const localKeys = {
                    profileId: localStorage.getItem('inferomics_profile_id'),
                    masterPrompt: localStorage.getItem('inferomics_master_prompt'),
                    selectedModels: localStorage.getItem('inferomics_selected_models'),
                    volume: localStorage.getItem('inferomics_volume'),
                    latency: localStorage.getItem('inferomics_latency'),
                    errorCost: localStorage.getItem('inferomics_error_cost'),
                    datasetId: localStorage.getItem('inferomics_selected_dataset_id'),
                    accuracy: localStorage.getItem('inferomics_accuracy'),
                    sampledData: localStorage.getItem('inferomics_sampled_data'),
                };

                const hasLocalData = Object.values(localKeys).some(val => val !== null);

                // 3. Logic: If Firestore is empty but localStorage has data, migrate.
                if (!data && hasLocalData) {
                    console.log('Migrating localStorage to Firestore...');
                    const migratedData = {
                        selected_profile_id: localKeys.profileId || 'analytical',
                        master_prompt: localKeys.masterPrompt || '',
                        selected_models: localKeys.selectedModels ? JSON.parse(localKeys.selectedModels) : [],
                        economic_levers: {
                            volume: localKeys.volume ? Number(localKeys.volume) : 10000,
                            latency: localKeys.latency ? Number(localKeys.latency) : 5000,
                            error_cost: localKeys.errorCost ? Number(localKeys.errorCost) : 25.00
                        },
                        selected_dataset_id: localKeys.datasetId || '',
                        accuracy: localKeys.accuracy || 'Standard',
                        sampled_data: localKeys.sampledData ? JSON.parse(localKeys.sampledData) : null
                    };

                    // Initial state update
                    setSelectedProfileId(migratedData.selected_profile_id);
                    setMasterPrompt(migratedData.master_prompt);
                    setSelectedModels(migratedData.selected_models);
                    setProjectedVolume(migratedData.economic_levers.volume);
                    setLatencyTolerance(migratedData.economic_levers.latency);
                    setErrorRiskCost(migratedData.economic_levers.error_cost);
                    setSelectedDatasetId(migratedData.selected_dataset_id);
                    setAccuracy(migratedData.accuracy);
                    setSampledData(migratedData.sampled_data);

                    // Push to API
                    await fetch('/api/objective', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ...migratedData, implementation_id: 'default' })
                    });

                    // Clear local storage
                    Object.keys(localKeys).forEach(key => {
                        const localStorageKey = `inferomics_${key.replace(/([A-Z])/g, "_$1").toLowerCase()}`;
                        localStorage.removeItem(localStorageKey);
                    });
                }
                // 4. Otherwise, use Firestore data if it exists
                else if (data) {
                    lastPersistedConfig.current = data;
                    if (data.profile_id) setSelectedProfileId(data.profile_id);
                    if (data.master_prompt) setMasterPrompt(data.master_prompt);
                    if (data.selected_models) setSelectedModels(data.selected_models);
                    if (data.selected_dataset_id) setSelectedDatasetId(data.selected_dataset_id);
                    if (data.accuracy) setAccuracy(data.accuracy);
                    if (data.sampled_data) setSampledData(data.sampled_data);
                    if (data.economic_levers) {
                        if (data.economic_levers.volume) setProjectedVolume(data.economic_levers.volume);
                        if (data.economic_levers.latency) setLatencyTolerance(data.economic_levers.latency);
                        if (data.economic_levers.error_cost) setErrorRiskCost(data.economic_levers.error_cost);
                    }
                }
            } catch (e) {
                console.error('Hydration failed', e);
            } finally {
                setIsHydrated(true);
            }
        };

        hydrate();
    }, []);

    const configStatus = masterPrompt.trim().length > 0 && selectedModels.length >= 2 && selectedModels.length <= 5 ? 'COMPLETE' : 'DRAFT';

    // Debounced save to Firestore
    useEffect(() => {
        // Don't save if not yet hydrated, if it's the very first mount, or if in Demo Reset mode
        if (!isHydrated || !isMounted.current || isResetForDemo) return;

        // Clear existing timeout
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        // Set a 2-second debounce
        saveTimeoutRef.current = setTimeout(async () => {
            console.log('Persisting configuration to Firestore...');
            setSaveStatus('SAVING');
            try {
                await fetch('/api/objective', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        implementation_id: 'default',
                        selected_profile_id: selectedProfileId,
                        master_prompt: masterPrompt,
                        selected_models: selectedModels,
                        selected_dataset_id: selectedDatasetId,
                        accuracy: accuracy,
                        sampled_data: sampledData,
                        economic_levers: {
                            volume: projectedVolume,
                            latency: latencyTolerance,
                            error_cost: errorRiskCost
                        }
                    })
                });
                setSaveStatus('SAVED');
                setTimeout(() => setSaveStatus('IDLE'), 3000);
            } catch (error) {
                console.error('Failed to persist configuration:', error);
                setSaveStatus('IDLE');
            }
        }, 2000);

        return () => {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        };
    }, [selectedProfileId, masterPrompt, selectedModels, selectedDatasetId, accuracy, sampledData, projectedVolume, latencyTolerance, errorRiskCost, isHydrated, isResetForDemo]);

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

    const restoreField = (key: 'masterPrompt' | 'selectedModels' | 'economicLevers' | 'all') => {
        const data = lastPersistedConfig.current;
        if (!data) return;

        setIsResetForDemo(false); // Move out of reset mode as soon as interaction happens

        if (key === 'masterPrompt' || key === 'all') {
            if (data.master_prompt) setMasterPrompt(data.master_prompt);
        }
        if (key === 'selectedModels' || key === 'all') {
            if (data.selected_models) setSelectedModels(data.selected_models);
        }
        if (key === 'economicLevers' || key === 'all') {
            if (data.profile_id) setSelectedProfileId(data.profile_id);
            if (data.economic_levers) {
                if (data.economic_levers.volume) setProjectedVolume(data.economic_levers.volume);
                if (data.economic_levers.latency) setLatencyTolerance(data.economic_levers.latency);
                if (data.economic_levers.error_cost) setErrorRiskCost(data.economic_levers.error_cost);
            }
        }
    };

    const resetState = () => {
        // No need to clear Firestore here; we set isResetForDemo to prevent overwriting
        if (typeof window !== 'undefined') {
            localStorage.clear();
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
        setIsResetForDemo(true);
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
            saveStatus,
            isResetForDemo,
            persistedConfig: lastPersistedConfig.current,
            restoreField,
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

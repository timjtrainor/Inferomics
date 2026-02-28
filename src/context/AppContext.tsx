"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

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
    resetState: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
    const [selectedDatasetId, setSelectedDatasetId] = useState<string>('');
    const [accuracy, setAccuracy] = useState<string>('Standard');
    const [sampledData, setSampledData] = useState<SampledData | null>(null);

    const resetState = () => {
        setSelectedDatasetId('');
        setAccuracy('Standard');
        setSampledData(null);
    };

    return (
        <AppContext.Provider value={{
            selectedDatasetId,
            setSelectedDatasetId,
            accuracy,
            setAccuracy,
            sampledData,
            setSampledData,
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

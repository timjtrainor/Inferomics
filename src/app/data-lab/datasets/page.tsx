"use client";

import React, { useState, useEffect } from 'react';
import { UploadModal } from '@/components/UploadModal';
import { Search, ChevronDown, Plus, FileJson, Calendar, X } from 'lucide-react';

interface Dataset {
    id: string;
    name: string;
    createdAt: string;
    url: string;
}

export default function DatasetsPage() {
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [datasets, setDatasets] = useState<Dataset[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchDatasets = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/datasets');
            const data = await response.json();
            if (data.datasets) {
                setDatasets(data.datasets);
            }
        } catch (error) {
            console.error('Error fetching datasets:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchDatasets();
    }, []);

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 min-h-[calc(100vh-56px)]">
            {/* Header section matching Nebius UI */}
            <div className="flex flex-col space-y-4">
                <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold text-white tracking-tight">Data Lab</h1>
                    <span className="bg-[#1F2937] text-xs px-2 py-0.5 rounded-full text-gray-300 border border-[#374151]">Beta</span>
                </div>
                <p className="text-gray-400 max-w-3xl text-sm">
                    Create, explore, and manage datasets in one place, and seamlessly reuse them across Batch
                    Inference and Fine-tuning workflows. For more details, see the <a href="#" className="text-[#6B4EFF] hover:underline">documentation</a>.
                </p>
                <p className="text-sm text-gray-400">
                    You&apos;re exploring the Data Lab beta! Share your feedback in this <a href="#" className="text-[#6B4EFF] hover:underline">form</a> and help us make it even better.
                </p>
            </div>

            <div className="mt-8 space-y-6">
                <h2 className="text-lg font-semibold text-white">Datasets</h2>

                {/* Action Bar */}
                <div className="flex items-center justify-between">
                    <div className="flex flex-1 items-center gap-4 max-w-xl">
                        <div className="relative w-full max-w-sm">
                            <input
                                type="text"
                                placeholder="Search by name or ID"
                                className="w-full bg-[#111827] border border-[#1F2937] text-white pl-4 pr-10 py-1.5 rounded-full outline-none focus:border-gray-500 text-sm transition-colors"
                            />
                            <Search size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500" />
                        </div>

                        <button className="flex items-center gap-2 bg-[#1F2937] border border-[#374151] hover:bg-[#374151] transition-colors text-white px-4 py-1.5 rounded-full text-sm">
                            <span>Sort by Creation date</span>
                            <ChevronDown size={14} />
                        </button>
                    </div>

                    <div className="flex flex-none items-center gap-3">
                        <button
                            onClick={() => setIsUploadModalOpen(true)}
                            className="px-4 py-1.5 rounded-full text-sm font-medium border border-[#374151] hover:bg-[#1F2937] text-white flex items-center gap-2 transition-colors"
                        >
                            <Plus size={16} />
                            <span>Upload dataset</span>
                        </button>
                        <button className="bg-[#6B4EFF] hover:bg-[#5a41d9] text-white px-4 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 shadow-sm transition-colors">
                            <Plus size={16} />
                            <span>Import completions</span>
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="mt-8">
                    {isLoading ? (
                        <div className="flex items-center justify-center p-12">
                            <div className="w-8 h-8 rounded-full border-2 border-[#6B4EFF] border-t-transparent animate-spin"></div>
                        </div>
                    ) : datasets.length === 0 ? (
                        <div className="flex flex-col flex-1 items-center justify-center min-h-[400px]">
                            <div className="w-48 h-32 bg-gradient-to-br from-[#1F2937] to-transparent rounded-xl border border-[#374151] flex items-center justify-center mb-6 relative">
                                <div className="absolute inset-x-8 top-3 flex gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-gray-500"></div>
                                    <div className="w-2 h-2 rounded-full bg-gray-500"></div>
                                    <div className="w-2 h-2 rounded-full bg-gray-500"></div>
                                </div>
                                <Search size={32} className="text-[#6B4EFF] absolute bottom-8 right-12 z-10" />
                                <div className="w-24 h-16 border rounded bg-[#0D1117] border-[#374151] z-0"></div>
                                <div className="absolute bottom-8 right-12 w-6 h-6 rounded-full bg-red-400/20 border border-red-500 flex items-center justify-center z-20">
                                    <X size={12} className="text-red-400" />
                                </div>
                            </div>

                            <h3 className="text-xl font-semibold text-white mb-2">Your datasets list is empty</h3>
                            <p className="text-gray-400 text-sm mb-6">Create your first datasets.</p>

                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setIsUploadModalOpen(true)}
                                    className="px-4 py-2 rounded-full text-sm font-medium border border-[#374151] hover:bg-[#1F2937] text-white flex items-center gap-2 transition-colors"
                                >
                                    <Plus size={16} />
                                    <span>Upload dataset</span>
                                </button>
                                <button className="bg-[#6B4EFF] hover:bg-[#5a41d9] text-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 transition-colors">
                                    <Plus size={16} />
                                    <span>Import completions</span>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {datasets.map((ds) => (
                                <div key={ds.id} className="decision-card hover:border-gray-500 cursor-pointer">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 rounded-lg bg-[#6B4EFF]/10 flex items-center justify-center">
                                            <FileJson className="text-[#6B4EFF]" size={20} />
                                        </div>
                                        <div className="truncate">
                                            <h3 className="text-white font-medium truncate">{ds.name}</h3>
                                            <p className="text-sm text-gray-500">.jsonl dataset</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-gray-400">
                                        <Calendar size={14} />
                                        <span>{new Date(ds.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <UploadModal
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                onUploadSuccess={fetchDatasets}
            />
        </div>
    );
}

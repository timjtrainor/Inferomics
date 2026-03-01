"use client";

import React, { useState, useRef } from 'react';
import { X, UploadCloud, FileJson, Loader2 } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface UploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUploadSuccess: () => void;
}

export function UploadModal({ isOpen, onClose, onUploadSuccess }: UploadModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            if (!selectedFile.name.endsWith('.jsonl')) {
                setError('Only .jsonl files are supported.');
                setFile(null);
                return;
            }
            setFile(selectedFile);
            setError(null);
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setIsUploading(true);
        setError(null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/api/datasets/upload', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to upload dataset');
            }

            onUploadSuccess();
            setFile(null);
            onClose();
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('An unexpected error occurred during upload.');
            }
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-[#0D1117] border border-[#1F2937] rounded-xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-4 border-b border-[#1F2937]">
                    <h2 className="text-lg font-semibold text-white">Upload Dataset</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors"
                        disabled={isUploading}
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6">
                    {!file ? (
                        <div
                            className={cn(
                                "border-2 border-dashed border-[#1F2937] rounded-lg p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors hover:border-[#6B4EFF] hover:bg-[#6B4EFF]/5",
                                error && "border-red-500/50 hover:border-red-500"
                            )}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <div className="w-12 h-12 rounded-full bg-[#1F2937] flex items-center justify-center mb-4">
                                <UploadCloud className="text-gray-400" size={24} />
                            </div>
                            <p className="text-white font-medium mb-1">Click to browse or drag file here</p>
                            <p className="text-sm text-gray-500">Supports .jsonl files only</p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                className="hidden"
                                accept=".jsonl"
                                onChange={handleFileChange}
                            />
                        </div>
                    ) : (
                        <div className="bg-[#1F2937]/50 border border-[#1F2937] rounded-lg p-4 flex items-center gap-4">
                            <div className="w-10 h-10 rounded bg-[#6B4EFF]/20 flex items-center justify-center shrink-0">
                                <FileJson className="text-[#6B4EFF]" size={20} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-white font-medium truncate">{file.name}</p>
                                <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
                            </div>
                            <button
                                onClick={() => setFile(null)}
                                className="text-gray-400 hover:text-white p-1"
                                disabled={isUploading}
                            >
                                <X size={16} />
                            </button>
                        </div>
                    )}

                    {error && (
                        <p className="text-red-400 text-sm mt-4 text-center">{error}</p>
                    )}

                    <div className="mt-6 flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
                            disabled={isUploading}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleUpload}
                            disabled={!file || isUploading}
                            className={cn(
                                "bg-[#6B4EFF] hover:bg-[#5a41d9] text-white px-4 py-2 rounded-md font-medium text-sm flex items-center gap-2 btn-lift shadow-lg shadow-[#6B4EFF]/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#6B4EFF] disabled:hover:-translate-y-0"
                            )}
                        >
                            {isUploading && <Loader2 size={16} className="animate-spin" />}
                            {isUploading ? 'Uploading...' : 'Upload Data'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

"use client";

import React from 'react';
import PlaygroundModal from '@/components/PlaygroundModal';
import { useAppContext } from '@/context/AppContext';

export default function PlaygroundPage() {
    const { selectedModels } = useAppContext();
    const defaultModel = selectedModels.length > 0 ? selectedModels[0] : 'deepseek-ai/DeepSeek-V3';

    return <PlaygroundModal initialModelId={defaultModel} />;
}

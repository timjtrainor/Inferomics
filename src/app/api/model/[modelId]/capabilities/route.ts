import { NextRequest, NextResponse } from 'next/server';
import { getModels } from '@/lib/models';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ modelId: string }> }
) {
    try {
        const { modelId } = await params;

        // We need to match the specific model ID, handling potential URL encoding (like '/' becoming '%2F')
        const decodedModelId = decodeURIComponent(modelId);

        // Fetch all models from Nebius via the existing lib function
        const allModels = await getModels();

        // Find the requested model
        const selectedModel = allModels.find(m => m.id === decodedModelId || m.name === decodedModelId);

        if (!selectedModel) {
            // Even if model is not found in the currently cached list, we return a safe default
            // based on the standard Nebius token factory parameters
            return NextResponse.json({
                success: true,
                capabilities: {
                    supportsTemperature: true,
                    supportsMaxTokens: true,
                    supportsTopP: true,
                    supportsTopK: true,
                    supportsPresencePenalty: true,
                    maxContextWindow: 8192 // safe default fallback
                }
            });
        }

        const isVision = selectedModel.type.toLowerCase().includes('vision');

        return NextResponse.json({
            success: true,
            model: {
                id: selectedModel.id,
                name: selectedModel.name,
                context_window: selectedModel.context_window,
            },
            capabilities: {
                supportsTemperature: true,
                supportsMaxTokens: true,
                supportsTopP: true,
                supportsTopK: true,
                supportsPresencePenalty: true,
                maxContextWindow: selectedModel.context_window || 128000,
                isVision: isVision
            }
        });

    } catch (error: unknown) {
        console.error('Failed to get model capabilities:', error);
        return NextResponse.json({
            error: 'Failed to get capabilities',
            details: error instanceof Error ? error.message : String(error)
        }, {
            status: 500
        });
    }
}

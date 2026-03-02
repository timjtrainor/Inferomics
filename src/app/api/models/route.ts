import { NextResponse } from 'next/server';

interface NebiusModel {
    id: string;
    name?: string;
    description?: string;
    pricing?: { prompt: string; completion: string };
    context_length?: number;
    architecture?: { modality: string };
}

const NEBIUS_API_KEY = process.env.NEBIUS_API_KEY;
const NEBIUS_BASE_URL = 'https://api.tokenfactory.nebius.com/v1/';

export async function GET() {
    if (!NEBIUS_API_KEY) {
        return NextResponse.json({ error: 'NEBIUS_API_KEY not configured' }, { status: 500 });
    }

    try {
        const response = await fetch(`${NEBIUS_BASE_URL}models?verbose=true`, {
            headers: {
                'Authorization': `Bearer ${NEBIUS_API_KEY}`
            },
            next: { revalidate: 3600 } // Cache for 1 hour
        });

        if (!response.ok) {
            throw new Error(`Nebius API returned ${response.status}`);
        }

        const data = await response.json();

        // Filter and standardize the models
        const standardizedModels = data.data
            .filter((m: NebiusModel) => m.pricing && (m.architecture?.modality?.includes('text') || m.id.includes('llama') || m.id.includes('gemma') || m.id.includes('qwen') || m.id.includes('gpt-oss')))
            .map((m: NebiusModel) => ({
                id: m.id,
                name: m.name || m.id.split('/').pop(),
                provider: m.id.split('/')[0],
                description: m.description || '',
                priceIn: parseFloat(m.pricing?.prompt || '0') * 1000000, // Convert to price per 1M tokens
                priceOut: parseFloat(m.pricing?.completion || '0') * 1000000,
                context_window: m.context_length || 0,
                isFast: m.id.toLowerCase().includes('fast'),
                type: m.architecture?.modality === 'text->text' ? 'Text-to-text' : 'Language'
            }));

        return NextResponse.json({
            success: true,
            count: standardizedModels.length,
            models: standardizedModels
        });

    } catch (error: unknown) {
        console.error('Failed to fetch models from Nebius:', error);
        return NextResponse.json({ error: 'Failed to fetch models', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
    }
}

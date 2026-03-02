import { NextResponse } from 'next/server';
import { getModels } from '@/lib/models';

export async function GET() {
    try {
        const standardizedModels = await getModels();
        return NextResponse.json({
            success: true,
            count: standardizedModels.length,
            models: standardizedModels
        });
    } catch (error: unknown) {
        console.error('Failed to fetch models from Nebius:', error);
        return NextResponse.json({
            error: 'Failed to fetch models',
            details: error instanceof Error ? error.message : String(error)
        }, {
            status: 500
        });
    }
}

import { NextResponse } from 'next/server';
import { StorageService } from '@/services/storage';

export async function GET() {
    try {
        const datasets = await StorageService.getDatasets();
        return NextResponse.json({ datasets });
    } catch (error: unknown) {
        console.error('Error fetching datasets:', error);
        return NextResponse.json({ error: 'Failed to fetch datasets' }, { status: 500 });
    }
}

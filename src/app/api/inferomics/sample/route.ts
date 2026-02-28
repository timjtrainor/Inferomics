import { NextRequest, NextResponse } from 'next/server';
import { StorageService } from '@/services/storage';

export async function POST(request: NextRequest) {
    try {
        const { datasetId, accuracy } = await request.json();

        if (!datasetId || !accuracy) {
            return NextResponse.json({ error: 'Missing datasetId or accuracy' }, { status: 400 });
        }

        // Abstract fetch from StorageService
        const content = await StorageService.getDatasetContent(datasetId);

        // Parse JSONL
        const lines = content.split('\n').filter(line => line.trim().length > 0);
        const records = lines.map(line => {
            try {
                return JSON.parse(line);
            } catch {
                return null;
            }
        }).filter(r => r !== null);

        // Sample logic matching Cochran Formula simplification requested (max 30)
        // The margin of error (Accuracy) determines sample size, but for POC constrained to 30 max.
        // High (1%), Standard (5%), Low (10%)
        let requestedSampleSize = 0;
        if (accuracy === 'High') requestedSampleSize = 30;
        else if (accuracy === 'Standard') requestedSampleSize = 20;
        else if (accuracy === 'Low') requestedSampleSize = 10;
        else requestedSampleSize = 30; // Default

        const actualSampleSize = Math.min(requestedSampleSize, records.length);

        // Randomly select `actualSampleSize` records
        const shuffled = [...records].sort(() => 0.5 - Math.random());
        const sample = shuffled.slice(0, actualSampleSize);

        return NextResponse.json({
            success: true,
            sampleSize: actualSampleSize,
            totalRecords: records.length,
            sample
        });

    } catch (error: unknown) {
        console.error('Error sampling dataset:', error);
        return NextResponse.json({ error: 'Failed to sample dataset' }, { status: 500 });
    }
}

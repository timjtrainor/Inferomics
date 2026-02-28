import { NextRequest, NextResponse } from 'next/server';
import { StorageService } from '@/services/storage';
import { calculateCochran } from '@/lib/statistics';

// POC Demo Mode: limits actual record execution for cost/performance
// while keeping scientific threshold visible in UI.
const DEMO_MODE = true;
const DEMO_LIMIT = 25;

export async function POST(request: NextRequest) {
    try {
        const { datasetId, accuracy } = await request.json();

        if (!datasetId || !accuracy) {
            return NextResponse.json({ error: 'Missing datasetId or accuracy' }, { status: 400 });
        }

        // 1. Check if sample already exists on disk (Persistence Requirement)
        const existingSample = await StorageService.getSample(datasetId, accuracy);
        if (existingSample) {
            return NextResponse.json({
                success: true,
                ...existingSample,
                isFromCache: true
            });
        }

        // 2. Abstract fetch from StorageService
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

        // 3. Scientific Sample Size Calculation (Cochran Formula)
        let marginOfError = 0.05; // Standard default
        if (accuracy === 'High') marginOfError = 0.01;
        else if (accuracy === 'Standard') marginOfError = 0.05;
        else if (accuracy === 'Low') marginOfError = 0.10;

        const scientificSampleSize = calculateCochran(records.length, marginOfError);

        // 4. Record Selection with Demo Mode Logic
        const population = [...records].sort(() => 0.5 - Math.random());

        // In Demo Mode, we only take up to 30 records for processing/engine storage,
        // but we return the scientific sample size for the UI to show.
        const actualSampleRecords = DEMO_MODE
            ? population.slice(0, Math.min(DEMO_LIMIT, records.length))
            : population.slice(0, Math.min(scientificSampleSize, records.length));

        const responseData = {
            sampleSize: scientificSampleSize,
            totalRecords: records.length,
            sample: actualSampleRecords
        };

        // 5. Persist new sample to disk
        await StorageService.saveSample(datasetId, accuracy, responseData);

        return NextResponse.json({
            success: true,
            ...responseData,
            isFromCache: false
        });

    } catch (error: unknown) {
        console.error('Error sampling dataset:', error);
        return NextResponse.json({ error: 'Failed to sample dataset' }, { status: 500 });
    }
}

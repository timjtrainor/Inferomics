import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from '@/lib/firebase-admin';

/**
 * Initialize a new Discovery Run
 * POST /api/objective/run/create
 * Body: { objectiveId: string, modelIds: string[] }
 */
export async function POST(request: NextRequest) {
    try {
        const { objectiveId, modelIds } = await request.json();

        if (!objectiveId || !modelIds || !Array.isArray(modelIds)) {
            return NextResponse.json({ error: 'Missing objectiveId or modelIds' }, { status: 400 });
        }

        const firestore = getFirestore();
        const runId = `run_${Date.now()}`;

        const runRef = firestore
            .collection('objectives')
            .doc(objectiveId)
            .collection('runs')
            .doc(runId);

        await runRef.set({
            status: 'PENDING',
            models: modelIds,
            created_at: new Date(),
            updated_at: new Date()
        });

        return NextResponse.json({ success: true, runId });
    } catch (error: unknown) {
        console.error('Failed to create run:', error);
        return NextResponse.json({ error: 'Failed to create run', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
    }
}

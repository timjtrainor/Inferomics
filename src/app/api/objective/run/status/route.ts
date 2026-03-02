import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const objectiveId = searchParams.get('objectiveId') || 'default';
    const runId = searchParams.get('runId');

    if (!runId) {
        return NextResponse.json({ error: 'runId is required' }, { status: 400 });
    }

    try {
        const firestore = getFirestore();
        const runDoc = await firestore
            .collection('objectives')
            .doc(objectiveId)
            .collection('runs')
            .doc(runId)
            .get();

        if (!runDoc.exists) {
            return NextResponse.json({ error: 'Run not found' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            run: {
                id: runDoc.id,
                ...runDoc.data()
            }
        });
    } catch (error: unknown) {
        console.error('Error fetching run status:', error);
        return NextResponse.json({ error: 'Failed to fetch run status', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
    }
}

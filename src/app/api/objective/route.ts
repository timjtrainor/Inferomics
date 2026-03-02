import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from '@/lib/firebase-admin';

const COLLECTION_NAME = 'objectives';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id') || 'default';

    try {
        const firestore = getFirestore();
        const doc = await firestore.collection(COLLECTION_NAME).doc(id).get();

        if (!doc.exists) {
            return NextResponse.json({ data: null });
        }

        return NextResponse.json({ data: doc.data() });
    } catch (error: unknown) {
        console.error('Error fetching objective:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: 'Failed to fetch objective', details: message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            implementation_id = 'default',
            ...rest
        } = body;

        const firestore = getFirestore();
        const docRef = firestore.collection(COLLECTION_NAME).doc(implementation_id);

        // Map and clean fields for Firestore
        const updateData: Record<string, unknown> = {
            updated_at: new Date()
        };

        if (rest.selected_profile_id) updateData.profile_id = rest.selected_profile_id;
        if (rest.master_prompt !== undefined) updateData.master_prompt = rest.master_prompt;
        if (rest.selected_models) updateData.selected_models = rest.selected_models;
        if (rest.selected_dataset_id) updateData.selected_dataset_id = rest.selected_dataset_id;
        if (rest.accuracy) updateData.accuracy = rest.accuracy;
        if (rest.sampled_data) updateData.sampled_data = rest.sampled_data;
        if (rest.economic_levers) updateData.economic_levers = rest.economic_levers;

        await docRef.set(updateData, { merge: true });

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error('Error saving objective:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: 'Failed to save objective', details: message }, { status: 500 });
    }
}

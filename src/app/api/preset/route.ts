import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from '@/lib/firebase-admin';

const COLLECTION_NAME = 'presets';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    try {
        const firestore = getFirestore();
        if (id) {
            const doc = await firestore.collection(COLLECTION_NAME).doc(id).get();
            if (!doc.exists) {
                return NextResponse.json({ data: null }, { status: 404 });
            }
            return NextResponse.json({ data: { id: doc.id, ...doc.data() } });
        } else {
            // Get all presets
            const snapshot = await firestore.collection(COLLECTION_NAME).orderBy('updated_at', 'desc').get();
            const presets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            return NextResponse.json({ data: presets });
        }
    } catch (error: unknown) {
        console.error('Error fetching preset(s):', error);
        return NextResponse.json({ error: 'Failed to fetch preset(s)' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const firestore = getFirestore();
        const collectionRef = firestore.collection(COLLECTION_NAME);

        const presetData = {
            preset_name: body.preset_name || 'Untitled Preset',
            model_id: body.model_id,
            master_prompt: body.master_prompt || '',
            few_shot_examples: body.few_shot_examples || [],
            parameters: body.parameters || {},
            updated_at: new Date(),
        };

        let targetDoc;
        if (body.id) {
            // Update existing
            targetDoc = Object.assign(collectionRef.doc(body.id), {});
            await targetDoc.set(presetData, { merge: true });
            return NextResponse.json({ success: true, id: targetDoc.id });
        } else {
            // Create new
            const withCreated = { ...presetData, created_at: new Date() };
            targetDoc = await collectionRef.add(withCreated);
            return NextResponse.json({ success: true, id: targetDoc.id });
        }
    } catch (error: unknown) {
        console.error('Error saving preset:', error);
        return NextResponse.json({ error: 'Failed to save preset' }, { status: 500 });
    }
}

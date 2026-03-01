import { NextRequest, NextResponse } from 'next/server';
import { StorageService } from '@/services/storage';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        if (!file.name.endsWith('.jsonl')) {
            return NextResponse.json({ error: 'Only .jsonl files are allowed' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const saved = await StorageService.saveDataset(file.name, buffer);

        return NextResponse.json({ success: true, dataset: saved });
    } catch (error: unknown) {
        console.error('Error uploading dataset:', error);
        return NextResponse.json({ error: 'Failed to upload dataset' }, { status: 500 });
    }
}

import { NextResponse } from 'next/server';
import { StorageService } from '@/services/storage';

export async function GET() {
    try {
        const config = await StorageService.getConfig();
        return NextResponse.json({ config });
    } catch (error: unknown) {
        console.error('Error fetching config:', error);
        return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const config = await request.json();
        await StorageService.saveConfig(config);
        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error('Error saving config:', error);
        return NextResponse.json({ error: 'Failed to save config' }, { status: 500 });
    }
}

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
import { Storage } from '@google-cloud/storage';
import { Firestore, FieldValue } from '@google-cloud/firestore';

/**
 * Manual ingestion script to move the local bench JSONL file to Google Cloud Storage.
 */

const LOCAL_FILE_PATH = path.join(process.cwd(), 'public', 'uploads', 'datasets', '1772316562635-full_bench_raw.jsonl');
const BUCKET_NAME = process.env.GOOGLE_CLOUD_STORAGE_BUCKET;
const PROJECT_ID = process.env.FIRESTORE_PROJECT_ID;
const DATABASE_ID = process.env.FIRESTORE_DATABASE_ID || '(default)';

async function ingest() {
    console.log('--- Starting Dataset Ingestion ---');

    if (!fs.existsSync(LOCAL_FILE_PATH)) {
        console.error(`Local file not found: ${LOCAL_FILE_PATH}`);
        process.exit(1);
    }

    if (!BUCKET_NAME) {
        console.error('GOOGLE_CLOUD_STORAGE_BUCKET not defined');
        process.exit(1);
    }

    const storage = new Storage();
    const bucket = storage.bucket(BUCKET_NAME);
    const filename = path.basename(LOCAL_FILE_PATH);
    const file = bucket.file(`datasets/${filename}`);

    // 1. Upload to GCS
    console.log(`Uploading ${filename} to gs://${BUCKET_NAME}/datasets/${filename}...`);
    const buffer = fs.readFileSync(LOCAL_FILE_PATH);
    await file.save(buffer, {
        resumable: false,
        contentType: 'application/x-jsonlines',
    });
    console.log('Upload successful.');

    // 2. Count records
    const content = buffer.toString('utf-8');
    const lines = content.split('\n').filter(line => line.trim().length > 0);
    const recordCount = lines.length;
    console.log(`Record count: ${recordCount}`);

    // 3. Register in Firestore
    const firestore = new Firestore({
        projectId: PROJECT_ID,
        databaseId: DATABASE_ID === '(default)' ? undefined : DATABASE_ID
    });

    const docRef = firestore.collection('datasets').doc(filename);
    console.log(`Registering metadata in Firestore collection 'datasets'...`);

    await docRef.set({
        id: filename,
        name: filename.replace(/^\d+-/, ''),
        createdAt: new Date().toISOString(),
        url: `gs://${BUCKET_NAME}/datasets/${filename}`,
        recordCount: recordCount,
        updated_at: FieldValue.serverTimestamp()
    });

    console.log('Ingestion complete! Dataset is now available in GCS and Firestore.');
}

ingest().catch(err => {
    console.error('Ingestion failed:', err);
    process.exit(1);
});

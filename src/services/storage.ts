import fs from 'fs';
import path from 'path';
import { Storage } from '@google-cloud/storage';
import { getFirestore } from '@/lib/firebase-admin';

/**
 * StorageService handles persistence for datasets and configuration.
 * It uses Google Cloud Storage for large files (.jsonl) and 
 * Firestore for metadata and configuration.
 */

const BUCKET_NAME = process.env.GOOGLE_CLOUD_STORAGE_BUCKET;
const COLLECTION_DATASETS = 'datasets';
const SAMPLES_DIR = path.join(process.cwd(), 'public', 'uploads', 'samples');

// Ensure samples directory exists (for any remaining local file needs)
if (!fs.existsSync(SAMPLES_DIR)) {
    fs.mkdirSync(SAMPLES_DIR, { recursive: true });
}

function getStorage() {
    return new Storage();
}

export interface DatasetMetadata {
    id: string;
    name: string;
    createdAt: string;
    url: string;
    recordCount: number;
}

export class StorageService {
    /**
     * Saves a dataset to Google Cloud Storage and registers metadata in Firestore.
     */
    static async saveDataset(filename: string, buffer: Buffer): Promise<{ url: string, filename: string }> {
        if (!BUCKET_NAME) throw new Error("GOOGLE_CLOUD_STORAGE_BUCKET not configured");

        const storage = getStorage();
        const bucket = storage.bucket(BUCKET_NAME);
        const safeFilename = filename.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        const finalFilename = `${Date.now()}-${safeFilename}`;
        const file = bucket.file(`datasets/${finalFilename}`);

        // 1. Upload to GCS
        await file.save(buffer, {
            resumable: false,
            contentType: 'application/x-jsonlines',
        });

        // 2. Count records for metadata
        const content = buffer.toString('utf-8');
        const lines = content.split('\n').filter(line => line.trim().length > 0);
        const recordCount = lines.length;

        // 3. Save metadata to Firestore
        const firestore = getFirestore();
        const docRef = firestore.collection(COLLECTION_DATASETS).doc(finalFilename);

        const metadata: DatasetMetadata = {
            id: finalFilename,
            name: filename.replace(/^\d+-/, ''),
            createdAt: new Date().toISOString(),
            url: `gs://${BUCKET_NAME}/datasets/${finalFilename}`,
            recordCount: recordCount
        };

        await docRef.set({
            ...metadata,
            updated_at: new Date()
        });

        return {
            url: metadata.url,
            filename: finalFilename,
        };
    }

    /**
     * Retrieves a list of available datasets from Firestore.
     */
    static async getDatasets(): Promise<DatasetMetadata[]> {
        try {
            const firestore = getFirestore();
            const snapshot = await firestore.collection(COLLECTION_DATASETS)
                .orderBy('createdAt', 'desc')
                .get();

            return snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    name: data.name,
                    createdAt: data.createdAt,
                    url: data.url,
                    recordCount: data.recordCount
                } as DatasetMetadata;
            });
        } catch (e) {
            console.error('Error fetching datasets from Firestore:', e);
            return [];
        }
    }

    /**
     * Retrieves the raw content of a given dataset from Google Cloud Storage.
     */
    static async getDatasetContent(datasetId: string): Promise<string> {
        if (!BUCKET_NAME) throw new Error("GOOGLE_CLOUD_STORAGE_BUCKET not configured");

        const storage = getStorage();
        const file = storage.bucket(BUCKET_NAME).file(`datasets/${datasetId}`);

        if (!(await file.exists())[0]) {
            throw new Error(`Dataset ${datasetId} not found in GCS`);
        }

        const [content] = await file.download();
        return content.toString('utf-8');
    }

    /**
     * Persists a generated sample to Google Cloud Storage.
     */
    static async saveSample(datasetId: string, accuracy: string, sampleData: Record<string, unknown>): Promise<void> {
        if (!BUCKET_NAME) throw new Error("GOOGLE_CLOUD_STORAGE_BUCKET not configured");

        const storage = getStorage();
        const sampleId = `${datasetId.replace('.jsonl', '')}-${accuracy.toLowerCase()}.json`;
        const file = storage.bucket(BUCKET_NAME).file(`samples/${sampleId}`);

        await file.save(JSON.stringify(sampleData, null, 2), {
            resumable: false,
            contentType: 'application/json',
        });
    }

    /**
     * Retrieves an existing sample from Google Cloud Storage.
     */
    static async getSample(datasetId: string, accuracy: string): Promise<Record<string, unknown> | null> {
        if (!BUCKET_NAME) throw new Error("GOOGLE_CLOUD_STORAGE_BUCKET not configured");

        const storage = getStorage();
        const sampleId = `${datasetId.replace('.jsonl', '')}-${accuracy.toLowerCase()}.json`;
        const file = storage.bucket(BUCKET_NAME).file(`samples/${sampleId}`);

        try {
            if (!(await file.exists())[0]) {
                return null;
            }

            const [content] = await file.download();
            return JSON.parse(content.toString('utf-8'));
        } catch (e) {
            console.error('Error fetching sample from GCS:', e);
            return null;
        }
    }

    /**
     * Persists the inferomics configuration.
     * Deprecated: Use the Firestore objective route instead.
     */
    static async saveConfig(config: Record<string, unknown>): Promise<void> {
        const filePath = path.join(SAMPLES_DIR, 'inferomics-config.json');
        fs.writeFileSync(filePath, JSON.stringify({ ...config, updatedAt: new Date().toISOString() }, null, 2));
    }

    /**
     * Retrieves the persisted configuration.
     * Deprecated: Use the Firestore objective route instead.
     */
    static async getConfig(): Promise<Record<string, unknown> | null> {
        const filePath = path.join(SAMPLES_DIR, 'inferomics-config.json');
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf-8');
            return JSON.parse(content);
        }
        return null;
    }

}

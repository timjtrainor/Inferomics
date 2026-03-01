import fs from 'fs';
import path from 'path';

// This is a minimal abstraction that writes `.jsonl` datasets to the local filesystem
// mimicking Google Cloud Storage since GCP Cloud Storage isn't configured in this POC.
// We use public/uploads/datasets so it can be served or read easily.

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'datasets');
const SAMPLES_DIR = path.join(process.cwd(), 'public', 'uploads', 'samples');

// Ensure directories exist
[UPLOAD_DIR, SAMPLES_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

export class StorageService {
    /**
     * Saves a file buffer to the underlying storage mechanism.
     */
    static async saveDataset(filename: string, buffer: Buffer): Promise<{ url: string, filename: string }> {
        const safeFilename = filename.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        const finalFilename = `${Date.now()}-${safeFilename}`;
        const filePath = path.join(UPLOAD_DIR, finalFilename);

        // Write file locally
        fs.writeFileSync(filePath, buffer);

        // Mock response that would come from a real Cloud Storage bucket
        return {
            url: `/uploads/datasets/${finalFilename}`,
            filename: finalFilename,
        };
    }

    /**
     * Retrieves a list of available datasets.
     */
    static async getDatasets(): Promise<Array<{ id: string, name: string, createdAt: string, url: string, recordCount: number }>> {
        try {
            const files = fs.readdirSync(UPLOAD_DIR);
            return files
                .filter(f => f.endsWith('.jsonl'))
                .map(file => {
                    const filePath = path.join(UPLOAD_DIR, file);
                    const stats = fs.statSync(filePath);
                    const content = fs.readFileSync(filePath, 'utf-8');
                    const lines = content.split('\n').filter(line => line.trim().length > 0);

                    return {
                        id: file,
                        name: file.replace(/^\d+-/, ''), // remove timestamp for display
                        createdAt: stats.birthtime.toISOString(),
                        url: `/uploads/datasets/${file}`,
                        recordCount: lines.length
                    };
                })
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        } catch (e) {
            console.error(e);
            return [];
        }
    }

    /**
     * Retrieves the raw content of a given dataset by ID (filename).
     */
    static async getDatasetContent(datasetId: string): Promise<string> {
        const filePath = path.join(UPLOAD_DIR, datasetId);
        if (!fs.existsSync(filePath)) {
            throw new Error("Dataset not found");
        }
        return fs.readFileSync(filePath, 'utf-8');
    }

    /**
     * Persists a generated sample to disk.
     */
    static async saveSample(datasetId: string, accuracy: string, sampleData: Record<string, unknown>): Promise<void> {
        const sampleId = `${datasetId.replace('.jsonl', '')}-${accuracy.toLowerCase()}.json`;
        const filePath = path.join(SAMPLES_DIR, sampleId);
        fs.writeFileSync(filePath, JSON.stringify(sampleData, null, 2));
    }

    /**
     * Retrieves an existing sample from disk if it exists.
     */
    static async getSample(datasetId: string, accuracy: string): Promise<Record<string, unknown> | null> {
        const sampleId = `${datasetId.replace('.jsonl', '')}-${accuracy.toLowerCase()}.json`;
        const filePath = path.join(SAMPLES_DIR, sampleId);
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf-8');
            return JSON.parse(content);
        }
        return null;
    }

    /**
     * Persists the inferomics configuration to disk.
     */
    static async saveConfig(config: Record<string, unknown>): Promise<void> {
        const filePath = path.join(SAMPLES_DIR, 'inferomics-config.json');
        fs.writeFileSync(filePath, JSON.stringify({ ...config, updatedAt: new Date().toISOString() }, null, 2));
    }

    /**
     * Retrieves the persisted inferomics configuration.
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

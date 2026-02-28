import fs from 'fs';
import path from 'path';

// This is a minimal abstraction that writes `.jsonl` datasets to the local filesystem
// mimicking Google Cloud Storage since GCP Cloud Storage isn't configured in this POC.
// We use public/uploads/datasets so it can be served or read easily.

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'datasets');

// Ensure the directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

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
    static async getDatasets(): Promise<Array<{ id: string, name: string, createdAt: string, url: string }>> {
        try {
            const files = fs.readdirSync(UPLOAD_DIR);
            return files
                .filter(f => f.endsWith('.jsonl'))
                .map(file => {
                    const stats = fs.statSync(path.join(UPLOAD_DIR, file));
                    return {
                        id: file,
                        name: file.replace(/^\d+-/, ''), // remove timestamp for display
                        createdAt: stats.birthtime.toISOString(),
                        url: `/uploads/datasets/${file}`,
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
}

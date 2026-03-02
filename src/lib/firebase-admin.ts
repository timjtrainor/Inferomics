import { Firestore, FieldValue } from '@google-cloud/firestore';

export { FieldValue };

/**
 * Singleton factory for Firestore.
 * Prevents multiple connections during development HMR.
 */
function getFirestoreInstance(): Firestore {
    const projectId = process.env.FIRESTORE_PROJECT_ID;
    const databaseId = process.env.FIRESTORE_DATABASE_ID || '(default)';

    if (!projectId) {
        throw new Error('FIRESTORE_PROJECT_ID is not defined in environment variables');
    }

    try {
        // Auth is handled by GOOGLE_APPLICATION_CREDENTIALS in .env.local
        return new Firestore({
            projectId,
            databaseId: databaseId === '(default)' ? undefined : databaseId,
        });
    } catch (error) {
        console.error('Failed to create Firestore instance:', error);
        throw error;
    }
}

// Global variable support for Next.js dev server hot-reloading
const globalWithFirestore = globalThis as unknown as {
    firestore: Firestore | undefined;
};

export const getFirestore = (): Firestore => {
    if (!globalWithFirestore.firestore) {
        globalWithFirestore.firestore = getFirestoreInstance();
    }
    return globalWithFirestore.firestore;
};

import { NextRequest, NextResponse } from 'next/server';
import { Storage } from '@google-cloud/storage';
import { getFirestore } from '@/lib/firebase-admin';
import OpenAI from 'openai';

const BUCKET_NAME = process.env.GOOGLE_CLOUD_STORAGE_BUCKET || 'inferomics-c01tx-datastore';
const NEBIUS_API_KEY = process.env.NEBIUS_API_KEY;
const NEBIUS_BASE_URL = 'https://api.tokenfactory.nebius.com/v1/';

// Hardcoded mappings removed - now using dynamic data from /api/models

/**
 * Baseline Discovery Engine Route
 * POST /api/inferomics/run
 * Body: { objectiveId: string, runId: string, selectedModels: string[], datasetId?: string, accuracy?: string }
 */
export async function POST(request: NextRequest) {
    if (!NEBIUS_API_KEY) {
        return NextResponse.json({ error: 'NEBIUS_API_KEY not configured' }, { status: 500 });
    }

    try {
        const { objectiveId, runId, selectedModels, datasetId, accuracy } = await request.json();

        if (!objectiveId || !runId || !selectedModels || !Array.isArray(selectedModels)) {
            return NextResponse.json({ error: 'Missing required fields: objectiveId, runId, selectedModels' }, { status: 400 });
        }

        const firestore = getFirestore();
        const objDoc = await firestore.collection('objectives').doc(objectiveId).get();
        if (!objDoc.exists) {
            return NextResponse.json({ error: `Objective ${objectiveId} not found` }, { status: 404 });
        }

        const effectiveDatasetId = datasetId || objDoc.data()?.selected_dataset_id;
        const effectiveAccuracy = accuracy || objDoc.data()?.accuracy || 'Standard';

        if (!effectiveDatasetId) {
            return NextResponse.json({ error: 'Dataset ID not determined' }, { status: 400 });
        }

        const runRef = firestore.collection('objectives').doc(objectiveId).collection('runs').doc(runId);

        // 1. GCS Ingestion - Dynamic Path
        const storage = new Storage();
        const bucket = storage.bucket(BUCKET_NAME);

        // Match StorageService.saveSample naming: samples/${datasetId.replace('.jsonl', '')}-${accuracy.toLowerCase()}.json
        // Match StorageService.saveSample naming: samples/${datasetId.replace('.jsonl', '')}-${accuracy.toLowerCase()}.json
        const sampleFileName = `samples/${effectiveDatasetId.replace('.jsonl', '')}-${effectiveAccuracy.toLowerCase()}.json`;
        const file = bucket.file(sampleFileName);

        const [exists] = await file.exists();
        if (!exists) {
            return NextResponse.json({ error: `Sample file ${sampleFileName} not found in GCS` }, { status: 404 });
        }

        const [content] = await file.download();
        const data = JSON.parse(content.toString('utf-8'));
        const samples = data.sample || [];

        // 1.5 Fetch Dynamic Pricing for selected models
        // We call our own internal API or just fetch from Nebius directly here
        const modelsRes = await fetch(`${request.nextUrl.origin}/api/models`);
        const modelsData = await modelsRes.json();
        const availableModels: { id: string, name: string, priceIn?: number, priceOut?: number }[] = modelsData.models || [];

        // 2. Initialize OpenAI (Nebius compliant)
        const client = new OpenAI({
            apiKey: NEBIUS_API_KEY,
            baseURL: NEBIUS_BASE_URL,
        });

        // 3. Execution Loop
        const BATCH_SIZE = 10;
        const runMetrics: Record<string, Record<string, unknown>> = {};

        // Process each model
        for (const modelId of selectedModels) {
            const modelInfo = availableModels.find(m => m.id === modelId);
            const nebiusSlug = modelInfo?.id || modelId; // Fallback to ID if not found, but should be found

            let modelTotalLatency = 0;
            let modelTotalPromptTokens = 0;
            let modelTotalCompletionTokens = 0;
            let modelSuccessCount = 0;
            let processedCount = 0;

            // Process samples in batches
            for (let i = 0; i < samples.length; i += BATCH_SIZE) {
                const batch = samples.slice(i, i + BATCH_SIZE);

                const batchPromises = batch.map(async (item: Record<string, string>) => {
                    const startTime = Date.now();
                    try {
                        const completion = await client.chat.completions.create({
                            model: nebiusSlug,
                            messages: [
                                { role: 'system', content: objDoc.data()?.master_prompt || 'You are a helpful assistant.' },
                                { role: 'user', content: item.prompt }
                            ],
                            temperature: 0.1, // Lower temperature for more deterministic benchmark results
                            max_tokens: 512,
                        });

                        const latencyMs = Date.now() - startTime;
                        const output = completion.choices[0]?.message?.content || '';
                        const groundTruth = item.completion || '';

                        // Basic accuracy check: does the output contain the bracketed label?
                        const isCorrect = output.toLowerCase().includes(`[[${groundTruth.toLowerCase()}]]`);

                        // Prepare response document
                        const responseDoc = {
                            model_id: modelId,
                            nebius_slug: nebiusSlug,
                            input_text: item.prompt,
                            raw_output: output,
                            ground_truth: groundTruth,
                            latency_ms: latencyMs,
                            usage: completion.usage,
                            is_correct: isCorrect,
                            timestamp: new Date(),
                        };

                        // Aggregates
                        modelTotalLatency += latencyMs;
                        modelTotalPromptTokens += completion.usage?.prompt_tokens || 0;
                        modelTotalCompletionTokens += completion.usage?.completion_tokens || 0;
                        if (isCorrect) modelSuccessCount++;
                        processedCount++;

                        // Persist to Firestore: objectives/{id}/models/{model_id}/results/{responseId}
                        const responseId = `resp_${Date.now()}_${Math.random().toString(36).substring(7)}`;
                        const safeModelId = modelId.replace(/\//g, '_');

                        await firestore
                            .collection('objectives')
                            .doc(objectiveId)
                            .collection('models')
                            .doc(safeModelId)
                            .collection('results')
                            .doc(responseId)
                            .set({
                                ...responseDoc,
                                run_id: runId // Keep reference for batch grouping
                            });

                        return { success: true };
                    } catch (error) {
                        console.error(`Inference error for model ${nebiusSlug}:`, error);
                        return { success: false, error };
                    }
                });

                await Promise.all(batchPromises);
            }

            // Calculate Model-level aggregates using dynamic pricing
            const priceIn = (modelInfo?.priceIn || 0); // Already in $ per 1M
            const priceOut = (modelInfo?.priceOut || 0);
            const cost = ((modelTotalPromptTokens / 1000000) * priceIn) + ((modelTotalCompletionTokens / 1000000) * priceOut);
            const safeModelId = modelId.replace(/\//g, '_');

            const modelMetrics = {
                avg_latency: processedCount > 0 ? modelTotalLatency / processedCount : 0,
                total_prompt_tokens: modelTotalPromptTokens,
                total_completion_tokens: modelTotalCompletionTokens,
                accuracy: processedCount > 0 ? Math.round(modelSuccessCount / processedCount * 10000) / 100 : 0,
                total_cost: cost,
                processed_count: processedCount
            };

            runMetrics[modelId] = modelMetrics;

            // Write pre-calculated metrics to the model document for instant lookup
            await firestore
                .collection('objectives')
                .doc(objectiveId)
                .collection('models')
                .doc(safeModelId)
                .set({
                    id: modelId,
                    nebius_slug: modelInfo?.id || modelId,
                    cumulative_metrics: modelMetrics,
                    last_run_id: runId,
                    last_run_at: new Date(),
                    updated_at: new Date(),
                }, { merge: true });
        }

        // 4. Cleanup & Status Update
        await runRef.update({
            status: 'COMPLETE',
            metrics: runMetrics,
            updated_at: new Date(),
        });

        return NextResponse.json({ success: true, totalProcessed: samples.length * selectedModels.length });

    } catch (error: unknown) {
        console.error('Discovery Engine failure:', error);
        return NextResponse.json({ error: 'Discovery Engine failure', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
    }
}

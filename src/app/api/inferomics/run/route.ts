import { NextRequest, NextResponse } from 'next/server';
import { Storage } from '@google-cloud/storage';
import { getFirestore } from '@/lib/firebase-admin';
import OpenAI from 'openai';

const BUCKET_NAME = process.env.GOOGLE_CLOUD_STORAGE_BUCKET || 'inferomics-c01tx-datastore';
const NEBIUS_API_KEY = process.env.NEBIUS_API_KEY;
const NEBIUS_BASE_URL = 'https://api.tokenfactory.nebius.com/v1/';

// Hardcoded mappings removed - now using dynamic data from /api/models

interface StandardizedModel {
    id: string;
    name: string;
    provider: string;
    description: string;
    priceIn: number;
    priceOut: number;
    context_window: number;
    isFast: boolean;
    type: string;
}

interface EngineMetrics {
    accuracy: number;
    reliability: number;
    avg_latency: number;
    total_cost: number;
    tei: number;
    cost_per_1m: number;
    processed_count: number;
    ies?: number;
}

interface LoggedSample {
    raw: string;
    extracted: string;
    ground: string;
    match: 'Y' | 'N';
}

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
        const { models: fetchedModels } = await modelsRes.json() as { models: StandardizedModel[] };
        const availableModels = fetchedModels;

        // 2. Initialize OpenAI (Nebius compliant)
        const client = new OpenAI({
            apiKey: NEBIUS_API_KEY,
            baseURL: NEBIUS_BASE_URL,
        });

        // 3. Execution Loop
        const BATCH_SIZE = 10;
        const runMetrics: Record<string, EngineMetrics> = {};

        // Fetch economic levers from objective for TEI calculation
        const objData = objDoc.data() || {};
        const projectedVolume = objData.economic_levers?.volume || 10000;
        const errorRiskCost = objData.economic_levers?.error_cost || 25.0;

        // Process each model and collect raw metrics first for normalization
        const modelResults: Record<string, EngineMetrics> = {};

        for (const modelId of selectedModels) {
            const modelInfo = availableModels.find(m => m.id === modelId);
            const nebiusSlug = modelInfo?.id || modelId;

            let modelTotalLatency = 0;
            let modelTotalPromptTokens = 0;
            let modelTotalCompletionTokens = 0;
            let modelSuccessCount = 0;
            let modelReliabilityCount = 0;
            let processedCount = 0;
            const samplesLogged: LoggedSample[] = [];

            // Process samples in batches
            for (let i = 0; i < samples.length; i += BATCH_SIZE) {
                const batch = samples.slice(i, i + BATCH_SIZE);

                const batchPromises = batch.map(async (item: Record<string, string>) => {
                    const startTime = Date.now();
                    try {
                        const completion = await client.chat.completions.create({
                            model: nebiusSlug,
                            messages: [
                                { role: 'system', content: objData.master_prompt || 'You are a helpful assistant.' },
                                { role: 'user', content: item.prompt }
                            ],
                            temperature: 0.1,
                            max_tokens: 512,
                        });

                        const latencyMs = Date.now() - startTime;
                        const output = completion.choices[0]?.message?.content || '';
                        const groundTruth = item.completion || '';

                        // Reliability (The Format): Valid [[ ]] wrapping
                        const hasBrackets = output.includes('[[') && output.includes(']]');
                        if (hasBrackets) modelReliabilityCount++;

                        // Accuracy (The Signal): Normalized exact match
                        // Extract label inside brackets if present
                        let extractedLabel = output;
                        const bracketMatch = output.match(/\[\[(.*?)\]\]/);
                        if (bracketMatch) {
                            extractedLabel = bracketMatch[1].trim();
                        }
                        const isCorrect = extractedLabel.toLowerCase() === groundTruth.toLowerCase();
                        if (isCorrect) modelSuccessCount++;

                        // Sample logging (Requirement: 3 records)
                        if (samplesLogged.length < 3) {
                            samplesLogged.push({
                                raw: output.substring(0, 100) + (output.length > 100 ? '...' : ''),
                                extracted: extractedLabel,
                                ground: groundTruth,
                                match: isCorrect ? 'Y' : 'N'
                            });
                        }

                        // Aggregates
                        modelTotalLatency += latencyMs;
                        modelTotalPromptTokens += completion.usage?.prompt_tokens || 0;
                        modelTotalCompletionTokens += completion.usage?.completion_tokens || 0;
                        processedCount++;

                        // Persist to Firestore
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
                                model_id: modelId,
                                nebius_slug: nebiusSlug,
                                input_text: item.prompt,
                                raw_output: output,
                                ground_truth: groundTruth,
                                extracted_label: extractedLabel,
                                latency_ms: latencyMs,
                                usage: completion.usage,
                                is_correct: isCorrect,
                                is_reliable: hasBrackets,
                                run_id: runId,
                                timestamp: new Date(),
                            });

                        return { success: true };
                    } catch (error) {
                        console.error(`Inference error for model ${nebiusSlug}:`, error);
                        return { success: false, error };
                    }
                });

                await Promise.all(batchPromises);
            }

            // Print requirement logs to console
            console.log(`--- Sample Records for [${modelId}] ---`);
            samplesLogged.forEach((s, idx) => {
                console.log(`${idx + 1}. [Raw Output]: ${s.raw} -> [Extracted]: ${s.extracted} -> [Ground Truth]: ${s.ground} -> [Is Match: ${s.match}]`);
            });

            const priceIn = (modelInfo?.priceIn || 0);
            const priceOut = (modelInfo?.priceOut || 0);
            const totalTokenCost = ((modelTotalPromptTokens / 1000000) * priceIn) + ((modelTotalCompletionTokens / 1000000) * priceOut);

            const accuracy = processedCount > 0 ? (modelSuccessCount / processedCount) : 0;
            const reliability = processedCount > 0 ? (modelReliabilityCount / processedCount) : 0;
            const avgLatency = processedCount > 0 ? (modelTotalLatency / processedCount) : 0;

            // Total Economic Impact (TEI)
            // formula: (Total Token Cost) + ((1 - Accuracy) * Projected_Volume * Error_Risk_Cost)
            const tei = totalTokenCost + ((1 - accuracy) * projectedVolume * errorRiskCost);

            modelResults[modelId] = {
                accuracy: Math.round(accuracy * 10000) / 100, // as percentage
                reliability: Math.round(reliability * 10000) / 100, // as percentage
                avg_latency: Math.round(avgLatency),
                total_cost: totalTokenCost,
                tei: Math.round(tei * 100) / 100,
                cost_per_1m: Math.round(((totalTokenCost / (processedCount || 1)) * 1000000) * 100) / 100,
                processed_count: processedCount
            };
        }

        // 3.5 IES Normalization and Calculation
        const architectures = Object.values(modelResults);
        const maxLatency = Math.max(...architectures.map(m => m.avg_latency)) || 1;
        const maxCostPer1M = Math.max(...architectures.map(m => m.cost_per_1m)) || 0.01;

        for (const modelId in modelResults) {
            const m = modelResults[modelId];
            const nl = m.avg_latency / maxLatency;
            const nc = m.cost_per_1m / maxCostPer1M;

            // IES = ((Accuracy * 0.7) + (Reliability * 0.3)) / (Normalized_Latency + Normalized_Cost)
            // Note: nl + nc has range (usually) 0 to 2. We add small epsilon (0.001) to avoid div by zero.
            const numerator = ((m.accuracy / 100) * 0.7) + ((m.reliability / 100) * 0.3);
            const denominator = nl + nc + 0.001;
            const ies = numerator / denominator;

            m.ies = Math.round(ies * 100) / 100;
            runMetrics[modelId] = m;

            // Persist to model document
            const safeModelId = modelId.replace(/\//g, '_');
            await firestore
                .collection('objectives')
                .doc(objectiveId)
                .collection('models')
                .doc(safeModelId)
                .set({
                    id: modelId,
                    cumulative_metrics: m,
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

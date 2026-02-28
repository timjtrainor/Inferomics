import pandas as pd
import json
import os

# The 28 canonical GoEmotions labels
LABELS = [
    "admiration", "amusement", "anger", "annoyance", "approval", "caring", 
    "confusion", "curiosity", "desire", "disappointment", "disapproval", 
    "disgust", "embarrassment", "excitement", "fear", "gratitude", "grief", 
    "joy", "love", "nervousness", "optimism", "pride", "realization", 
    "relief", "remorse", "sadness", "surprise", "neutral"
]

def ingest_single_csv(input_file, output_file):
    if not os.path.exists(input_file):
        print(f"Error: {input_file} not found. Run the wget command first.")
        return

    # Load the entire CSV (approx 21k records for goemotions_1)
    df = pd.read_csv(input_file)
    
    jsonl_data = []

    for _, row in df.iterrows():
        # Identify the active emotion(s)
        active_emotions = [label for label in LABELS if row[label] == 1]
        
        # Skip records with no label (rare in this dataset)
        if not active_emotions:
            continue
            
        # If multi-labeled, we'll take the first one for the POC 'Ground Truth'
        primary_label = active_emotions[0]

        # Raw Nebius-compatible Instruction Format
        entry = {
            "prompt": row['text'],
            "completion": primary_label
        }
        jsonl_data.append(entry)

    # Save the full set to JSONL
    with open(output_file, 'w') as f:
        for entry in jsonl_data:
            f.write(json.dumps(entry) + '\n')
            
    print(f"✅ Ingestion Complete: {len(jsonl_data)} records saved to {output_file}.")

if __name__ == "__main__":
    # Pointing specifically to the first CSV download
    ingest_single_csv('data/full_dataset/goemotions_1.csv', 'data/full_dataset/full_bench_raw.jsonl')
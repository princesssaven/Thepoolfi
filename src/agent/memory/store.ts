import { Pinecone } from "@pinecone-database/pinecone";

import { lightweightEmbedding } from "@/agent/memory/embed";

export type MemoryRecord = {
  id: string;
  text: string;
  metadata: Record<string, string | number | boolean>;
  timestamp: string;
};

export interface MemoryStore {
  store(record: MemoryRecord): Promise<void>;
  search(query: string, topK: number): Promise<MemoryRecord[]>;
}

export class InMemoryStore implements MemoryStore {
  private readonly rows: MemoryRecord[] = [];

  async store(record: MemoryRecord): Promise<void> {
    this.rows.push(record);
    if (this.rows.length > 4000) this.rows.shift();
  }

  async search(query: string, topK: number): Promise<MemoryRecord[]> {
    const q = query.toLowerCase();
    return this.rows
      .map((row) => ({
        row,
        score:
          (row.text.toLowerCase().includes(q) ? 1 : 0) +
          (row.metadata.instruction?.toString().toLowerCase().includes(q) ? 0.5 : 0)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map((x) => x.row);
  }
}

export class PineconeStore implements MemoryStore {
  private readonly index;
  private readonly namespace;

  constructor(apiKey: string, indexName: string, namespace: string) {
    const client = new Pinecone({ apiKey });
    this.index = client.index(indexName);
    this.namespace = namespace;
  }

  async store(record: MemoryRecord): Promise<void> {
    const values = lightweightEmbedding(record.text);
    await this.index.namespace(this.namespace).upsert([
      {
        id: record.id,
        values,
        metadata: {
          ...record.metadata,
          text: record.text,
          timestamp: record.timestamp
        }
      }
    ]);
  }

  async search(query: string, topK: number): Promise<MemoryRecord[]> {
    const vector = lightweightEmbedding(query);
    const result = await this.index.namespace(this.namespace).query({
      vector,
      topK,
      includeMetadata: true
    });

    return (result.matches ?? []).map((match) => {
      const md = (match.metadata ?? {}) as Record<string, string | number | boolean>;
      return {
        id: match.id,
        text: String(md.text ?? ""),
        metadata: md,
        timestamp: String(md.timestamp ?? new Date().toISOString())
      };
    });
  }
}

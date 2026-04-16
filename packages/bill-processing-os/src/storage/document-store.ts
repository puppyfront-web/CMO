import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

async function writeJsonFile(filePath: string, value: unknown) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export interface DocumentSnapshots {
  raw: unknown;
  parsed: unknown;
  normalized: unknown;
  validation: unknown;
  artifacts?: Record<string, unknown>;
}

export interface DocumentStore {
  writeDocumentSnapshots(docId: string, snapshots: DocumentSnapshots): Promise<void>;
  writeDocumentArtifact(docId: string, artifactName: string, artifact: unknown): Promise<string>;
}

export function createDocumentStore(runDir: string): DocumentStore {
  const documentsDir = path.join(runDir, "documents");

  return {
    async writeDocumentSnapshots(docId, snapshots) {
      const docDir = path.join(documentsDir, docId);
      const artifactsDir = path.join(docDir, "artifacts");

      await mkdir(artifactsDir, { recursive: true });
      await writeJsonFile(path.join(docDir, "raw.json"), snapshots.raw);
      await writeJsonFile(path.join(docDir, "parsed.json"), snapshots.parsed);
      await writeJsonFile(path.join(docDir, "normalized.json"), snapshots.normalized);
      await writeJsonFile(path.join(docDir, "validation.json"), snapshots.validation);

      for (const [artifactName, artifact] of Object.entries(snapshots.artifacts ?? {})) {
        await writeJsonFile(path.join(artifactsDir, `${artifactName}.json`), artifact);
      }
    },

    async writeDocumentArtifact(docId, artifactName, artifact) {
      const artifactPath = path.join(documentsDir, docId, "artifacts", `${artifactName}.json`);
      await mkdir(path.dirname(artifactPath), { recursive: true });
      await writeJsonFile(artifactPath, artifact);
      return artifactPath;
    },
  };
}

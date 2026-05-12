import { Storage } from '@google-cloud/storage';
import fs from 'fs';
import path from 'path';

const GCS_BUCKET = process.env.GCS_BUCKET || 'applyiq-data-apply-iq-495519';
let storage: Storage | null = null;
let storageError: string | null = null;

function getStorage(): Storage {
  if (!storage) {
    try {
      const options: any = { projectId: 'apply-iq-495519' };

      // For Cloud Run, credentials are automatic via default service account
      // For local dev, check for GOOGLE_APPLICATION_CREDENTIALS env var
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        // Verify the credentials file exists and is readable
        try {
          fs.accessSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, fs.constants.R_OK);
        } catch {
          console.warn(`GOOGLE_APPLICATION_CREDENTIALS file not accessible: ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`);
        }
      }

      storage = new Storage(options);
    } catch (err) {
      storageError = String(err);
      console.error('Failed to initialize GCS storage:', err);
      throw err;
    }
  }
  return storage;
}

export async function readFromGCS(filePath: string): Promise<string | null> {
  try {
    const bucket = getStorage().bucket(GCS_BUCKET);
    const file = bucket.file(filePath);
    const [exists] = await file.exists();
    if (!exists) return null;
    const [content] = await file.download();
    return content.toString('utf8');
  } catch (err) {
    console.error(`Failed to read from GCS: ${filePath}`, err);
    return null;
  }
}

export async function listGCSProfiles(): Promise<string[]> {
  try {
    const bucket = getStorage().bucket(GCS_BUCKET);
    const [, , apiResponse] = await bucket.getFiles({ prefix: 'profiles/', delimiter: '/' }) as any;
    const prefixes: string[] = apiResponse?.prefixes ?? [];
    return prefixes
      .map((p: string) => p.replace(/^profiles\//, '').replace(/\/$/, ''))
      .filter(Boolean);
  } catch (err) {
    console.error('Failed to list GCS profiles:', err);
    return [];
  }
}

export async function writeToGCS(filePath: string, content: string): Promise<boolean> {
  try {
    const bucket = getStorage().bucket(GCS_BUCKET);
    const file = bucket.file(filePath);
    await file.save(content, { contentType: 'application/json' });
    return true;
  } catch (err) {
    console.error(`Failed to write to GCS: ${filePath}`, err);
    return false;
  }
}

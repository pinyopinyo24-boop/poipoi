// Local storage helpers - Manus Forge API dependency removed
// For local development, files are stored in memory or local filesystem
// For production, implement your own storage backend (e.g., AWS S3, Google Cloud Storage)

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  // Local implementation: store in memory or local filesystem
  // For production, replace with actual S3 or cloud storage implementation
  const key = relKey.replace(/^\/+/, "");
  
  console.warn("[Storage] storagePut called but not implemented for local auth. Key:", key);
  
  return { 
    key, 
    url: `/storage/${key}` 
  };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = relKey.replace(/^\/+/, "");
  return { 
    key, 
    url: `/storage/${key}` 
  };
}

export async function storageGetSignedUrl(relKey: string): Promise<string> {
  const key = relKey.replace(/^\/+/, "");
  return `/storage/${key}`;
}

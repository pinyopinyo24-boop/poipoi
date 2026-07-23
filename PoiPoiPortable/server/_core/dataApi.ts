/**
 * Data API - Manus Forge API dependency removed
 * For local development, this is a stub implementation
 * For production, implement your own data API backend or integrate with external APIs
 */

export type DataApiCallOptions = {
  query?: Record<string, unknown>;
  body?: Record<string, unknown>;
  pathParams?: Record<string, unknown>;
  formData?: Record<string, unknown>;
};

export async function callDataApi(
  apiId: string,
  options: DataApiCallOptions = {}
): Promise<unknown> {
  console.warn("[DataApi] callDataApi called but not implemented for local auth. API ID:", apiId);

  // Return a stub response for local development
  return {
    error: "Data API not configured in local mode",
    apiId,
  };
}

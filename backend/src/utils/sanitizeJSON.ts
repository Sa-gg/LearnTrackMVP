/**
 * Utility: safely extract JSON from a Gemini response that might be
 * wrapped in Markdown code fences (```json ... ``` or ``` ... ```).
 *
 * Steps:
 *   1. Trim leading/trailing whitespace.
 *   2. Strip optional ```json or ``` code fences.
 *   3. JSON.parse() the remaining text.
 *
 * Throws a descriptive Error if parsing fails.
 */
export function sanitizeAndParseJSON<T>(raw: string): T {
  let cleaned = raw.trim();

  // Strip leading ```json or ``` (with optional language tag)
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '');

  // Strip trailing ```
  cleaned = cleaned.replace(/\s*```$/i, '');

  cleaned = cleaned.trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to parse AI response as JSON: ${message}`);
  }
}

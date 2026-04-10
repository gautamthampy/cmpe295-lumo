/**
 * Server-side LLM routing for Story Studio API routes (Next.js).
 * Defaults to Gemini; set LLM_PROVIDER=ollama to force local Ollama.
 */

export type ServerLlmProviderName = "gemini" | "ollama";

export function getServerLlmProvider(): ServerLlmProviderName {
  const raw = (process.env.LLM_PROVIDER ?? "gemini").trim().toLowerCase();
  if (raw === "gemini") {
    return "gemini";
  }
  return "ollama";
}

export function getOllamaBaseUrl(): string {
  return (process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434").replace(/\/$/, "");
}

export function getOllamaModel(override?: string): string {
  return (override ?? process.env.OLLAMA_MODEL ?? "llama3.2").trim();
}

export async function ollamaGenerateText(opts: {
  prompt: string;
  system?: string;
  temperature?: number;
  model?: string;
}): Promise<string> {
  const base = getOllamaBaseUrl();
  const model = getOllamaModel(opts.model);
  const fullPrompt = opts.system ? `${opts.system}\n\n---\n\n${opts.prompt}` : opts.prompt;

  const response = await fetch(`${base}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      prompt: fullPrompt,
      stream: false,
      options: {
        temperature: opts.temperature ?? 0.2,
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Ollama HTTP ${response.status}: ${detail.slice(0, 500)}`);
  }

  const body = (await response.json()) as { response?: string };
  const text = (body.response ?? "").trim();
  if (!text) {
    throw new Error("Empty response from Ollama /api/generate");
  }
  return text;
}

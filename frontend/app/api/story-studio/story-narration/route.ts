import { NextResponse } from "next/server";
import { z } from "zod";

import {
  readJsonCache,
  withInFlightDedup,
  writeJsonCache,
} from "@/lib/story-studio/server/gemini-cache";
import { STORY_NARRATION_RESPONSE_SCHEMA } from "@/lib/story-studio/story-experience";

export const runtime = "nodejs";

const STORY_NARRATION_REQUEST_SCHEMA = z.object({
  transcript: z.string().min(1).max(1600),
  voiceStyle: z.string().min(1).max(180),
});

function pcmToWavDataUrl(
  pcmBase64: string,
  options: { channels?: number; sampleRate?: number; bitsPerSample?: number } = {}
): string {
  const channels = options.channels ?? 1;
  const sampleRate = options.sampleRate ?? 24000;
  const bitsPerSample = options.bitsPerSample ?? 16;
  const pcmBuffer = Buffer.from(pcmBase64, "base64");
  const header = Buffer.alloc(44);
  const byteRate = sampleRate * channels * (bitsPerSample / 8);
  const blockAlign = channels * (bitsPerSample / 8);

  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcmBuffer.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcmBuffer.length, 40);

  const wavBuffer = Buffer.concat([header, pcmBuffer]);
  return `data:audio/wav;base64,${wavBuffer.toString("base64")}`;
}

export async function POST(request: Request) {
  const parsedRequest = STORY_NARRATION_REQUEST_SCHEMA.safeParse(await request.json());
  if (!parsedRequest.success) {
    return NextResponse.json(
      {
        error: "Invalid story narration payload.",
        issues: parsedRequest.error.issues,
      },
      { status: 400 }
    );
  }

  const { transcript, voiceStyle } = parsedRequest.data;
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_TTS_MODEL ?? "gemini-2.5-flash-preview-tts";
  const voiceName = process.env.GEMINI_TTS_VOICE ?? "Puck";
  const cacheKey = JSON.stringify({
    version: "story-narration-v1",
    model,
    voiceName,
    transcript,
    voiceStyle,
  });

  const cached = await readJsonCache<unknown>("story-narrations", cacheKey);
  if (cached) {
    const parsedCached = STORY_NARRATION_RESPONSE_SCHEMA.safeParse(cached);
    if (parsedCached.success) {
      return NextResponse.json(parsedCached.data);
    }
  }

  const result = await withInFlightDedup("story-narrations", cacheKey, async () => {
    if (!apiKey) {
      return {
        transcript,
        audioDataUrl: null,
        provider: "browser-speech" as const,
        voiceName: null,
        warnings: ["Missing GEMINI_API_KEY for TTS. Falling back to browser speech."],
      };
    }

    const prompt = `Read this for a Grade 2 learner. ${voiceStyle} Transcript: ${transcript}`;
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "x-goog-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName,
                },
              },
            },
          },
        }),
      }
    );

    if (!response.ok) {
      return {
        transcript,
        audioDataUrl: null,
        provider: "browser-speech" as const,
        voiceName,
        warnings: [`TTS HTTP ${response.status}. Falling back to browser speech.`],
      };
    }

    const payload = (await response.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{
            inlineData?: { data?: string };
          }>;
        };
      }>;
    };
    const data = payload.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!data) {
      return {
        transcript,
        audioDataUrl: null,
        provider: "browser-speech" as const,
        voiceName,
        warnings: ["TTS returned no audio bytes. Falling back to browser speech."],
      };
    }

    const nextPayload = {
      transcript,
      audioDataUrl: pcmToWavDataUrl(data),
      provider: "gemini-tts" as const,
      voiceName,
      warnings: [],
    };
    await writeJsonCache("story-narrations", cacheKey, nextPayload);
    return nextPayload;
  });

  const parsedResult = STORY_NARRATION_RESPONSE_SCHEMA.safeParse(result);
  if (!parsedResult.success) {
    return NextResponse.json(
      {
        error: "Story narration response could not be validated.",
        issues: parsedResult.error.issues,
      },
      { status: 500 }
    );
  }

  return NextResponse.json(parsedResult.data);
}
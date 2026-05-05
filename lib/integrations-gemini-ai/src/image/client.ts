import { groq, GROQ_MODEL } from "../client";

export { groq };

export async function generateImage(
  prompt: string
): Promise<{ b64_json: string; mimeType: string }> {
  // Groq does not support image generation — return a placeholder so the
  // route doesn't crash. Replace with a real image service if needed.
  void prompt;
  void groq;
  void GROQ_MODEL;
  throw new Error("Image generation is not supported by the Groq API. Please configure a separate image generation service.");
}

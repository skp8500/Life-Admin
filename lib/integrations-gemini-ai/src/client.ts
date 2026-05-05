import OpenAI from "openai";

if (!process.env.GROQ_API_KEY) {
  throw new Error(
    "GROQ_API_KEY must be set. Did you forget to add your Groq API key?",
  );
}

export const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

export const GROQ_MODEL = "moonshotai/kimi-k2-instruct";

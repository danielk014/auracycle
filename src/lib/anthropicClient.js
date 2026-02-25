import Anthropic from "@anthropic-ai/sdk";

const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;

export const anthropicClient = apiKey
  ? new Anthropic({ apiKey, dangerouslyAllowBrowser: true })
  : null;

export const CLAUDE_MODEL = "claude-sonnet-4-5";

export async function invokeClaudeChat({ systemPrompt, messages }) {
  if (!anthropicClient) {
    throw new Error("VITE_ANTHROPIC_API_KEY is not set. Please add it to your .env file.");
  }

  const response = await anthropicClient.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1024,
    system: systemPrompt,
    messages: messages.map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    })),
  });

  return response.content[0].text;
}

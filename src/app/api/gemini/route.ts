import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const { prompt, system, json } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing GEMINI_API_KEY" }), { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const fullPrompt = system ? `${system}\n\n${prompt}` : prompt;
    const result = await model.generateContent(fullPrompt);
    const text = result.response.text();

    if (json) {
      // Extract JSON if wrapped in a code block
      const match = text.match(/```json[\s\S]*?```|\{[\s\S]*\}|\[[\s\S]*\]/);
      const raw = match ? match[0].replace(/^```json|```$/g, "").trim() : text;
      return new Response(raw, { headers: { "Content-Type": "application/json; charset=utf-8" } });
    }

    return new Response(text, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
  } catch (_err) {
    return new Response(JSON.stringify({ error: "Gemini request failed" }), { status: 500 });
  }
}

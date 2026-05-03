import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SYSTEM_PROMPT = `You are a creative content strategist for ML/AI and Mathematics.
Suggest EXACTLY 10 advanced, highly technical topics for Twitter/X posts about ML or Mathematics.

These should be:
- Deep technical topics that impress ML practitioners
- Cover cutting-edge research areas (transformers, diffusion, RL, optimization, etc.)
- Mathematical in nature (information theory, linear algebra, probability, etc.)
- Each under 12 words

Format your response as a numbered list (1-10), one topic per line. Nothing else.`;

function parseTopics(text: string): string[] {
  const topics: string[] = [];
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    if (topics.length >= 10) break;
    if (/^\d/.test(line)) {
      const parts = line.split(".");
      const topic = parts.length > 1 ? parts.slice(1).join(".").trim() : line;
      topics.push(topic);
    }
  }
  if (topics.length < 10) {
    return text.split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 10);
  }
  return topics;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("MINIMAX_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "MINIMAX_API_KEY not configured on server" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json().catch(() => ({}));
    const hint = typeof body?.hint === "string" ? body.hint.trim() : "";

    const userMessage = hint
      ? `Give me 10 advanced ML/Maths topics with this focus: ${hint}`
      : "Give me 10 advanced ML/Maths topics";

    const mmRes = await fetch("https://api.minimax.io/anthropic/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "MiniMax-M2.7",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!mmRes.ok) {
      const errText = await mmRes.text();
      return new Response(
        JSON.stringify({ error: "Upstream error", detail: errText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await mmRes.json();
    const blocks = Array.isArray(data?.content) ? data.content : [];
    const text = blocks
      .filter((b: { type?: string }) => b?.type === "text")
      .map((b: { text?: string }) => b.text ?? "")
      .join("\n");

    const topics = parseTopics(text);

    return new Response(
      JSON.stringify({ topics }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

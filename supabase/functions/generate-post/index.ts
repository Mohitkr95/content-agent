import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function buildSystem(topic: string): string {
  return `You are an expert at creating detailed, educational Twitter posts about ML and Mathematics.

Create a comprehensive post (200-250 words) about this topic: ${topic}

Requirements:
- Be deeply technical and educational with real mathematical content
- Include equations using standard notation (e.g., f(x), ∇, ∂, ∈, ⊂, ∑)
- Include 2-3 relevant hashtags at the end
- Be detailed enough that someone learns something concrete

IMPORTANT: Write 200-250 words with equations and technical depth. This is a detailed educational post!`;
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
    const topic = typeof body?.topic === "string" ? body.topic.trim() : "";
    if (!topic) {
      return new Response(
        JSON.stringify({ error: "Missing topic" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const mmRes = await fetch("https://api.minimax.io/anthropic/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "MiniMax-M2.7",
        max_tokens: 2048,
        system: buildSystem(topic),
        messages: [{ role: "user", content: `Write detailed post about: ${topic}` }],
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
    let text = blocks
      .filter((b: { type?: string }) => b?.type === "text")
      .map((b: { text?: string }) => b.text ?? "")
      .join("\n")
      .replace(/\*\*/g, "*")
      .replace(/—/g, "-")
      .replace(/–/g, "-");

    const wordCount = text.trim().split(/\s+/).filter(Boolean).length;

    return new Response(
      JSON.stringify({ content: text, word_count: wordCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

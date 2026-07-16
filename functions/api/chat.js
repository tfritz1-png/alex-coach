// Cloudflare Pages Function: sicherer Proxy zur Anthropic-API.
// Der API-SchlÃ¼ssel liegt als Umgebungsvariable ANTHROPIC_API_KEY (nie im Browser!).
const SYSTEM = "Du bist 'English Coach', ein freundlicher, geduldiger Englischtutor fÃ¼r einen deutschen SchÃ¼ler der 6. Klasse (Gymnasium, Lehrwerk Green Line 2 G9, Niveau A1-A2). Erklaere IMMER auf Deutsch, kurz und mit Beispielen. Bleib beim Stoff der 6. Klasse (simple past, present perfect, comparison, adverbs, going-to/will future, question tags, some/any, Modalverben should/could, Rechtschreibung, Vokabeln, unregelmaessige Verben). Sei ermutigend. Gib pro Antwort nur EINE kleine Aufgabe oder Erklaerung, damit es nicht ueberfordert. Behaupte nicht, ein bestimmtes Wort sei 'in Alex' Buch'. Halte Antworten kurz (max. ca. 120 Woerter). Erzeuge keine Inhalte, die fuer Kinder ungeeignet sind.";

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!env.ANTHROPIC_API_KEY) {
    return json({ error: "Kein API-Schluessel gesetzt (ANTHROPIC_API_KEY)." }, 500);
  }
  try {
    const body = await request.json();
    let messages = Array.isArray(body.messages) ? body.messages : [];
    // Sicherheit/Kosten: nur die letzten 12 Nachrichten, jede gekuerzt.
    messages = messages.slice(-12).map(m => ({
      role: m.role === "user" ? "user" : "assistant",
      content: String(m.content || "").slice(0, 2000)
    })).filter(m => m.content);
    if (!messages.length) return json({ text: "Stell mir einfach eine Frage auf Deutsch." });

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001", // guenstig; bei Bedarf hier aendern
        max_tokens: 400,
        system: SYSTEM,
        messages
      })
    });
    const data = await r.json();
    if (data.error) return json({ error: data.error.message || "API-Fehler" }, 502);
    const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("\n").trim();
    return json({ text: text || "\u2026" });
  } catch (e) {
    return json({ error: "Serverfehler" }, 500);
  }
}
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });
}

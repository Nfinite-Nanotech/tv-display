import process from "node:process";

export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.API_NINJAS_KEY;
  if (!apiKey) {
    return response.status(500).json({ error: "Quote service is not configured" });
  }

  try {
    const quoteResponse = await fetch("https://api.api-ninjas.com/v1/quotes", {
      headers: { "X-Api-Key": apiKey },
    });

    if (!quoteResponse.ok) {
      console.error(`API Ninjas quote request returned HTTP ${quoteResponse.status}`);
      return response.status(502).json({ error: "Quote service is unavailable" });
    }

    const [quote] = await quoteResponse.json();
    if (typeof quote?.quote !== "string" || !quote.quote.trim()) {
      console.error("API Ninjas quote response did not contain quote text");
      return response.status(502).json({ error: "Quote service returned an invalid response" });
    }

    return response.status(200).json({
      quote: quote.quote.trim(),
      author: typeof quote.author === "string" ? quote.author.trim() : "",
    });
  } catch (error) {
    console.error("API Ninjas quote request failed:", error);
    return response.status(502).json({ error: "Quote service is unavailable" });
  }
}

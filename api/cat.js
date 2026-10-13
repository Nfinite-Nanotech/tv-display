export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ error: "Method not allowed" });
  }

  try {
    const imageSearchUrl = new URL("https://api.thecatapi.com/v1/images/search");
    imageSearchUrl.searchParams.set("mime_types", "jpg,png");

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const catResponse = await fetch(imageSearchUrl);
      if (!catResponse.ok) {
        console.error(`Cat API returned HTTP ${catResponse.status}`);
        return response.status(502).json({ error: "Cat service is unavailable" });
      }

      const [catImage] = await catResponse.json();
      if (typeof catImage?.url !== "string" || !catImage.url.trim()) {
        console.error("Cat API response did not contain an image URL");
        return response.status(502).json({ error: "Cat service returned an invalid response" });
      }

      const imageUrl = new URL(catImage.url);
      if (
        imageUrl.protocol === "https:" &&
        /\.(jpe?g|png)$/i.test(imageUrl.pathname)
      ) {
        return response.status(200).json({
          id: catImage.id,
          url: imageUrl.href,
        });
      }
    }

    console.error("Cat API did not return a supported still-image format after three attempts");
    return response.status(502).json({ error: "No still cat photo is available right now" });
  } catch (error) {
    console.error("Cat API request failed:", error);
    return response.status(502).json({ error: "Cat service is unavailable" });
  }
}

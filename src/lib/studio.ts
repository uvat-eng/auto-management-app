const STUDIO_URL = "https://functions.poehali.dev/b5e84c2a-df32-4024-8f4c-db4921f706c2";

const SEEDS = [117879368, 55994449, 48672244, 65080068];

export const makeStudioPhoto = async (image: string, attempt = 0): Promise<string> => {
  const res = await fetch(STUDIO_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image, seed: SEEDS[attempt % SEEDS.length] }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.url) throw new Error(data.error || "Не удалось обработать фото");
  return data.url as string;
};

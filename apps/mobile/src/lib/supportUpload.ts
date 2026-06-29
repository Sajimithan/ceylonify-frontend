const API_BASE = (process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:3000/graphql').replace('/graphql', '');

export function fixSupportImageUrl(url?: string | null): string | null {
  if (!url) return null;
  return url.replace('http://localhost:3000', API_BASE);
}

export async function uploadSupportImages(
  images: { uri: string; name: string }[],
): Promise<string[]> {
  const uploadedUrls: string[] = [];
  for (const img of images) {
    const formData = new FormData();
    formData.append('file', { uri: img.uri, name: img.name, type: 'image/jpeg' } as any);
    const res = await fetch(`${API_BASE}/upload`, { method: 'POST', body: formData });
    if (res.ok) {
      const data = await res.json();
      uploadedUrls.push(`${API_BASE}${data.url}`);
    }
  }
  return uploadedUrls;
}

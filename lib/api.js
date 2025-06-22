const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') || '';

export async function fetchMenu() {
  const response = await fetch(`${apiBaseUrl}/api/menu`);
  if (!response.ok) throw new Error('Failed to fetch menu');
  return response.json();
}



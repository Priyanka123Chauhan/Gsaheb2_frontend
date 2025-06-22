// lib/api.ts

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') || '';

export const fetchMenu = async () => {
  const res = await fetch(`${apiBaseUrl}/api/menu`);
  if (!res.ok) throw new Error('Failed to fetch menu');
  return res.json();
};

export const placeNewOrder = async (table_id: number, items: any[]) => {
  const res = await fetch(`${apiBaseUrl}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ table_id, items }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to place order');
  return data;
};

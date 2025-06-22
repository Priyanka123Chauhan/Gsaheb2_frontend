// lib/api.js
const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') || '';

export const fetchMenu = async () => {
  const res = await fetch(`${apiUrl}/api/menu`);
  if (!res.ok) throw new Error('Failed to fetch menu');
  return res.json();
};

export const placeOrder = async (tableId, items) => {
  const res = await fetch(`${apiUrl}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ table_id: tableId, items }),
  });
  const data = await res.json();
  if (!res.ok || !data.id) throw new Error(data.error || 'Order failed');
  return data;
};

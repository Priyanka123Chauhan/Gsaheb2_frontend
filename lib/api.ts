const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') || '';

export async function fetchMenu() {
  const response = await fetch(`${apiBaseUrl}/api/menu`);
  if (!response.ok) throw new Error('Failed to fetch menu');
  return response.json();
}

export async function placeNewOrder(table_id, items) {
  const response = await fetch(`${apiBaseUrl}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ table_id, items }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to place order');
  return data;
}

export async function updateExistingOrder(orderId, items) {
  const response = await fetch(`${apiBaseUrl}/api/orders/${orderId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to update order');
  return data;
}

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') || '';

export async function fetchMenu() {
  const response = await fetch(`${apiBaseUrl}/api/menu`);
  if (!response.ok) throw new Error('Failed to fetch menu');
  return response.json();
}

export async function placeNewOrder(tableId, cartItems) {
  const response = await fetch(`${apiBaseUrl}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      table_id: tableId,
      items: cartItems,
      status: 'pending', // 👈 Add this line
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to place order');
  }

  return response.json();
}

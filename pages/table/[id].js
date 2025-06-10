import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import { supabase } from '../../lib/supabase';
import BottomCart from '../../components/BottomCart';
import { CakeIcon, ShoppingCartIcon } from '@heroicons/react/24/outline';

const fetcher = (url) => fetch(url).then(res => res.json());

export default function Table() {
  const router = useRouter();
  const { id } = router.query;
  const [cart, setCart] = useState([]);
  const [isAppending, setIsAppending] = useState(false);
  const [appendOrderId, setAppendOrderId] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [error, setError] = useState(null);
  const [addedItems, setAddedItems] = useState({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  // Check if user has an active pending order
  useEffect(() => {
    localStorage.removeItem('orderId');
    localStorage.removeItem('appendOrder');

    async function checkActiveOrder() {
      if (!id) return;
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('id, status')
          .eq('table_id', parseInt(id))
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(1);
        if (error) {
          console.error('Error checking orders:', error.message);
          throw error;
        }
        console.log('Pending orders found for table', id, ':', data);
        if (data.length > 0) {
          const order = data[0];
          console.log('Pending order found, redirecting to /order/', order.id);
          localStorage.setItem('orderId', order.id);
          router.replace(`/order/${order.id}`);
        } else {
          console.log('No pending orders found for table', id, ', allowing menu access');
        }
      } catch (err) {
        console.error('Error checking table orders:', err.message);
        setError('Failed to check active orders. Please try again.');
      }
    }
    checkActiveOrder();
  }, [id, router]);

  // Check for append order
  useEffect(() => {
    const appendOrder = localStorage.getItem('appendOrder');
    if (appendOrder) {
      const { orderId, items } = JSON.parse(appendOrder);
      setCart(items);
      setIsAppending(true);
      setAppendOrderId(orderId);
    }
  }, []);

  // Fetch menu items
  const apiUrl = process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, '');
  const { data: menu, error: fetchError, isLoading } = useSWR(`${apiUrl}/api/menu`, fetcher, { refreshInterval: 30000 });

  // Handle menu updates and errors
  useEffect(() => {
    if (fetchError) {
      setError('Failed to load menu. Please try again.');
    }
    if (menu && !isLoading) {
      setError('Menu updated!');
      setTimeout(() => setError(null), 3000);
    }
  }, [fetchError, menu, isLoading]);

  // Unique categories
  const categories = ['All', ...new Set(menu?.map(item => item.category).filter(Boolean))];

  // Filtered menu
  const filteredMenu = menu
    ? menu
        .filter(item => selectedCategory === 'All' || item.category === selectedCategory)
        .filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  // Add to cart
  const addToCart = (item) => {
    setAddedItems(prev => ({ ...prev, [item.id]: true }));
    setTimeout(() => {
      setAddedItems(prev => ({ ...prev, [item.id]: false }));
    }, 1000);
    setCart(prevCart => {
      const existingItem = prevCart.find(cartItem => cartItem.item_id === item.id);
      if (existingItem) {
        return prevCart.map(cartItem =>
          cartItem.item_id === item.id
            ? { ...cartItem, quantity: (cartItem.quantity || 1) + 1 }
            : cartItem
        );
      }
      return [
        ...prevCart,
        {
          item_id: item.id,
          name: item.name,
          price: item.price,
          category: item.category,
          image_url: item.image_url,
          quantity: 1,
        },
      ];
    });
    setIsCartOpen(true);
    console.log('Analytics - Item added:', { item_id: item.id, name: item.name, timestamp: new Date().toISOString() });
  };

  // Place new order
  const placeOrder = async () => {
    if (cart.length === 0) {
      setError('Cart is empty');
      setShowConfirm(false);
      return;
    }
    try {
      setError(null);
      console.log('PlaceOrder - API URL:', apiUrl);
      console.log('PlaceOrder - Payload:', JSON.stringify({ table_id: parseInt(id), items: cart }));
      const response = await fetch(`${apiUrl}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table_id: parseInt(id), items: cart }),
        signal: AbortSignal.timeout(30000),
      });
      console.log('PlaceOrder - Response status:', response.status);
      const order = await response.json();
      if (!response.ok || !order.id) {
        throw new Error(order.error || `HTTP ${response.status}`);
      }
      localStorage.setItem('orderId', order.id);
      setCart([]);
      setIsCartOpen(false);
      setShowConfirm(false);
      router.replace(`/order/${order.id}`);
    } catch (err) {
      console.error('PlaceOrder error:', err.message);
      setError(`Failed to place order: ${err.message}`);
      setShowConfirm(false);
    }
  };

  // Update existing order
  const updateOrder = async () => {
    if (cart.length === 0) {
      setError('Cart is empty');
      setShowConfirm(false);
      return;
    }
    try {
      setError(null);
      console.log('UpdateOrder - API URL:', `${apiUrl}/api/orders/${appendOrderId}`);
      console.log('UpdateOrder - Payload:', JSON.stringify({ items: cart }));
      const response = await fetch(`${apiUrl}/api/orders/${appendOrderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: cart }),
        signal: AbortSignal.timeout(30000),
      });
      console.log('UpdateOrder - Response status:', response.status);
      const order = await response.json();
      if (!response.ok || !order.id) {
        throw new Error(order.error || `HTTP ${response.status}`);
      }
      localStorage.removeItem('appendOrder');
      setIsAppending(false);
      setAppendOrderId(null);
      localStorage.setItem('orderId', order.id);
      setCart([]);
      setIsCartOpen(false);
      setShowConfirm(false);
      router.replace(`/order/${order.id}`);
    } catch (err) {
      console.error('UpdateOrder error:', err.message);
      setError(`Failed to update order: ${err.message}`);
      setShowConfirm(false);
    }
  };

  // Handle confirmation
  const handleConfirm = (action) => {
    setConfirmAction(() => action);
    setShowConfirm(true);
  };

  // Toggle cart visibility
  const toggleCart = () => {
    setIsCartOpen(prev => !prev);
  };

  return (
    <section className="min-h-screen bg-gray-50 p-4 relative">
      {/* Toast Notification */}
      {error && (
        <div
          className={`fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 flex items-center gap-2 animate-fade-in ${
            error.includes('updated') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}
          role="alert"
          aria-live="assertive"
        >
          <p>{error}</p>
          <button
            className="text-sm font-medium hover:underline"
            onClick={() => setError(null)}
            aria-label="Dismiss notification"
          >
            ✕
          </button>
        </div>
      )}

      {/* Confirmation Dialog */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" role="dialog" aria-modal="true">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              {isAppending ? 'Confirm Order Changes' : 'Confirm Order'}
            </h2>
            <p className="text-gray-700 mb-6">
              {isAppending
                ? `Save changes to order for Table ${id} with ${cart.length} items?`
                : `Place order for Table ${id} with ${cart.length} items for ₹${cart
                    .reduce((sum, item) => sum + item.price * (item.quantity || 1), 0)
                    .toFixed(2)}?`}
            </p>
            <div className="flex gap-4">
              <button
                className="flex-1 bg-gray-300 text-gray-800 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                onClick={() => setShowConfirm(false)}
                aria-label="Cancel order action"
              >
                Cancel
              </button>
              <button
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
                onClick={confirmAction}
                aria-label={isAppending ? 'Confirm save order changes' : 'Confirm place order'}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top-Right Cart Icon */}
      {cart.length > 0 && (
        <button
          className="fixed top-4 right-4 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 z-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 animate-pulse-once"
          onClick={toggleCart}
          aria-label={`Toggle cart with ${cart.reduce((sum, item) => sum + (item.quantity || 1), 0)} items`}
        >
          <ShoppingCartIcon className="h-7 w-7" />
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {cart.reduce((sum, item) => sum + (item.quantity || 1), 0)}
          </span>
        </button>
      )}

      {/* Welcome Message */}
      <header className="flex items-center justify-center gap-2 mb-6">
        <CakeIcon className="h-6 w-6 text-blue-500" aria-hidden="true" />
        <h1 className="text-2xl font-bold text-gray-800" aria-label="Welcome to Gsaheb Cafe">
          Welcome to Gsaheb Cafe
        </h1>
        <CakeIcon className="h-6 w-6 text-blue-500" aria-hidden="true" />
      </header>

      {/* Search Bar */}
      <div className="mb-6 max-w-2xl mx-auto">
        <label htmlFor="search-bar" className="block text-sm font-semibold text-gray-800 mb-2">
          Search Menu
        </label>
        <input
          type="text"
          id="search-bar"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full p-3 rounded-lg border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 bg-white text-gray-800 placeholder-gray-400 transition-all"
          placeholder="Search for menu items..."
          aria-describedby="search-bar-help"
        />
        <p id="search-bar-help" className="mt-1 text-xs text-gray-500">
          Type to filter menu items by name.
        </p>
      </div>

      {/* Category Filters */}
      <div className="mb-6 sticky top-4 z-10 bg-gray-50 pb-4 max-w-2xl mx-auto" role="tablist" aria-label="Menu categories">
        <div className="sm:hidden">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full p-3 rounded-lg border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 bg-white text-gray-800"
            aria-label="Select menu category"
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
        <div className="hidden sm:flex gap-2 flex-wrap">
          {categories.map(category => (
            <button
              key={category}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                selectedCategory === category
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              onClick={() => setSelectedCategory(category)}
              role="tab"
              aria-selected={selectedCategory === category}
              aria-controls="menu-items"
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Items Grid */}
      <div
        id="menu-items"
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-w-2xl mx-auto"
        role="region"
        aria-live="polite"
      >
        {isLoading ? (
          <div className="col-span-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white p-4 rounded-lg shadow-md">
                <div className="w-full h-32 bg-gray-200 rounded-md animate-pulse"></div>
                <div className="mt-2 h-6 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                <div className="mt-1 h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                <div className="mt-1 h-4 bg-gray-200 rounded w-1/3 animate-pulse"></div>
                <div className="mt-2 h-10 bg-gray-200 rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        ) : filteredMenu?.length === 0 ? (
          <p className="col-span-full text-center text-gray-500">No items found.</p>
        ) : (
          filteredMenu.map(item => (
            <article
              key={item.id}
              className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300"
            >
              <img
                src={item.image_url || 'https://images.unsplash.com/photo-1550547660-d9450f859349'}
                alt={item.name}
                className="w-full h-32 object-cover rounded-md mb-2"
              />
              <h2 className="font-semibold text-lg text-gray-800">{item.name}</h2>
              <p className="text-sm text-gray-500">{item.category}</p>
              <p className="text-sm font-medium text-gray-800">₹{item.price.toFixed(2)}</p>
              <button
                className={`mt-2 w-full py-2 rounded-lg text-white transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  addedItems[item.id]
                    ? 'bg-blue-500 hover:bg-blue-600'
                    : 'bg-green-500 hover:bg-green-600'
                }`}
                onClick={() => addToCart(item)}
                aria-label={addedItems[item.id] ? `${item.name} added to cart` : `Add ${item.name} to cart`}
              >
                <span className={addedItems[item.id] ? 'flex items-center justify-center gap-1' : ''}>
                  {addedItems[item.id] ? (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      Added
                    </>
                  ) : (
                    'Add to Cart'
                  )}
                </span>
              </button>
            </article>
          ))
        )}
      </div>

      {/* Bottom Cart */}
      <BottomCart
        cart={cart}
        setCart={setCart}
        onPlaceOrder={() => handleConfirm(isAppending ? updateOrder : placeOrder)}
        onClose={() => setIsCartOpen(false)}
        isOpen={isCartOpen}
      />

      {/* Custom Styles */}
      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-in-out;
        }
        @keyframes pulse-once {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
        .animate-pulse-once {
          animation: pulse-once 0.3s ease-in-out;
        }
        .animate-pulse {
          animation: pulse 1.5s infinite;
        }
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>
    </section>
  );
}
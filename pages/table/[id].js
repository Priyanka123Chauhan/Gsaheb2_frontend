import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import { supabase } from '../../lib/supabase';
import BottomCart from '../../components/BottomCart';
import { CakeIcon, ShoppingCartIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { fetchMenu, apiUrl } from '../../lib/api';

export default function Table() {
  const router = useRouter();
  const { id } = router.query;

  const [cart, setCart] = useState([]);
  const [isAppending, setIsAppending] = useState(false);
  const [appendOrderId, setAppendOrderId] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [error, setError] = useState(null);
  const [addedItems, setAddedItems] = useState({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [hasRedirected, setHasRedirected] = useState(false);

  const sliderRef = useRef(null);

  const [isAllowed, setIsAllowed] = useState(false);
  const [checking, setChecking] = useState(true);

  // Check IP-based access
  useEffect(() => {
    const checkAccess = async () => {
      try {
        const res = await fetch('https://api64.ipify.org?format=json');
        const data = await res.json();
        const ip = data.ip;
        const allowedPrefixes = ['2402:e280', '58.84'];
        const allowed = allowedPrefixes.some(prefix => ip?.startsWith(prefix));
        setIsAllowed(allowed);
      } catch (err) {
        console.error('IP check failed:', err);
      } finally {
        setChecking(false);
      }
    };
    checkAccess();
  }, []);

  // Menu fetch using SWR
  const { data: menu, error: fetchError } = useSWR(apiUrl ? `${apiUrl}/api/menu` : null, fetchMenu);

  const categories = ['All', ...new Set(menu?.map(item => item.category).filter(Boolean))];
  const filteredMenu = menu
    ? menu.filter(item => selectedCategory === 'All' || item.category === selectedCategory)
    : [];

  useEffect(() => {
    const el = sliderRef.current;
    const handleScroll = () => {
      if (el) el.scrollLeft > 0;
    };
    el?.addEventListener('scroll', handleScroll);
    return () => el?.removeEventListener('scroll', handleScroll);
  }, []);

  // 🧠 Only redirect once if an active order exists
  useEffect(() => {
    localStorage.removeItem('orderId');
    localStorage.removeItem('appendOrder');

    const checkActiveOrder = async () => {
      if (!id || hasRedirected) return;
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('id, status')
          .eq('table_id', parseInt(id))
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) throw error;

        if (data.length > 0) {
          const currentOrderId = data[0].id;
          if (!router.asPath.includes(`/order/${currentOrderId}`)) {
            localStorage.setItem('orderId', currentOrderId);
            setHasRedirected(true);
            router.replace(`/order/${currentOrderId}`);
          }
        }
      } catch (err) {
        setError('Failed to check active orders.');
      }
    };

    checkActiveOrder();
  }, [id, hasRedirected, router]);

  useEffect(() => {
    const appendOrder = localStorage.getItem('appendOrder');
    if (appendOrder) {
      const { orderId, items } = JSON.parse(appendOrder);
      setCart(items);
      setIsAppending(true);
      setAppendOrderId(orderId);
    }
  }, []);

  const addToCart = (item) => {
    const wasEmpty = cart.length === 0;
    setAddedItems(prev => ({ ...prev, [item.id]: true }));
    setTimeout(() => setAddedItems(prev => ({ ...prev, [item.id]: false })), 1000);

    setCart(prev => {
      const exists = prev.find(cartItem => cartItem.item_id === item.id);
      if (exists) {
        return prev.map(cartItem =>
          cartItem.item_id === item.id
            ? { ...cartItem, quantity: (cartItem.quantity || 1) + 1 }
            : cartItem
        );
      }
      return [...prev, { ...item, item_id: item.id, quantity: 1 }];
    });

    if (wasEmpty) {
      setIsCartOpen(true);
      setError('Item added to cart!');
      setTimeout(() => setError(null), 3000);
    }
  };

  const placeOrder = async () => {
    if (cart.length === 0) {
      setError('Your cart is empty.');
      setShowConfirm(false);
      return;
    }

    try {
      setError(null);
      const response = await fetch(`${apiUrl}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table_id: parseInt(id), items: cart }),
        signal: AbortSignal.timeout(30000),
      });

      const order = await response.json();
      if (!response.ok || !order.id) throw new Error(order.error || `HTTP ${response.status}`);

      localStorage.setItem('orderId', order.id);
      setCart([]);
      setIsCartOpen(false);
      setShowConfirm(false);
      router.replace(`/order/${order.id}`);
    } catch (err) {
      setError(`Failed to place order: ${err.message}`);
      setTimeout(() => setError(null), 5000);
    }
  };

  const updateOrder = async () => {
    if (cart.length === 0) {
      setError('Your cart is empty.');
      setShowConfirm(false);
      return;
    }

    try {
      setError(null);
      const response = await fetch(`${apiUrl}/api/orders/${appendOrderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: cart }),
        signal: AbortSignal.timeout(30000),
      });

      const order = await response.json();
      if (!response.ok || !order.id) throw new Error(order.error || `HTTP ${response.status}`);

      localStorage.removeItem('appendOrder');
      setIsAppending(false);
      setAppendOrderId(null);
      localStorage.setItem('orderId', order.id);
      setCart([]);
      setIsCartOpen(false);
      setShowConfirm(false);
      router.replace(`/order/${order.id}`);
    } catch (err) {
      setError(`Failed to update order: ${err.message}`);
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleConfirm = (action) => {
    setConfirmAction(() => action);
    setShowConfirm(true);
    setIsCartOpen(false);
  };

  const toggleCart = () => setIsCartOpen(prev => !prev);
  const scrollLeft = () => sliderRef.current?.scrollBy({ left: -100, behavior: 'smooth' });
  const scrollRight = () => sliderRef.current?.scrollBy({ left: 100, behavior: 'smooth' });

  return (
    <section className="min-h-screen bg-gray-50 p-4 relative">
      {checking ? (
        <div className="min-h-screen flex items-center justify-center">Checking Wi-Fi...</div>
      ) : !isAllowed ? (
        <div className="fixed inset-0 bg-white flex flex-col justify-center items-center">
          <h2 className="text-lg font-semibold mb-2">Access Restricted</h2>
          <p className="text-sm text-gray-600 mb-4">Please connect to the café’s Wi-Fi.</p>
          <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={() => window.location.reload()}>
            I’ve connected – Retry
          </button>
        </div>
      ) : (
        <>
          <header className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Welcome to Gsaheb Café</h1>
          </header>

          <div className="overflow-x-auto flex gap-2 mb-4" ref={sliderRef}>
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded ${selectedCategory === category ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
              >
                {category}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {filteredMenu?.map(item => (
              <div key={item.id} className="bg-white p-3 rounded shadow">
                <img src={item.image_url} alt={item.name} className="w-full h-24 object-cover rounded mb-2" />
                <h3 className="font-semibold">{item.name}</h3>
                <p className="text-sm text-gray-500">{item.category}</p>
                <p className="text-sm font-bold">₹{item.price.toFixed(2)}</p>
                <button
                  onClick={() => addToCart(item)}
                  className="w-full mt-2 bg-green-500 text-white py-1 rounded"
                >
                  Add to Cart
                </button>
              </div>
            ))}
          </div>

          <BottomCart
            cart={cart}
            setCart={setCart}
            onPlaceOrder={() => handleConfirm(isAppending ? updateOrder : placeOrder)}
            onClose={() => setIsCartOpen(false)}
            isOpen={isCartOpen}
          />
        </>
      )}

      {error && (
        <div className="fixed top-4 right-4 p-4 rounded shadow-lg bg-red-100 text-red-800 z-50">
          {error}
          <button className="ml-2 font-bold" onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-40">
          <div className="bg-white p-6 rounded shadow-md w-full max-w-sm">
            <h2 className="text-lg font-bold mb-4">Confirm Order</h2>
            <p>{isAppending ? 'Update this order?' : 'Place this order?'}</p>
            <div className="mt-4 flex gap-4">
              <button onClick={() => setShowConfirm(false)} className="flex-1 bg-gray-200 py-2 rounded">Cancel</button>
              <button onClick={confirmAction} className="flex-1 bg-blue-600 text-white py-2 rounded">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

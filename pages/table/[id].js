import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import { supabase } from '../../lib/supabase';
import BottomCart from '../../components/BottomCart';
import { CakeIcon, ShoppingCartIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { fetchMenu ,apiUrl } from '../../lib/api';


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
  const sliderRef = useRef(null);
  const [isAllowed, setIsAllowed] = useState(false);
  const [checking, setChecking] = useState(true);

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

  const { data: menu } = useSWR('menu', fetchMenu);

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
        if (error) throw error;
        if (data.length > 0) {
          localStorage.setItem('orderId', data[0].id);
          router.replace(`/order/${data[0].id}`);
        }
      } catch (err) {
        setError('Failed to check active orders.');
      }
    }

    checkActiveOrder();
  }, [id]);

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

  // Place new order
  const placeOrder = async () => {
    if (cart.length === 0) {
      setError('Your cart is empty. Add items to place an order.');
      setShowConfirm(false);
      setTimeout(() => setError(null), 5000);
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
      if (!response.ok || !order.id) {
        throw new Error(order.error || `HTTP ${response.status}`);
      }
      localStorage.setItem('orderId', order.id);
      setCart([]);
      setIsCartOpen(false);
      setShowConfirm(false);
      router.replace(`/order/${order.id}`);
    } catch (err) {
      setError(`Failed to place order: ${err.message}`);
      setShowConfirm(false);
      setTimeout(() => setError(null), 5000);
    }
  };

  // Update existing order
  const updateOrder = async () => {
    if (cart.length === 0) {
      setError('Your cart is empty. Add items to update the order.');
      setShowConfirm(false);
      setTimeout(() => setError(null), 5000);
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
      setError(`Failed to update order: ${err.message}`);
      setShowConfirm(false);
      setTimeout(() => setError(null), 5000);
    }
  };

  // Handle confirmation
  const handleConfirm = (action) => {
    setConfirmAction(() => action);
    setShowConfirm(true);
    setIsCartOpen(false);
  };

  // Toggle cart visibility
  const toggleCart = () => {
    setIsCartOpen(prev => !prev);
  };

  // Scroll slider
  const scrollLeft = () => {
    if (sliderRef) sliderRef.scrollBy({ left: -100, behavior: 'smooth' });
  };
  const scrollRight = () => {
    if (sliderRef) sliderRef.scrollBy({ left: 100, behavior: 'smooth' });
  };

  return (
    <section className="min-h-screen bg-gray-50 p-4 relative">
      {checking ? (
        <div className="min-h-screen flex items-center justify-center">Checking Wi-Fi...</div>
      ) : !isAllowed ? (
        <div className="fixed inset-0 bg-white flex flex-col justify-center items-center">
          <h2 className="text-lg font-semibold mb-2">Access Restricted</h2>
          <p className="text-sm text-gray-600 mb-4">Please connect to the café’s Wi-Fi.</p>
          <button onClick={() => window.location.reload()} className="bg-blue-600 text-white px-4 py-2 rounded">
            I’ve connected – Retry
          </button>
        </div>
      ) : (
        <>
          {/* Header */}
          <header className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Welcome to Gsaheb Café</h1>
          </header>

          {/* Category Filter */}
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

          {/* Menu Grid */}
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

          {/* Bottom Cart */}
          <BottomCart
            cart={cart}
            setCart={setCart}
            onPlaceOrder={() => handleConfirm(isAppending ? updateOrder : placeOrder)}
            onClose={() => setIsCartOpen(false)}
            isOpen={isCartOpen}
          />
        </>
      )}

      {/* Error Toast */}
      {error && (
        <div className="fixed top-4 right-4 p-4 rounded shadow-lg bg-red-100 text-red-800 z-50">
          {error}
          <button className="ml-2 font-bold" onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* Confirmation Modal */}
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

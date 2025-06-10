import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import { supabase } from '../../lib/supabase';
import BottomCart from '../../components/BottomCart';
import { CakeIcon, ShoppingCartIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

const fetcher = (url) => fetch(url).then(res => res.json());

export default function Table() {
  const router = useRouter();
  const { id } = router.query;
  const [cart, setCartItems] = useState([]);
  const [isAppending, setIsAppending] = useState(false);
  const [appendOrderId, setAppendOrderId] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isCartOpen, setIsOpenCartOpen] = useState(false);
  const [error, setErrorOpen] = useState(null);
  const [addedItems, setAddedItems] = useState({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [sliderRef, setSliderRef] = useState(null);
  const [isScrolled, setIsScrolled] = useState(false);

  // Check if user has an active pending order table
  useEffect(() => {
    localStorage.removeItem('orderId');
    localStorage.removeItem('appendOrder');
    async function checkActiveOrder() {
      if (!id) return;
      try {
        const { data, error } = await supabase
          .from('tableorders')
          .select('id, status')
          .eq('table_id', parseInt(id))
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(1);
        if (error) throw error;
        if (data.length > 0) {
          const orderId = data[0].id;
          localStorage.setItem('orderId', orderId);
          router.replace(`/order/${orderId}`);
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
  const { data: menu, error: fetchError } = useSWR(`${apiUrl}/api/menu`, fetcher);

  // Handle menu errors
  useEffect(() => {
    if (fetchError) {
      setError('Failed to load menu. Please try again.');
    }
  }, [fetchError]);

  // Track slider scroll
  useEffect(() => {
    const handleScroll = () => {
      if (sliderRef) {
        setIsScrolled(sliderRef.scrollLeft > 0);
      }
    };
    sliderRef?.addEventListener('scroll', handleScroll);
    return () => sliderRef?.removeEventListener('scroll', handleScroll);
  }, [sliderRef]);

  // Unique categories
  const categories = ['All', ...new Set(menu?.map(item => item.category).filter(Boolean))];

  // Filtered menu
  const filteredMenu = menu
    ? menu.filter(item => selectedCategory === 'All' || item.category === selectedCategory)
    : [];

  // Add to cart
  const addToCart = (item) => {
    const wasEmpty = cart.length === 0;
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
    if (wasEmpty) {
      setIsOpenCartOpen(true);
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
    setIsOpenCartOpen(prev => !prev);
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
      {/* Toast Notification */}
      {error && (
        <div
          className={`fixed top-4 right-4 p-4 rounded-lg shadow-lg z-[110] flex items-center gap-2 animate-fade-in ${
            error.includes('added') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-800 font-semibold'
          }`}
          role="alert"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]" role="dialog">
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
                onClick={() => {
                  setShowConfirm(false);
                  setIsCartOpen(true);
                }}
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
      <button
        className={`fixed top-4 right-4 text-white p-3 rounded-full shadow-lg z-[90] transition-colors ${
          cart.length > 0 ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-300 hover:bg-gray-400'
        }`}
        onClick={toggleCart}
        aria-label={`View cart with ${cart.reduce((sum, item) => sum + (item.quantity || 1), 0)} items`}
        title="View cart"
      >
        <ShoppingCartIcon className="h-6 w-6" />
        {cart.length > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {cart.reduce((sum, item) => sum + (item.quantity || 1), 0)}
          </span>
        )}
      </button>

      {/* Welcome Message */}
      <header className="flex items-center justify-center gap-2 mb-6">
        <CakeIcon className="h-6 w-6 text-blue-500" aria-hidden="true" />
        <h1 className="text-2xl font-bold text-gray-800">Welcome to Gsaheb Cafe</h1>
        <CakeIcon className="h-6 w-6 text-blue-500" aria-hidden="true" />
      </header>

      {/* Category Filters */}
      <div className="mb-6 relative max-w-2xl mx-auto">
        <div
          className={`flex overflow-x-auto space-x-2 pb-2 -mx-4 px-4 scrollbar-hide ${
            isScrolled ? 'bg-gradient-to-l from-gray-200 to-transparent' : 'bg-gradient-to-r from-transparent to-gray-200'
          }`}
          ref={setSliderRef}
          aria-label="Category slider"
        >
          {categories.map(category => (
            <button
              key={category}
              className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-semibold transition-transform duration-200 ${
                selectedCategory === category
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              } ${category === categories[0] ? 'animate-bounce-once' : ''}`}
              onClick={() => setSelectedCategory(category)}
              aria-selected={selectedCategory === category}
              style={{ transform: selectedCategory === category ? 'scale(1.05)' : 'scale(1)' }}
            >
              {category}
            </button>
          ))}
        </div>
        <button
          className="hidden sm:block absolute left-0 top-1/2 -translate-y-1/2 bg-gray-200 text-gray-700 p-2 rounded-full hover:bg-gray-300"
          onClick={scrollLeft}
          aria-label="Scroll categories left"
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </button>
        <button
          className="hidden sm:block absolute right-0 top-1/2 -translate-y-1/2 bg-gray-200 text-gray-700 p-2 rounded-full hover:bg-gray-300"
          onClick={scrollRight}
          aria-label="Scroll categories right"
        >
          <ChevronRightIcon className="h-5 w-5" />
        </button>
        <p className="text-xs text-gray-500 mt-1 text-center animate-fade-in" id="slider-hint">
          Scroll for more categories --&gt;&gt;
        </p>
      </div>

      {/* Menu Items Grid */}
      <div id="menu-items" className="grid grid-cols-2 gap-3 max-w-2xl mx-auto">
        {filteredMenu?.length === 0 ? (
          <p className="col-span-2 text-center text-gray-500">No items found.</p>
        ) : (
          filteredMenu.map(item => {
            const cartItem = cart.find(cartItem => cartItem.item_id === item.id);
            const quantity = cartItem ? cartItem.quantity || 1 : 0;
            return (
              <article
                key={item.id}
                className="bg-white p-3 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 flex flex-col justify-between min-h-[280px]"
              >
                <div>
                  <img
                    src={item.image_url || 'https://images.unsplash.com/photo-1550547660-d9450f859349'}
                    alt={item.name}
                    className="w-full h-28 object-cover rounded-md mb-2"
                  />
                  <h2
                    className="font-semibold text-base text-gray-800 line-clamp-2 mb-2"
                    title={item.name}
                  >
                    {item.name}
                  </h2>
                  <p className="text-sm text-gray-600 block mb-0.5">{item.category}</p>
                  <p className="text-sm font-medium text-gray-800">₹{item.price.toFixed(2)}</p>
                </div>
                <div className="relative mt-auto">
                  <button
                    className={`w-full py-2 rounded-lg text-white text-sm transition-all duration-300 ${
                      quantity > 0 ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-500 hover:bg-green-600'
                    }`}
                    onClick={() => addToCart(item)}
                    aria-label={quantity > 0 ? `${item.name} added to cart` : `Add ${item.name} to cart`}
                  >
                    <span className={quantity > 0 ? 'flex items-center justify-center gap-1' : ''}>
                      {quantity > 0 ? (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                          Added
                        </>
                      ) : (
                        'Add to Cart'
                      )}
                    </span>
                  </button>
                  {quantity > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      x{quantity}
                    </span>
                  )}
                </div>
              </article>
            );
          })
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
          animation: fade-in 0.5s ease-in-out;
          animation-fill-mode: forwards;
        }
        @keyframes bounce-once {
          0% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
          100% { transform: translateY(0); }
        }
        .animate-bounce-once {
          animation: bounce-once 0.5s ease-in-out;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
          -webkit-overflow-scrolling: touch;
        }
        #slider-hint {
          opacity: 1;
          transition: opacity 0.3s ease;
        }
        .scrollbar-hide:not(:hover) #slider-hint {
          opacity: ${isScrolled ? 0 : 1};
        }
      `}</style>
    </section>
  );
}
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

type Table = {
  id: string;
  table_number: number;
  capacity: number;
  is_active: boolean;
};

type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
};

type Cart = Record<string, number>;

export default function WaiterPage() {
  const supabase = createClient();

  const [tables, setTables] = useState<Table[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);

  const [cart, setCart] = useState<Cart>({});
  const [loading, setLoading] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [message, setMessage] = useState("");

  // Load tables and menu
  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setMessage("");

    // Get hotel
    const { data: hotel, error: hotelError } = await supabase
      .from("hotels")
      .select("id, name")
      .eq("slug", "dineflow-demo")
      .single();

    if (hotelError || !hotel) {
      setMessage("Hotel not found.");
      setLoading(false);
      return;
    }

    // Get tables
    const { data: tableData, error: tableError } = await supabase
      .from("restaurant_tables")
      .select("id, table_number, capacity, is_active")
      .eq("hotel_id", hotel.id)
      .eq("is_active", true)
      .order("table_number");

    if (tableError) {
      setMessage("Failed to load tables.");
      setLoading(false);
      return;
    }

    setTables(tableData || []);

    // Get categories
    const { data: categories, error: categoryError } = await supabase
      .from("menu_categories")
      .select("id, name")
      .eq("hotel_id", hotel.id)
      .eq("is_active", true);

    if (categoryError) {
      setMessage("Failed to load menu categories.");
      setLoading(false);
      return;
    }

    const categoryMap: Record<string, string> = {};

    (categories || []).forEach((category) => {
      categoryMap[category.id] = category.name;
    });

    // Get menu items
    const { data: items, error: menuError } = await supabase
      .from("menu_items")
      .select(
        "id, name, description, price, category_id"
      )
      .eq("hotel_id", hotel.id)
      .eq("is_available", true)
      .order("name");

    if (menuError) {
      setMessage("Failed to load menu.");
      setLoading(false);
      return;
    }

    const formattedItems: MenuItem[] = (items || []).map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      price: Number(item.price),
      category: categoryMap[item.category_id] || "Other",
    }));

    setMenuItems(formattedItems);
    setLoading(false);
  }

  function addToCart(itemId: string) {
    setCart((previous) => ({
      ...previous,
      [itemId]: (previous[itemId] || 0) + 1,
    }));
  }

  function removeFromCart(itemId: string) {
    setCart((previous) => {
      const updated = { ...previous };

      if (!updated[itemId]) {
        return updated;
      }

      if (updated[itemId] === 1) {
        delete updated[itemId];
      } else {
        updated[itemId] -= 1;
      }

      return updated;
    });
  }

  function clearCart() {
    setCart({});
  }

  const cartItems = menuItems.filter((item) => cart[item.id]);

  const subtotal = cartItems.reduce(
    (total, item) => total + item.price * cart[item.id],
    0
  );

  const totalItems = Object.values(cart).reduce(
    (total, quantity) => total + quantity,
    0
  );

  async function placeOrder() {
    if (!selectedTable) {
      setMessage("Please select a table first.");
      return;
    }

    if (cartItems.length === 0) {
      setMessage("Please add at least one item.");
      return;
    }

    setPlacingOrder(true);
    setMessage("");

    // Get hotel
    const { data: hotel, error: hotelError } = await supabase
      .from("hotels")
      .select("id, discount_enabled, discount_type, discount_value")
      .eq("slug", "dineflow-demo")
      .single();

    if (hotelError || !hotel) {
      setMessage("Hotel not found.");
      setPlacingOrder(false);
      return;
    }

    // Calculate discount
    let discountAmount = 0;

    if (hotel.discount_enabled) {
      if (hotel.discount_type === "percentage") {
        discountAmount =
          (subtotal * Number(hotel.discount_value)) / 100;
      } else if (hotel.discount_type === "fixed") {
        discountAmount = Number(hotel.discount_value);
      }
    }

    const items = cartItems.map((item) => ({
  menu_item_id: item.id,
  quantity: cart[item.id],
}));

const { data, error: orderError } = await supabase.rpc(
  "create_waiter_order",
  {
    p_table_id: selectedTable.id,
    p_items: items,
  }
);

if (orderError || !data || data.length === 0) {
  setMessage(
    `Failed to create order: ${
      orderError?.message || "Unknown database error"
    }`
  );

  setPlacingOrder(false);
  return;
}

const order = data[0];

setMessage(
  `Order #${order.created_order_number} created successfully!`
);

    clearCart();
    setPlacingOrder(false);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl font-semibold">
          Loading waiter dashboard...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">

        {/* HEADER */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Waiter Dashboard
          </h1>

          <p className="text-gray-500 mt-1">
            Select a table and place an order for the customer.
          </p>
        </div>

        {/* MESSAGE */}
        {message && (
          <div className="bg-green-100 border border-green-300 text-green-800 rounded-xl p-4 mb-6">
            {message}
          </div>
        )}

        {/* TABLE SECTION */}
        <section className="bg-white rounded-2xl shadow-sm p-6 mb-6">

          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-2xl font-bold">
                Select Table
              </h2>

              <p className="text-gray-500 text-sm mt-1">
                Choose the customer's table.
              </p>
            </div>

            {selectedTable && (
              <div className="bg-blue-100 text-blue-700 px-4 py-2 rounded-xl font-semibold">
                Table {selectedTable.table_number} selected
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">

            {tables.map((table) => (
              <button
                key={table.id}
                onClick={() => {
                  setSelectedTable(table);
                  clearCart();
                  setMessage("");
                }}
                className={`rounded-2xl p-5 border-2 transition ${
                  selectedTable?.id === table.id
                    ? "border-blue-600 bg-blue-50"
                    : "border-gray-200 bg-gray-50 hover:border-blue-400 hover:bg-blue-50"
                }`}
              >
                <div className="text-3xl mb-2">
                  🍽️
                </div>

                <div className="font-bold text-lg">
                  Table {table.table_number}
                </div>

                <div className="text-sm text-gray-500">
                  {table.capacity} seats
                </div>
              </button>
            ))}

          </div>
        </section>

        {/* MENU + CART */}
        {selectedTable && (
          <div className="grid lg:grid-cols-3 gap-6">

            {/* MENU */}
            <section className="lg:col-span-2 bg-white rounded-2xl shadow-sm p-6">

              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-2xl font-bold">
                    Menu
                  </h2>

                  <p className="text-gray-500 text-sm">
                    Add items for Table {selectedTable.table_number}
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">

                {menuItems.map((item) => (
                  <div
                    key={item.id}
                    className="border border-gray-200 rounded-2xl p-5"
                  >
                    <div className="flex justify-between gap-4">

                      <div>
                        <p className="text-xs font-semibold text-blue-600 uppercase">
                          {item.category}
                        </p>

                        <h3 className="text-lg font-bold mt-1">
                          {item.name}
                        </h3>

                        <p className="text-sm text-gray-500 mt-1">
                          {item.description ||
                            "Freshly prepared for you"}
                        </p>

                        <p className="font-bold text-lg mt-3">
                          ₹{item.price}
                        </p>
                      </div>

                      <button
                        onClick={() => addToCart(item.id)}
                        className="self-end bg-black text-white px-4 py-2 rounded-xl font-semibold hover:bg-gray-800"
                      >
                        + Add
                      </button>

                    </div>
                  </div>
                ))}

              </div>
            </section>

            {/* CART */}
            <aside className="bg-white rounded-2xl shadow-sm p-6 h-fit lg:sticky lg:top-6">

              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-2xl font-bold">
                    Order
                  </h2>

                  <p className="text-sm text-gray-500">
                    Table {selectedTable.table_number}
                  </p>
                </div>

                {totalItems > 0 && (
                  <span className="bg-black text-white px-3 py-1 rounded-full text-sm">
                    {totalItems} items
                  </span>
                )}
              </div>

              {cartItems.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <div className="text-4xl mb-3">
                    🛒
                  </div>

                  <p>
                    No items added yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">

                  {cartItems.map((item) => (
                    <div
                      key={item.id}
                      className="border-b border-gray-200 pb-4"
                    >

                      <div className="flex justify-between gap-3">

                        <div>
                          <h3 className="font-semibold">
                            {item.name}
                          </h3>

                          <p className="text-sm text-gray-500">
                            ₹{item.price} × {cart[item.id]}
                          </p>
                        </div>

                        <p className="font-bold">
                          ₹{item.price * cart[item.id]}
                        </p>

                      </div>

                      <div className="flex items-center gap-3 mt-3">

                        <button
                          onClick={() =>
                            removeFromCart(item.id)
                          }
                          className="w-8 h-8 rounded-lg bg-gray-200 font-bold"
                        >
                          −
                        </button>

                        <span className="font-semibold">
                          {cart[item.id]}
                        </span>

                        <button
                          onClick={() =>
                            addToCart(item.id)
                          }
                          className="w-8 h-8 rounded-lg bg-black text-white font-bold"
                        >
                          +
                        </button>

                      </div>

                    </div>
                  ))}

                  {/* TOTAL */}
                  <div className="pt-2">

                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal</span>
                      <span>₹{subtotal}</span>
                    </div>

                    <div className="flex justify-between font-bold text-xl mt-2">
                      <span>Total</span>
                      <span>₹{subtotal}</span>
                    </div>

                  </div>

                  <button
                    onClick={placeOrder}
                    disabled={placingOrder}
                    className="w-full bg-green-600 text-white py-3 rounded-xl font-bold text-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {placingOrder
                      ? "Placing Order..."
                      : "Place Order"}
                  </button>

                  <button
                    onClick={clearCart}
                    className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200"
                  >
                    Clear Order
                  </button>

                </div>
              )}

            </aside>

          </div>
        )}

      </div>
    </main>
  );
}
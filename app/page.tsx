"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
};

type Cart = Record<string, number>;

type Hotel = {
  id: string;
  name: string;
  discount_enabled: boolean;
  discount_type: "percentage" | "fixed";
  discount_value: number;
};

export default function Home() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [tableId, setTableId] = useState<string | null>(null);
  const [tableNumber, setTableNumber] = useState(12);

  const [cart, setCart] = useState<Cart>({});
  const [showCart, setShowCart] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderNumber, setOrderNumber] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ============================================
  // LOAD DATA FROM SUPABASE
  // ============================================

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const qrTable = params.get("table");

    const currentTableNumber = qrTable
      ? Number(qrTable)
      : 12;

    setTableNumber(currentTableNumber);

    async function loadRestaurant() {
      try {
        console.log("DineFlow: starting menu load...");

        const supabase = createClient();

        console.log("DineFlow: Supabase client created.");

        // Get demo hotel
        const { data: hotelData, error: hotelError } =
          await supabase
            .from("hotels")
            .select(
              "id, name, discount_enabled, discount_type, discount_value"
            )
            .eq("slug", "dineflow-demo")
            .single();

        console.log("Hotel result:", hotelData, hotelError);

        if (hotelError) {
          throw new Error(hotelError.message);
        }

        setHotel(hotelData);

        // Get table 12 for now
        const { data: tableData, error: tableError } =
          await supabase
            .from("restaurant_tables")
            .select("id, table_number")
            .eq("hotel_id", hotelData.id)
            .eq("table_number", currentTableNumber)
            .single();

        console.log("Table result:", tableData, tableError);

        if (tableError) {
          throw new Error(tableError.message);
        }

        setTableId(tableData.id);
        setTableNumber(tableData.table_number);

        // Get menu categories
        const {
          data: categoryData,
          error: categoryError,
        } = await supabase
          .from("menu_categories")
          .select("id, name")
          .eq("hotel_id", hotelData.id)
          .eq("is_active", true)
          .order("display_order");

        console.log(
          "Category result:",
          categoryData,
          categoryError
        );

        if (categoryError) {
          throw new Error(categoryError.message);
        }

        const categoryMap: Record<string, string> = {};

        categoryData?.forEach((category) => {
          categoryMap[category.id] = category.name;
        });

        // Get menu items
        const {
          data: menuData,
          error: menuError,
        } = await supabase
          .from("menu_items")
          .select(
            "id, name, description, price, category_id"
          )
          .eq("hotel_id", hotelData.id)
          .eq("is_available", true)
          .order("name");

        console.log(
          "Menu result:",
          menuData,
          menuError
        );

        if (menuError) {
          throw new Error(menuError.message);
        }

        const formattedMenu: MenuItem[] =
          (menuData || []).map((item) => ({
            id: item.id,
            name: item.name,
            description: item.description,
            price: Number(item.price),
            category:
              categoryMap[item.category_id] || "Menu",
          }));

        setMenuItems(formattedMenu);

        console.log(
          "DineFlow: menu loaded successfully."
        );
      } catch (err) {
        console.error(
          "DineFlow loading error:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong while loading the menu."
        );
      } finally {
        console.log(
          "DineFlow: loading finished."
        );

        setLoading(false);
      }
    }

  loadRestaurant();
}, []);

  // ============================================
  // CART FUNCTIONS
  // ============================================

  const addToCart = (id: string) => {
    setCart((currentCart) => ({
      ...currentCart,
      [id]: (currentCart[id] || 0) + 1,
    }));
  };

  const decreaseQuantity = (id: string) => {
    setCart((currentCart) => {
      const updatedCart = { ...currentCart };

      if (updatedCart[id] > 1) {
        updatedCart[id] -= 1;
      } else {
        delete updatedCart[id];
      }

      return updatedCart;
    });
  };

  const cartItems = menuItems.filter((item) => cart[item.id]);

  const totalItems = Object.values(cart).reduce(
    (total, quantity) => total + quantity,
    0
  );

  const subtotal = cartItems.reduce(
    (total, item) => total + item.price * cart[item.id],
    0
  );

  // ============================================
  // HOTEL DISCOUNT
  // ============================================

  let discount = 0;

  if (hotel?.discount_enabled) {
    if (hotel.discount_type === "percentage") {
      discount = subtotal * (Number(hotel.discount_value) / 100);
    } else {
      discount = Math.min(Number(hotel.discount_value), subtotal);
    }
  }

  const total = subtotal - discount;

  // ============================================
  // PLACE REAL ORDER
  // ============================================

  const placeOrder = async () => {
    if (!hotel || !tableId || cartItems.length === 0) {
      return;
    }

    const supabase = createClient();

    try {
      // Send only menu item IDs and quantities.
      // The database will calculate prices, discount and total.
      const items = cartItems.map((item) => ({
        menu_item_id: item.id,
        quantity: cart[item.id],
      }));

      const { data, error: orderError } = await supabase.rpc(
        "create_customer_order",
        {
          p_hotel_id: hotel.id,
          p_table_id: tableId,
          p_items: items,
        }
      );

      if (orderError) {
        throw new Error(orderError.message);
      }

      if (!data || data.length === 0) {
        throw new Error("Order was not created.");
      }

      const orderData = data[0];

      setOrderNumber(orderData.created_order_number);
      setOrderPlaced(true);
      setShowCart(false);
      setCart({});
    } catch (err) {
      console.error("Order creation error:", err);

      alert(
        err instanceof Error
          ? `Order failed: ${err.message}`
          : "Order failed. Please try again."
      );
    }
  };

  // ============================================
  // LOADING SCREEN
  // ============================================

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-3xl font-bold text-gray-900">
            DineFlow
          </div>

          <p className="text-gray-500 mt-2">
            Loading menu...
          </p>
        </div>
      </main>
    );
  }

  // ============================================
  // ERROR SCREEN
  // ============================================

  if (error) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-5">
        <div className="bg-white rounded-3xl p-8 shadow-sm max-w-md text-center">
          <div className="text-4xl mb-4">⚠️</div>

          <h1 className="text-2xl font-bold text-gray-900">
            Unable to load menu
          </h1>

          <p className="text-gray-500 mt-3">
            {error}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-28">

      {/* ============================================
          HEADER
      ============================================ */}

      <header className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-5 py-6">

          <h1 className="text-3xl font-bold text-gray-900">
            {hotel?.name || "DineFlow"}
          </h1>

          <p className="text-gray-500 mt-1">
            Digital Menu & Ordering
          </p>

          <div className="mt-4 inline-block bg-gray-100 px-4 py-2 rounded-full text-sm">
            Table {tableNumber}
          </div>

        </div>
      </header>

      {/* ============================================
          MENU
      ============================================ */}

      <section className="max-w-5xl mx-auto px-5 py-8">

        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Our Menu
        </h2>

        {menuItems.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center">
            <p className="text-gray-500">
              No menu items are currently available.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">

            {menuItems.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl p-5 shadow-sm border hover:shadow-md transition"
              >

                <div className="flex justify-between gap-4">

                  <div>

                    <p className="text-sm text-orange-600 font-medium">
                      {item.category}
                    </p>

                    <h3 className="text-xl font-semibold text-gray-900 mt-1">
                      {item.name}
                    </h3>

                    <p className="text-gray-500 text-sm mt-2">
                      {item.description ||
                        "Freshly prepared for you"}
                    </p>

                    <p className="text-lg font-bold text-gray-900 mt-4">
                      ₹{item.price}
                    </p>

                  </div>

                  <button
                    onClick={() => addToCart(item.id)}
                    className="self-end bg-black text-white px-5 py-2 rounded-xl hover:bg-gray-800"
                  >
                    Add
                  </button>

                </div>

              </div>
            ))}

          </div>
        )}

      </section>

      {/* ============================================
          CART PANEL
      ============================================ */}

      {showCart && (
        <div className="fixed inset-0 bg-black/40 flex items-end md:items-center justify-center z-50">

          <div className="bg-white w-full md:max-w-lg md:rounded-3xl rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto">

            <div className="flex justify-between items-center mb-6">

              <h2 className="text-2xl font-bold">
                Your Cart
              </h2>

              <button
                onClick={() => setShowCart(false)}
                className="text-gray-500 text-xl"
              >
                ✕
              </button>

            </div>

            {cartItems.length === 0 ? (

              <p className="text-gray-500 text-center py-10">
                Your cart is empty.
              </p>

            ) : (

              <>

                <div className="space-y-4">

                  {cartItems.map((item) => (

                    <div
                      key={item.id}
                      className="flex justify-between items-center border-b pb-4"
                    >

                      <div>

                        <h3 className="font-semibold">
                          {item.name}
                        </h3>

                        <p className="text-gray-500 text-sm">
                          ₹{item.price} × {cart[item.id]}
                        </p>

                      </div>

                      <div className="flex items-center gap-3">

                        <button
                          onClick={() =>
                            decreaseQuantity(item.id)
                          }
                          className="w-8 h-8 rounded-full bg-gray-200"
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
                          className="w-8 h-8 rounded-full bg-black text-white"
                        >
                          +
                        </button>

                      </div>

                    </div>

                  ))}

                </div>

                {/* BILL */}

                <div className="mt-6 space-y-3">

                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>
                      ₹{subtotal.toFixed(2)}
                    </span>
                  </div>

                  {hotel?.discount_enabled && (
                    <div className="flex justify-between text-green-600">

                      <span>
                        {hotel.discount_type === "percentage"
                          ? `Online Order Discount (${hotel.discount_value}%)`
                          : "Online Order Discount"}
                      </span>

                      <span>
                        -₹{discount.toFixed(2)}
                      </span>

                    </div>
                  )}

                  <div className="border-t pt-3 flex justify-between text-xl font-bold">

                    <span>Total</span>

                    <span>
                      ₹{total.toFixed(2)}
                    </span>

                  </div>

                </div>

                <button
                  onClick={placeOrder}
                  className="w-full mt-6 bg-orange-600 text-white py-4 rounded-2xl font-semibold hover:bg-orange-700"
                >
                  Place Order
                </button>

              </>
            )}

          </div>

        </div>
      )}

      {/* ============================================
          ORDER CONFIRMATION
      ============================================ */}

      {orderPlaced && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-5">

          <div className="bg-white w-full max-w-md rounded-3xl p-8 text-center shadow-xl">

            <div className="text-5xl mb-4">
              ✓
            </div>

            <h2 className="text-3xl font-bold text-gray-900">
              Order Placed!
            </h2>

            <p className="text-gray-500 mt-2">
              Your order has been successfully sent to the kitchen.
            </p>

            <div className="bg-gray-100 rounded-2xl p-5 mt-6">

              <p className="text-sm text-gray-500">
                Order Number
              </p>

              <p className="text-3xl font-bold mt-1">
                #{orderNumber}
              </p>

              <p className="text-sm text-gray-500 mt-3">
                Table {tableNumber}
              </p>

            </div>

            <div className="mt-5 text-left bg-orange-50 rounded-2xl p-4">

              <p className="font-semibold">
                Estimated preparation time
              </p>

              <p className="text-gray-600 mt-1">
                20–25 minutes
              </p>

            </div>

            <button
              onClick={() => setOrderPlaced(false)}
              className="w-full mt-6 bg-black text-white py-4 rounded-2xl font-semibold"
            >
              Continue
            </button>

          </div>

        </div>
      )}

      {/* ============================================
          BOTTOM CART BUTTON
      ============================================ */}

      {totalItems > 0 && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 w-[90%] max-w-md z-40">

          <button
            onClick={() => setShowCart(true)}
            className="w-full bg-orange-600 text-white py-4 rounded-2xl font-semibold shadow-lg flex justify-between px-6"
          >

            <span>
              🛒 View Cart
            </span>

            <span>
              {totalItems}{" "}
              {totalItems === 1 ? "item" : "items"}
            </span>

          </button>

        </div>
      )}

    </main>
  );
}
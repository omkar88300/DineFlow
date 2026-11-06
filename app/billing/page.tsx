"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

type Order = {
  id: string;
  order_number: number;
  status: string;
  subtotal: number;
  discount: number;
  total: number;
  payment_status: string;
  payment_method: string | null;
  created_at: string;
  table_number: number | null;
};

type OrderItem = {
  id: string;
  order_id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
};

export default function BillingPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);

  const [selectedOrder, setSelectedOrder] =
    useState<Order | null>(null);

  const [paymentMethod, setPaymentMethod] =
    useState("cash");

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    setLoading(true);
    setError("");

    const supabase = createClient();

    // Get hotel
    const { data: hotel, error: hotelError } = await supabase
      .from("hotels")
      .select("id")
      .eq("slug", "dineflow-demo")
      .single();

    if (hotelError || !hotel) {
      setError("Hotel not found.");
      setLoading(false);
      return;
    }

    // Get served orders
    const { data: ordersData, error: ordersError } =
      await supabase
        .from("orders")
        .select(`
          id,
          order_number,
          status,
          subtotal,
          discount,
          total,
          payment_status,
          payment_method,
          created_at,
          restaurant_tables (
            table_number
          )
        `)
        .eq("hotel_id", hotel.id)
        .eq("status", "served")
        .order("created_at", {
          ascending: false,
        });

    if (ordersError) {
      setError(ordersError.message);
      setLoading(false);
      return;
    }

    const formattedOrders: Order[] =
      (ordersData || []).map((order: { id: string; order_number: number; status: string; subtotal: number | string; discount: number | string; total: number | string; payment_status: string; payment_method: string | null; created_at: string; restaurant_tables: { table_number: number | null } | { table_number: number | null }[] | null }) => ({
        id: order.id,
        order_number: order.order_number,
        status: order.status,
        subtotal: Number(order.subtotal),
        discount: Number(order.discount),
        total: Number(order.total),
        payment_status: order.payment_status,
        payment_method: order.payment_method,
        created_at: order.created_at,
        table_number:
          (Array.isArray(order.restaurant_tables) ? order.restaurant_tables[0]?.table_number : order.restaurant_tables?.table_number) ?? null,
      }));

    setOrders(formattedOrders);

    // Get order items
    if (formattedOrders.length > 0) {
      const orderIds = formattedOrders.map(
        (order) => order.id
      );

      const { data: itemsData, error: itemsError } =
        await supabase
          .from("order_items")
          .select(`
            id,
            order_id,
            item_name,
            quantity,
            unit_price,
            total_price
          `)
          .in("order_id", orderIds);

      if (itemsError) {
        setError(itemsError.message);
        setLoading(false);
        return;
      }

      setOrderItems(
        (itemsData || []).map((item) => ({
          id: item.id,
          order_id: item.order_id,
          item_name: item.item_name,
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price),
          total_price: Number(item.total_price),
        }))
      );
    } else {
      setOrderItems([]);
    }

    setLoading(false);
  }

  function getItemsForOrder(orderId: string) {
    return orderItems.filter(
      (item) => item.order_id === orderId
    );
  }

  async function markAsPaid() {
    if (!selectedOrder) {
      return;
    }

    setProcessing(true);
    setMessage("");

    const supabase = createClient();

    const { error } = await supabase.rpc(
      "mark_order_as_paid",
      {
        p_order_id: selectedOrder.id,
        p_payment_method: paymentMethod,
      }
    );

    if (error) {
      setMessage(
        `Payment failed: ${error.message}`
      );
      setProcessing(false);
      return;
    }

    setMessage(
      `Order #${selectedOrder.order_number} marked as paid successfully.`
    );

    setProcessing(false);
    setSelectedOrder(null);

    await loadOrders();
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl font-semibold">
          Loading billing dashboard...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">

        {/* HEADER */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <h1 className="text-3xl font-bold">
            Billing Dashboard
          </h1>

          <p className="text-gray-500 mt-1">
            Manage served orders and payments.
          </p>
        </div>

        {/* MESSAGE */}
        {message && (
          <div className="bg-green-100 border border-green-300 text-green-800 rounded-xl p-4 mb-6">
            {message}
          </div>
        )}

        {/* ERROR */}
        {error && (
          <div className="bg-red-100 border border-red-300 text-red-800 rounded-xl p-4 mb-6">
            {error}
          </div>
        )}

        {/* ORDERS */}
        {orders.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <div className="text-5xl mb-4">
              💰
            </div>

            <h2 className="text-2xl font-bold">
              No served orders
            </h2>

            <p className="text-gray-500 mt-2">
              Served orders will appear here for billing.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">

            {orders.map((order) => {
              const items = getItemsForOrder(order.id);

              return (
                <div
                  key={order.id}
                  className="bg-white rounded-2xl shadow-sm border overflow-hidden"
                >

                  {/* ORDER HEADER */}
                  <div className="p-5 border-b">

                    <div className="flex justify-between">

                      <div>
                        <p className="text-sm text-gray-500">
                          Order
                        </p>

                        <h2 className="text-3xl font-bold">
                          #{order.order_number}
                        </h2>
                      </div>

                      <div className="text-right">
                        <p className="text-sm text-gray-500">
                          Table
                        </p>

                        <p className="text-xl font-bold">
                          {order.table_number
                            ? `#${order.table_number}`
                            : "—"}
                        </p>
                      </div>

                    </div>

                    {/* PAYMENT STATUS */}
                    <div className="mt-4">

                      {order.payment_status === "paid" ? (
                        <span className="inline-block bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-semibold">
                          Paid
                        </span>
                      ) : (
                        <span className="inline-block bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm font-semibold">
                          Payment Pending
                        </span>
                      )}

                    </div>

                  </div>

                  {/* ITEMS */}
                  <div className="p-5">

                    <h3 className="font-semibold mb-4">
                      Items
                    </h3>

                    <div className="space-y-3">

                      {items.map((item) => (
                        <div
                          key={item.id}
                          className="flex justify-between"
                        >

                          <div className="flex gap-3">

                            <span className="bg-gray-100 w-8 h-8 rounded-lg flex items-center justify-center font-bold">
                              {item.quantity}
                            </span>

                            <div>
                              <p className="font-medium">
                                {item.item_name}
                              </p>

                              <p className="text-xs text-gray-500">
                                ₹{item.unit_price} each
                              </p>
                            </div>

                          </div>

                          <p className="font-semibold">
                            ₹{item.total_price}
                          </p>

                        </div>
                      ))}

                    </div>

                  </div>

                  {/* BILL */}
                  <div className="px-5 pb-5">

                    <div className="border-t pt-4">

                      <div className="flex justify-between">
                        <span>
                          Subtotal
                        </span>

                        <span>
                          ₹{order.subtotal.toFixed(2)}
                        </span>
                      </div>

                      <div className="flex justify-between text-green-600 mt-2">
                        <span>
                          Discount
                        </span>

                        <span>
                          -₹{order.discount.toFixed(2)}
                        </span>
                      </div>

                      <div className="flex justify-between text-xl font-bold mt-3">
                        <span>
                          Total
                        </span>

                        <span>
                          ₹{order.total.toFixed(2)}
                        </span>
                      </div>

                    </div>

                    {/* PAY BUTTON */}
                    {order.payment_status !== "paid" && (
                      <button
                        onClick={() => {
                          setSelectedOrder(order);
                          setMessage("");
                        }}
                        className="w-full bg-black text-white py-3 rounded-xl font-bold mt-5 hover:bg-gray-800"
                      >
                        Generate Bill
                      </button>
                    )}

                  </div>

                </div>
              );
            })}

          </div>
        )}

      </div>

      {/* PAYMENT MODAL */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-5 z-50">

          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-xl">

            <div className="flex justify-between items-center">

              <div>
                <h2 className="text-2xl font-bold">
                  Payment
                </h2>

                <p className="text-gray-500">
                  Order #{selectedOrder.order_number}
                </p>
              </div>

              <button
                onClick={() => setSelectedOrder(null)}
                className="text-gray-500 text-2xl"
              >
                ×
              </button>

            </div>

            {/* TOTAL */}
            <div className="bg-gray-100 rounded-2xl p-5 mt-5 text-center">

              <p className="text-gray-500">
                Amount to Pay
              </p>

              <p className="text-4xl font-bold mt-1">
                ₹{selectedOrder.total.toFixed(2)}
              </p>

            </div>

            {/* PAYMENT METHOD */}
            <div className="mt-6">

              <label className="font-semibold">
                Payment Method
              </label>

              <div className="grid grid-cols-3 gap-3 mt-3">

                <button
                  onClick={() => setPaymentMethod("cash")}
                  className={`p-3 rounded-xl border-2 font-semibold ${
                    paymentMethod === "cash"
                      ? "border-black bg-gray-100"
                      : "border-gray-200"
                  }`}
                >
                  💵 Cash
                </button>

                <button
                  onClick={() => setPaymentMethod("upi")}
                  className={`p-3 rounded-xl border-2 font-semibold ${
                    paymentMethod === "upi"
                      ? "border-black bg-gray-100"
                      : "border-gray-200"
                  }`}
                >
                  📱 UPI
                </button>

                <button
                  onClick={() => setPaymentMethod("card")}
                  className={`p-3 rounded-xl border-2 font-semibold ${
                    paymentMethod === "card"
                      ? "border-black bg-gray-100"
                      : "border-gray-200"
                  }`}
                >
                  💳 Card
                </button>

              </div>

            </div>

            {/* CONFIRM */}
            <button
              onClick={markAsPaid}
              disabled={processing}
              className="w-full bg-green-600 text-white py-3 rounded-xl font-bold text-lg mt-6 hover:bg-green-700 disabled:opacity-50"
            >
              {processing
                ? "Processing..."
                : "Mark as Paid"}
            </button>

          </div>

        </div>
      )}

    </main>
  );
}
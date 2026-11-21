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

const statusFlow = [
  "pending",
  "preparing",
  "ready",
  "served",
];

export default function KitchenPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ============================================
  // LOAD ORDERS
  // ============================================

  const loadOrders = async () => {
    const supabase = createClient();

    try {
      // Get DineFlow demo hotel
      const { data: hotel, error: hotelError } = await supabase
        .from("hotels")
        .select("id")
        .eq("slug", "dineflow-demo")
        .single();

      if (hotelError) {
        throw new Error(hotelError.message);
      }

      // Get active orders
      const { data: ordersData, error: ordersError } =
        await supabase
          .from("orders")
          .select(
            `
            id,
            order_number,
            status,
            subtotal,
            discount,
            total,
            created_at,
            restaurant_tables (
              table_number
            )
          `
          )
          .eq("hotel_id", hotel.id)
          .in("status", [
            "pending",
            "preparing",
            "ready",
            ])
          .order("created_at", {
            ascending: true,
          });

      if (ordersError) {
        throw new Error(ordersError.message);
      }

      const formattedOrders: Order[] = (ordersData || []).map(
        (order: { id: string; order_number: number; status: string; subtotal: number | string; discount: number | string; total: number | string; created_at: string; restaurant_tables: { table_number: number | null } | { table_number: number | null }[] | null }) => ({
          id: order.id,
          order_number: order.order_number,
          status: order.status,
          subtotal: Number(order.subtotal),
          discount: Number(order.discount),
          total: Number(order.total),
          created_at: order.created_at,
          table_number:
            (Array.isArray(order.restaurant_tables) ? order.restaurant_tables[0]?.table_number : order.restaurant_tables?.table_number) ?? null,
        })
      );

      setOrders(formattedOrders);

      // Get order items
      if (formattedOrders.length > 0) {
        const orderIds = formattedOrders.map(
          (order) => order.id
        );

        const { data: itemsData, error: itemsError } =
          await supabase
            .from("order_items")
            .select(
              `
              id,
              order_id,
              item_name,
              quantity,
              unit_price,
              total_price
            `
            )
            .in("order_id", orderIds);

        if (itemsError) {
          throw new Error(itemsError.message);
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
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load kitchen orders."
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // INITIAL LOAD
  // ============================================

  useEffect(() => {
    void Promise.resolve().then(loadOrders);
  }, []);

  // ============================================
  // AUTO REFRESH EVERY 5 SECONDS
  // ============================================

  useEffect(() => {
    const interval = setInterval(() => {
      loadOrders();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // ============================================
  // UPDATE ORDER STATUS
  // ============================================

  const updateStatus = async (
    orderId: string,
    newStatus: string
  ) => {
    const supabase = createClient();


    const { error } = await supabase.rpc(
      "update_kitchen_order_status",
      {
        p_order_id: orderId,
        p_new_status: newStatus,
      }
    );


    if (error) {
      alert(`Unable to update order: ${error.message}`);
      return;
    }


    await loadOrders();
  };

  // ============================================
  // GET ITEMS FOR ORDER
  // ============================================

  const getItemsForOrder = (orderId: string) => {
    return orderItems.filter(
      (item) => item.order_id === orderId
    );
  };

  // ============================================
  // GET NEXT STATUS
  // ============================================

  const getNextStatus = (status: string) => {
    const currentIndex = statusFlow.indexOf(status);

    if (
      currentIndex === -1 ||
      currentIndex === statusFlow.length - 1
    ) {
      return null;
    }

    return statusFlow[currentIndex + 1];
  };

  // ============================================
  // LOADING SCREEN
  // ============================================

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-3xl font-bold">
            DineFlow Kitchen
          </div>

          <p className="text-gray-500 mt-2">
            Loading orders...
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
      <main className="min-h-screen bg-gray-100 flex items-center justify-center px-5">
        <div className="bg-white rounded-3xl p-8 max-w-md text-center shadow-sm">

          <div className="text-4xl mb-4">
            ⚠️
          </div>

          <h1 className="text-2xl font-bold">
            Kitchen Error
          </h1>

          <p className="text-gray-500 mt-3">
            {error}
          </p>

        </div>
      </main>
    );
  }

  // ============================================
  // KITCHEN DASHBOARD
  // ============================================

  return (
    <main className="min-h-screen bg-gray-100">

      {/* HEADER */}

      <header className="bg-black text-white sticky top-0 z-20">

        <div className="max-w-6xl mx-auto px-5 py-5">

          <div className="flex justify-between items-center">

            <div>

              <h1 className="text-2xl font-bold">
                DineFlow Kitchen
              </h1>

              <p className="text-gray-400 text-sm mt-1">
                Live Order Queue
              </p>

            </div>

            <div className="bg-white/10 px-4 py-2 rounded-xl">

              <span className="font-semibold">
                {orders.length}
              </span>{" "}

              active{" "}

              {orders.length === 1
                ? "order"
                : "orders"}

            </div>

          </div>

        </div>

      </header>

      {/* ORDERS */}

      <section className="max-w-6xl mx-auto px-5 py-8">

        {orders.length === 0 ? (

          <div className="bg-white rounded-3xl p-12 text-center shadow-sm">

            <div className="text-6xl mb-5">
              🍳
            </div>

            <h2 className="text-2xl font-bold">
              No active orders
            </h2>

            <p className="text-gray-500 mt-2">
              New customer orders will appear here.
            </p>

          </div>

        ) : (

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">

            {orders.map((order) => {

              const items = getItemsForOrder(order.id);

              const nextStatus = getNextStatus(
                order.status
              );

              return (

                <div
                  key={order.id}
                  className="bg-white rounded-3xl shadow-sm overflow-hidden border"
                >

                  {/* ORDER HEADER */}

                  <div className="p-5 border-b">

                    <div className="flex justify-between items-start">

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

                    {/* STATUS */}

                    <div className="mt-4">

                      <span className="inline-block bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm font-semibold capitalize">
                        {order.status}
                      </span>

                    </div>

                  </div>

                  {/* ORDER ITEMS */}

                  <div className="p-5">

                    <h3 className="font-semibold mb-4">
                      Items
                    </h3>

                    <div className="space-y-3">

                      {items.map((item) => (

                        <div
                          key={item.id}
                          className="flex justify-between items-center"
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

                      <div className="flex justify-between text-sm">

                        <span>
                          Subtotal
                        </span>

                        <span>
                          ₹{order.subtotal.toFixed(2)}
                        </span>

                      </div>

                      <div className="flex justify-between text-sm text-green-600 mt-1">

                        <span>
                          Discount
                        </span>

                        <span>
                          -₹{order.discount.toFixed(2)}
                        </span>

                      </div>

                      <div className="flex justify-between text-lg font-bold mt-3">

                        <span>
                          Total
                        </span>

                        <span>
                          ₹{order.total.toFixed(2)}
                        </span>

                      </div>

                    </div>

                  </div>

                  {/* STATUS BUTTON */}

                  {nextStatus && (

                    <div className="p-5 pt-0">

                      <button
                        onClick={() =>
                          updateStatus(
                            order.id,
                            nextStatus
                          )
                        }
                        className="w-full bg-black text-white py-3 rounded-2xl font-semibold hover:bg-gray-800 capitalize"
                      >

                        {nextStatus === "preparing" &&
                          "Start Preparing"}

                        {nextStatus === "ready" &&
                          "Mark Ready"}

                        {nextStatus === "served" &&
                          "Mark Served"}

                      </button>

                    </div>

                  )}

                </div>

              );
            })}

          </div>

        )}

      </section>

    </main>
  );
}
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";

type Stats = {
  todayOrders: number;
  todayRevenue: number;
  pendingOrders: number;
  paidOrders: number;
  activeTables: number;
};

type RecentOrder = {
  id: string;
  order_number: number;
  status: string;
  payment_status: string;
  total: number;
  table_number: number | null;
};

export default function AdminPage() {
  const [stats, setStats] = useState<Stats>({
    todayOrders: 0,
    todayRevenue: 0,
    pendingOrders: 0,
    paidOrders: 0,
    activeTables: 0,
  });

  const [recentOrders, setRecentOrders] = useState<
    RecentOrder[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadDashboard();
  }, []);

  async function handleLogout() {
    const supabase = createClient();

    await supabase.auth.signOut();

    window.location.href = "/login";
  }

  async function loadDashboard() {
    setLoading(true);
    setError("");

    const supabase = createClient();

    // Get hotel
    const { data: hotel, error: hotelError } =
      await supabase
        .from("hotels")
        .select("id, name")
        .eq("slug", "dineflow-demo")
        .single();

    if (hotelError || !hotel) {
      setError("Hotel not found.");
      setLoading(false);
      return;
    }

    // Start of today
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // Get today's orders
    const { data: todayOrders, error: ordersError } =
      await supabase
        .from("orders")
        .select(`
          id,
          order_number,
          status,
          payment_status,
          total,
          created_at,
          restaurant_tables (
            table_number
          )
        `)
        .eq("hotel_id", hotel.id)
        .gte(
          "created_at",
          startOfToday.toISOString()
        )
        .order("created_at", {
          ascending: false,
        });

    if (ordersError) {
      setError(ordersError.message);
      setLoading(false);
      return;
    }

    const orders = todayOrders || [];

    // Today&apos;s revenue = paid orders only
    const todayRevenue = orders
      .filter(
        (order) =>
          order.payment_status === "paid"
      )
      .reduce(
        (total, order) =>
          total + Number(order.total || 0),
        0
      );

    const pendingOrders = orders.filter(
      (order) =>
        order.status === "pending" ||
        order.status === "preparing"
    ).length;

    const paidOrders = orders.filter(
      (order) =>
        order.payment_status === "paid"
    ).length;

    // Get active tables
    const { count: activeTables, error: tablesError } =
      await supabase
        .from("restaurant_tables")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("hotel_id", hotel.id)
        .eq("is_active", true);

    if (tablesError) {
      setError(tablesError.message);
      setLoading(false);
      return;
    }

    setStats({
      todayOrders: orders.length,
      todayRevenue,
      pendingOrders,
      paidOrders,
      activeTables: activeTables || 0,
    });

    // Recent orders
    setRecentOrders(
      orders.slice(0, 6).map((order: { id: string; order_number: number; status: string; payment_status: string; total: number | string; restaurant_tables: { table_number: number | null } | { table_number: number | null }[] | null }) => ({
        id: order.id,
        order_number: order.order_number,
        status: order.status,
        payment_status: order.payment_status,
        total: Number(order.total || 0),
        table_number:
          (Array.isArray(order.restaurant_tables) ? order.restaurant_tables[0]?.table_number : order.restaurant_tables?.table_number) ?? null,
      }))
    );

    setLoading(false);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl font-semibold">
          Loading admin dashboard...
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
          <div className="text-4xl mb-4">
            ⚠️
          </div>

          <h1 className="text-2xl font-bold">
            Dashboard Error
          </h1>

          <p className="text-red-600 mt-3">
            {error}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100">

      {/* HEADER */}
      <header className="bg-black text-white">
        <div className="max-w-7xl mx-auto px-6 py-6">

          <div className="flex justify-between items-center">

            <div>
              <h1 className="text-3xl font-bold">
                DineFlow Admin
              </h1>

              <p className="text-gray-400 mt-1">
                Restaurant management overview
              </p>
            </div>

            <button
              onClick={handleLogout}
              className="bg-white text-black px-4 py-2 rounded-xl font-semibold hover:bg-gray-200"
            >
              Logout
            </button>

          </div>

        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">

        {/* STATS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">

          {/* ORDERS */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="text-3xl">
              🧾
            </div>

            <p className="text-gray-500 mt-4">
              Today&apos;s Orders
            </p>

            <p className="text-3xl font-bold mt-1">
              {stats.todayOrders}
            </p>
          </div>

          {/* REVENUE */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="text-3xl">
              💰
            </div>

            <p className="text-gray-500 mt-4">
              Today&apos;s Revenue
            </p>

            <p className="text-3xl font-bold mt-1">
              ₹{stats.todayRevenue.toFixed(2)}
            </p>
          </div>

          {/* PENDING */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="text-3xl">
              🍳
            </div>

            <p className="text-gray-500 mt-4">
              Pending Orders
            </p>

            <p className="text-3xl font-bold mt-1">
              {stats.pendingOrders}
            </p>
          </div>

          {/* PAID */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="text-3xl">
              ✅
            </div>

            <p className="text-gray-500 mt-4">
              Paid Orders
            </p>

            <p className="text-3xl font-bold mt-1">
              {stats.paidOrders}
            </p>
          </div>

          {/* TABLES */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="text-3xl">
              🍽️
            </div>

            <p className="text-gray-500 mt-4">
              Active Tables
            </p>

            <p className="text-3xl font-bold mt-1">
              {stats.activeTables}
            </p>
          </div>

        </div>

        {/* QUICK ACCESS */}
        <section className="mt-8">

          <h2 className="text-2xl font-bold mb-4">
            Quick Access
          </h2>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">



          {/* TABLES */}
          <a
            href="/tables"
            className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition"
          >
            <div className="text-3xl">
              🪑
            </div>

            <h3 className="font-bold text-xl mt-4">
              Tables
            </h3>

            <p className="text-gray-500 text-sm mt-1">
              Manage tables & QR codes
            </p>
          </a>

          {/* KITCHEN */}
          <a
            href="/kitchen"
            className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition"
          >
              <div className="text-3xl">
                🍳
              </div>

              <h3 className="font-bold text-xl mt-4">
                Kitchen
              </h3>

              <p className="text-gray-500 text-sm mt-1">
                Manage live orders
              </p>
            </a>

            <a
              href="/waiter"
              className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition"
            >
              <div className="text-3xl">
                👨‍🍳
              </div>

              <h3 className="font-bold text-xl mt-4">
                Waiter
              </h3>

              <p className="text-gray-500 text-sm mt-1">
                Place table orders
              </p>
            </a>

            <a
              href="/billing"
              className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition"
            >
              <div className="text-3xl">
                💳
              </div>

              <h3 className="font-bold text-xl mt-4">
                Billing
              </h3>

              <p className="text-gray-500 text-sm mt-1">
                Manage payments
              </p>
            </a>

            {/* MENU MANAGEMENT */}
            <a
              href="/menu"
              className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition"
            >
              <div className="text-3xl">
                🍽️
              </div>

              <h3 className="font-bold text-xl mt-4">
                Menu Management
              </h3>

              <p className="text-gray-500 text-sm mt-1">
                Add, edit & manage menu
              </p>
            </a>

            <a
              href="/staff"
              className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition"
            >
              <div className="text-3xl">
                👥
              </div>

              <h3 className="font-bold text-xl mt-4">
                Staff Management
              </h3>

              <p className="text-gray-500 text-sm mt-1">
                Add, edit & manage staff
              </p>
            </a>

            <Link
              href="/"
              className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition"
            >
              <div className="text-3xl">
                📱
              </div>

              <h3 className="font-bold text-xl mt-4">
                Customer Menu
              </h3>

              <p className="text-gray-500 text-sm mt-1">
                Open digital menu
              </p>
            </Link>

          </div>

        </section>

        {/* RECENT ORDERS */}
        <section className="mt-8">

          <div className="flex justify-between items-center mb-4">

            <div>
              <h2 className="text-2xl font-bold">
                Today&apos;s Orders
              </h2>

              <p className="text-gray-500 text-sm mt-1">
                Most recent orders
              </p>
            </div>

            <button
              onClick={loadDashboard}
              className="bg-white border px-4 py-2 rounded-xl font-semibold hover:bg-gray-50"
            >
              Refresh
            </button>

          </div>

          {recentOrders.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 text-center">
              <div className="text-4xl">
                🧾
              </div>

              <p className="text-gray-500 mt-3">
                No orders today.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">

              <div className="overflow-x-auto">

                <table className="w-full">

                  <thead className="bg-gray-50 border-b">

                    <tr>
                      <th className="text-left p-4">
                        Order
                      </th>

                      <th className="text-left p-4">
                        Table
                      </th>

                      <th className="text-left p-4">
                        Status
                      </th>

                      <th className="text-left p-4">
                        Payment
                      </th>

                      <th className="text-right p-4">
                        Total
                      </th>
                    </tr>

                  </thead>

                  <tbody>

                    {recentOrders.map((order) => (
                      <tr
                        key={order.id}
                        className="border-b last:border-b-0"
                      >

                        <td className="p-4 font-bold">
                          #{order.order_number}
                        </td>

                        <td className="p-4">
                          Table{" "}
                          {order.table_number ?? "—"}
                        </td>

                        <td className="p-4">

                          <span className="bg-gray-100 px-3 py-1 rounded-full text-sm font-semibold capitalize">
                            {order.status}
                          </span>

                        </td>

                        <td className="p-4">

                          <span
                            className={`px-3 py-1 rounded-full text-sm font-semibold ${
                              order.payment_status ===
                              "paid"
                                ? "bg-green-100 text-green-700"
                                : "bg-orange-100 text-orange-700"
                            }`}
                          >
                            {order.payment_status}
                          </span>

                        </td>

                        <td className="p-4 text-right font-bold">
                          ₹{order.total.toFixed(2)}
                        </td>

                      </tr>
                    ))}

                  </tbody>

                </table>

              </div>

            </div>
          )}

        </section>

      </div>

    </main>
  );
}
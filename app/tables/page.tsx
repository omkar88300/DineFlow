"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { QRCodeSVG } from "qrcode.react";

type RestaurantTable = {
  id: string;
  table_number: number;
  capacity: number;
  is_active: boolean;
  qr_token: string;
};

export default function TablesPage() {
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingTable, setEditingTable] =
  useState<RestaurantTable | null>(null);

const [editCapacity, setEditCapacity] =
  useState("");

  async function loadTables() {
    const supabase = createClient();

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

    const { data, error: tablesError } = await supabase
      .from("restaurant_tables")
      .select(
        "id, table_number, capacity, is_active, qr_token"
      )
      .eq("hotel_id", hotel.id)
      .order("table_number", { ascending: true });

    if (tablesError) {
      setError(tablesError.message);
      setLoading(false);
      return;
    }

    setTables(data || []);
    setLoading(false);
  }

  async function updateTableCapacity() {
    if (!editingTable) {
        return;
    }

    const capacity = Number(editCapacity);

    if (!capacity || capacity <= 0) {
        setError("Please enter a valid capacity.");
        return;
    }

    const supabase = createClient();

    const { error: updateError } = await supabase.rpc(
      "update_restaurant_table",
      {
        p_table_id: editingTable.id,
        p_capacity: capacity,
        p_is_active: editingTable.is_active,
      }
    );

    if (updateError) {
        setError(
        `Failed to update table: ${updateError.message}`
        );
        return;
    }

    setError("");

    setEditingTable(null);
    setEditCapacity("");

    await loadTables();
    }

  useEffect(() => {
    loadTables();
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">

        {/* HEADER */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Table Management
          </h1>

          <p className="text-gray-500 mt-2">
            Manage restaurant tables and QR codes
          </p>
        </div>

        {/* ERROR */}
        {error && (
          <div className="mb-6 bg-red-100 text-red-700 px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        {/* LOADING */}
        {loading ? (
          <div className="text-gray-500">
            Loading tables...
          </div>
        ) : (
          <>
            {/* SUMMARY */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">

              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <p className="text-sm text-gray-500">
                  Total Tables
                </p>

                <p className="text-3xl font-bold mt-2">
                  {tables.length}
                </p>
              </div>

              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <p className="text-sm text-gray-500">
                  Active Tables
                </p>

                <p className="text-3xl font-bold mt-2 text-green-600">
                  {tables.filter((table) => table.is_active).length}
                </p>
              </div>

              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <p className="text-sm text-gray-500">
                  Inactive Tables
                </p>

                <p className="text-3xl font-bold mt-2 text-red-600">
                  {tables.filter((table) => !table.is_active).length}
                </p>
              </div>

            </div>

            {/* EDIT CAPACITY FORM */}
            {editingTable && (
            <div className="mb-8 bg-white border border-gray-200 rounded-2xl p-6">
                <h2 className="text-xl font-bold text-gray-900">
                Edit Table {editingTable.table_number}
                </h2>

                <p className="text-gray-500 mt-1">
                Update the seating capacity for this table.
                </p>

                <div className="mt-5 max-w-sm">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Capacity
                </label>

                <input
                    type="number"
                    min="1"
                    value={editCapacity}
                    onChange={(e) => setEditCapacity(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                />
                </div>

                <div className="flex gap-3 mt-5">
                <button
                    onClick={updateTableCapacity}
                    className="bg-black text-white px-5 py-3 rounded-xl font-semibold hover:bg-gray-800"
                >
                    Save Changes
                </button>

                <button
                    onClick={() => {
                    setEditingTable(null);
                    setEditCapacity("");
                    setError("");
                    }}
                    className="border border-gray-300 text-gray-700 px-5 py-3 rounded-xl font-semibold hover:bg-gray-100"
                >
                    Cancel
                </button>
                </div>
            </div>
            )}

            {/* TABLE GRID */}
            <section>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-bold">
                  Restaurant Tables
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">

                {tables.map((table) => (
                  <div
                    key={table.id}
                    className="bg-white border border-gray-200 rounded-2xl p-6"
                  >

                    <div className="flex items-start justify-between">

                      <div>
                        <p className="text-sm text-gray-500">
                          TABLE
                        </p>

                        <h3 className="text-2xl font-bold mt-1">
                          {table.table_number}
                        </h3>
                      </div>

                      <button
                        onClick={async () => {
                            const supabase = createClient();

                            const { error: updateError } = await supabase.rpc(
                              "update_restaurant_table",
                              {
                                p_table_id: table.id,
                                p_capacity: table.capacity,
                                p_is_active: !table.is_active,
                              }
                            );

                            if (updateError) {
                            setError(
                                `Failed to update table: ${updateError.message}`
                            );
                            return;
                            }

                            setError("");

                            await loadTables();
                        }}
                        className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer ${
                            table.is_active
                            ? "bg-green-100 text-green-700 hover:bg-green-200"
                            : "bg-red-100 text-red-700 hover:bg-red-200"
                        }`}
                        >
                        {table.is_active
                            ? "Active"
                            : "Inactive"}
                        </button>

                    </div>

                    <div className="mt-6">
                      <p className="text-sm text-gray-500">
                        Capacity
                      </p>

                      <p className="font-semibold mt-1">
                        {table.capacity} people
                      </p>
                    </div>

                    <div className="mt-4">
                      <p className="text-sm text-gray-500">
                        QR Token
                      </p>

                      <p className="text-xs text-gray-400 mt-1 break-all">
                        {table.qr_token}
                      </p>
                    </div>

                    <div className="mt-6 flex justify-center">
                        <div className="bg-white border border-gray-200 rounded-2xl p-4">
                            <div className="mt-6 flex flex-col items-center">
                                <div
                                    id={`qr-${table.id}`}
                                    className="bg-white border border-gray-200 rounded-2xl p-4"
                                >
                                    <QRCodeSVG
                                    value={`${window.location.origin}/?table=${table.table_number}`}
                                    size={180}
                                    level="H"
                                    includeMargin={true}
                                    />
                                </div>

                                <button
                                    onClick={() => {
                                    const svg = document.querySelector(
                                        `#qr-${table.id} svg`
                                    ) as SVGElement | null;

                                    if (!svg) {
                                        return;
                                    }

                                    const svgData = new XMLSerializer().serializeToString(svg);

                                    const blob = new Blob([svgData], {
                                        type: "image/svg+xml;charset=utf-8",
                                    });

                                    const url = URL.createObjectURL(blob);

                                    const link = document.createElement("a");
                                    link.href = url;
                                    link.download = `dineflow-table-${table.table_number}-qr.svg`;

                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);

                                    URL.revokeObjectURL(url);
                                    }}
                                    className="mt-4 bg-black text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-gray-800"
                                >
                                    Download QR
                                </button>

                                    <button
                                        onClick={() => {
                                            const svg = document.querySelector(
                                            `#qr-${table.id} svg`
                                            ) as SVGElement | null;

                                            if (!svg) {
                                            return;
                                            }

                                            const printWindow = window.open("", "_blank");

                                            if (!printWindow) {
                                            setError("Please allow pop-ups to print the QR code.");
                                            return;
                                            }

                                            const svgData = new XMLSerializer().serializeToString(svg);

                                            printWindow.document.write(`
                                            <!DOCTYPE html>
                                            <html>
                                                <head>
                                                <title>DineFlow - Table ${table.table_number}</title>
                                                <style>
                                                    body {
                                                    margin: 0;
                                                    min-height: 100vh;
                                                    display: flex;
                                                    align-items: center;
                                                    justify-content: center;
                                                    font-family: Arial, sans-serif;
                                                    text-align: center;
                                                    }

                                                    .card {
                                                    border: 2px solid #111;
                                                    border-radius: 20px;
                                                    padding: 40px;
                                                    width: 320px;
                                                    }

                                                    h1 {
                                                    margin-bottom: 8px;
                                                    }

                                                    p {
                                                    color: #555;
                                                    }

                                                    .qr {
                                                    margin: 25px 0;
                                                    }

                                                    .table {
                                                    font-size: 24px;
                                                    font-weight: bold;
                                                    }
                                                </style>
                                                </head>

                                                <body>
                                                <div class="card">
                                                    <h1>DineFlow</h1>

                                                    <p>Scan to view menu & order</p>

                                                    <div class="qr">
                                                    ${svgData}
                                                    </div>

                                                    <div class="table">
                                                    TABLE ${table.table_number}
                                                    </div>
                                                </div>

                                                <script>
                                                    window.onload = function() {
                                                    window.print();
                                                    };
                                                </script>
                                                </body>
                                            </html>
                                            `);

                                            printWindow.document.close();
                                        }}
                                        className="mt-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-gray-100"
                                        >
                                        Print QR
                                        </button>

                                </div>
                        </div>
                        </div>

                    <button
                        onClick={() => {
                            setEditingTable(table);
                            setEditCapacity(String(table.capacity));
                            setError("");
                        }}
                        className="mt-5 w-full border border-gray-300 text-gray-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-gray-100"
                        >
                        Edit Capacity
                        </button>

                  </div>
                ))}

              </div>
            </section>
          </>
        )}

      </div>
    </main>
  );
}
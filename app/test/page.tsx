"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

type MenuItem = {
  id: string;
  name: string;
  price: number;
};

export default function TestSupabase() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadMenu() {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("menu_items")
        .select("id, name, price")
        .order("name");

      if (error) {
        setError(error.message);
        return;
      }

      setItems(data || []);
    }

    loadMenu();
  }, []);

  return (
    <main className="min-h-screen p-10">
      <h1 className="text-3xl font-bold mb-6">
        Supabase Connection Test
      </h1>

      {error ? (
        <div className="bg-red-100 text-red-700 p-4 rounded-xl">
          ❌ Error: {error}
        </div>
      ) : (
        <div>
          <p className="text-green-600 font-semibold mb-4">
            ✅ Connected to Supabase!
          </p>

          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="border rounded-xl p-4"
              >
                <p className="font-semibold">{item.name}</p>
                <p>₹{item.price}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
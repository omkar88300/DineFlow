"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

type Staff = {
  id: string;
  name: string;
  email: string | null;
  role: string;
  is_active: boolean | null;
};

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingStaff, setEditingStaff] =
  useState<Staff | null>(null);

  const [editStaff, setEditStaff] = useState({
    name: "",
    email: "",
    role: "waiter",
    });

  const [newStaff, setNewStaff] = useState({
    name: "",
    email: "",
    role: "waiter",
    });

  async function loadStaff() {
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

    const { data, error: staffError } = await supabase
      .from("staff")
      .select("id, name, email, role, is_active")
      .eq("hotel_id", hotel.id)
      .order("name", { ascending: true });

    if (staffError) {
      setError(staffError.message);
      setLoading(false);
      return;
    }

    setStaff(data || []);
    setLoading(false);
  }

  async function addStaff() {
    if (!newStaff.name.trim()) {
        setError("Please enter staff name.");
        return;
    }

    const response = await fetch("/api/staff/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: newStaff.name.trim(),
        email: newStaff.email.trim(),
        role: newStaff.role,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      setError(
        `Failed to add staff: ${
          result.error || "Unknown error"
        }`
      );
      return;
    }

    setError("");

    setNewStaff({
        name: "",
        email: "",
        role: "waiter",
    });

    setShowAddForm(false);

    await loadStaff();
    }

    async function updateStaff() {
        if (!editingStaff) {
            return;
        }

        if (!editStaff.name.trim()) {
            setError("Please enter staff name.");
            return;
        }

        const supabase = createClient();

        const { error: updateError } = await supabase.rpc(
          "update_staff_member",
          {
            p_staff_id: editingStaff.id,
            p_name: editStaff.name.trim(),
            p_email: editStaff.email.trim(),
            p_role: editStaff.role,
          }
        );

        if (updateError) {
            setError(
            `Failed to update staff: ${updateError.message}`
            );
            return;
        }

        setError("");

        setEditingStaff(null);

        setEditStaff({
            name: "",
            email: "",
            role: "waiter",
        });

        await loadStaff();
        }

  useEffect(() => {
    void Promise.resolve().then(loadStaff);
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">

        {/* HEADER */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Staff Management
          </h1>

          <p className="text-gray-500 mt-2">
            Manage restaurant staff and their roles
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
            Loading staff...
          </div>
        ) : (
          <>
            {/* SUMMARY */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">

              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <p className="text-sm text-gray-500">
                  Total Staff
                </p>

                <p className="text-3xl font-bold mt-2">
                  {staff.length}
                </p>
              </div>

              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <p className="text-sm text-gray-500">
                  Active Staff
                </p>

                <p className="text-3xl font-bold mt-2 text-green-600">
                  {
                    staff.filter(
                      (member) => member.is_active
                    ).length
                  }
                </p>
              </div>

              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <p className="text-sm text-gray-500">
                  Inactive Staff
                </p>

                <p className="text-3xl font-bold mt-2 text-red-600">
                  {
                    staff.filter(
                      (member) => !member.is_active
                    ).length
                  }
                </p>
              </div>

            </div>

            {/* ADD STAFF FORM */}
            {showAddForm && (
            <div className="mb-8 bg-white border border-gray-200 rounded-2xl p-6">
                <h2 className="text-xl font-bold text-gray-900">
                Add Staff Member
                </h2>

                <p className="text-gray-500 mt-1">
                Add a staff member to your restaurant.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-6">

                {/* NAME */}
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Name
                    </label>

                    <input
                    type="text"
                    value={newStaff.name}
                    onChange={(e) =>
                        setNewStaff({
                        ...newStaff,
                        name: e.target.value,
                        })
                    }
                    placeholder="Enter name"
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                {/* EMAIL */}
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Email
                    </label>

                    <input
                    type="email"
                    value={newStaff.email}
                    onChange={(e) =>
                        setNewStaff({
                        ...newStaff,
                        email: e.target.value,
                        })
                    }
                    placeholder="Enter email"
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                {/* ROLE */}
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Role
                    </label>

                    <select
                    value={newStaff.role}
                    onChange={(e) =>
                        setNewStaff({
                        ...newStaff,
                        role: e.target.value,
                        })
                    }
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none"
                    >
                    <option value="waiter">Waiter</option>
                    <option value="kitchen">Kitchen</option>
                    <option value="admin">Admin</option>
                    <option value="billing">Billing</option>
                    </select>
                </div>

                </div>

                <div className="flex gap-3 mt-6">

                <button
                    onClick={addStaff}
                    className="bg-black text-white px-5 py-3 rounded-xl font-semibold hover:bg-gray-800"
                >
                    Add Staff
                </button>

                <button
                    onClick={() => {
                    setShowAddForm(false);
                    setNewStaff({
                        name: "",
                        email: "",
                        role: "waiter",
                    });
                    setError("");
                    }}
                    className="border border-gray-300 text-gray-700 px-5 py-3 rounded-xl font-semibold hover:bg-gray-100"
                >
                    Cancel
                </button>

                </div>
            </div>
            )}

            {/* EDIT STAFF FORM */}
            {editingStaff && (
            <div className="mb-8 bg-white border border-gray-200 rounded-2xl p-6">
                <h2 className="text-xl font-bold text-gray-900">
                Edit Staff Member
                </h2>

                <p className="text-gray-500 mt-1">
                Update {editingStaff.name}'s details.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-6">

                {/* NAME */}
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Name
                    </label>

                    <input
                    type="text"
                    value={editStaff.name}
                    onChange={(e) =>
                        setEditStaff({
                        ...editStaff,
                        name: e.target.value,
                        })
                    }
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                {/* EMAIL */}
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Email
                    </label>

                    <input
                    type="email"
                    value={editStaff.email}
                    onChange={(e) =>
                        setEditStaff({
                        ...editStaff,
                        email: e.target.value,
                        })
                    }
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                {/* ROLE */}
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Role
                    </label>

                    <select
                    value={editStaff.role}
                    onChange={(e) =>
                        setEditStaff({
                        ...editStaff,
                        role: e.target.value,
                        })
                    }
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none"
                    >
                    <option value="waiter">Waiter</option>
                    <option value="kitchen">Kitchen</option>
                    <option value="billing">Billing</option>
                    <option value="admin">Admin</option>
                    </select>
                </div>

                </div>

                <div className="flex gap-3 mt-6">

                <button
                    onClick={updateStaff}
                    className="bg-black text-white px-5 py-3 rounded-xl font-semibold hover:bg-gray-800"
                >
                    Save Changes
                </button>

                <button
                    onClick={() => {
                    setEditingStaff(null);

                    setEditStaff({
                        name: "",
                        email: "",
                        role: "waiter",
                    });

                    setError("");
                    }}
                    className="border border-gray-300 text-gray-700 px-5 py-3 rounded-xl font-semibold hover:bg-gray-100"
                >
                    Cancel
                </button>

                </div>
            </div>
            )}

            {/* STAFF */}
            <section>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-bold">
                    Restaurant Staff
                </h2>

                <button
                    onClick={() => {
                    setShowAddForm(true);
                    setError("");
                    }}
                    className="bg-black text-white px-5 py-3 rounded-xl text-sm font-semibold hover:bg-gray-800"
                >
                    + Add Staff
                </button>
                </div>

              {staff.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
                  <p className="text-gray-500">
                    No staff members found.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

                  {staff.map((member) => (
                    <div
                      key={member.id}
                      className="bg-white border border-gray-200 rounded-2xl p-6"
                    >

                      <div className="flex items-start justify-between">

                        <div>
                          <p className="text-sm text-gray-500">
                            STAFF
                          </p>

                          <h3 className="text-xl font-bold mt-1">
                            {member.name}
                          </h3>
                        </div>

                        <button
                            onClick={async () => {
                                const supabase = createClient();

                                const { error: updateError } = await supabase.rpc(
                                  "toggle_staff_status",
                                  {
                                    p_staff_id: member.id,
                                  }
                                );

                                if (updateError) {
                                setError(
                                    `Failed to update staff: ${updateError.message}`
                                );
                                return;
                                }

                                setError("");

                                await loadStaff();
                            }}
                            className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer ${
                                member.is_active
                                ? "bg-green-100 text-green-700 hover:bg-green-200"
                                : "bg-red-100 text-red-700 hover:bg-red-200"
                            }`}
                            >
                            {member.is_active
                                ? "Active"
                                : "Inactive"}
                            </button>

                      </div>

                      <div className="mt-5">
                        <p className="text-sm text-gray-500">
                          Role
                        </p>

                        <p className="font-semibold mt-1 capitalize">
                          {member.role}
                        </p>
                      </div>

                      <div className="mt-4">
                        <p className="text-sm text-gray-500">
                          Email
                        </p>

                        <p className="font-medium mt-1 break-all">
                          {member.email || "No email"}
                        </p>
                      </div>

                      <button
                        onClick={() => {
                            setEditingStaff(member);

                            setEditStaff({
                            name: member.name,
                            email: member.email || "",
                            role: member.role,
                            });

                            setError("");
                        }}
                        className="mt-5 w-full border border-gray-300 text-gray-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-gray-100"
                        >
                        Edit Staff
                        </button>

                    </div>
                  ))}

                </div>
              )}

            </section>
          </>
        )}

      </div>
    </main>
  );
}
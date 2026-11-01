"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

type Category = {
  id: string;
  name: string;
  is_active: boolean;
};

type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category_id: string;
  is_available: boolean;
};

export default function MenuPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] =
    useState<string>("all");

  const [showCategoryForm, setShowCategoryForm] = useState(false);

  const [newCategory, setNewCategory] = useState({
    name: "",
    display_order: "0",
  });

  const [editingCategory, setEditingCategory] =
    useState<Category | null>(null);

  const [editCategory, setEditCategory] = useState({
    name: "",
    display_order: "0",
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({
        name: "",
        description: "",
        price: "",
        category_id: "",
        });
        const [editingItem, setEditingItem] =
        useState<MenuItem | null>(null);

        const [editItem, setEditItem] = useState({
        name: "",
        description: "",
        price: "",
        category_id: "",
        });
  useEffect(() => {
    loadMenu();
  }, []);

  async function loadMenu() {
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

    // Get categories
    const { data: categoryData, error: categoryError } =
      await supabase
        .from("menu_categories")
        .select("id, name, is_active")
        .eq("hotel_id", hotel.id)
        .order("name");

    if (categoryError) {
      setError(categoryError.message);
      setLoading(false);
      return;
    }

    // Get menu items
    const { data: itemData, error: itemError } =
      await supabase
        .from("menu_items")
        .select(
          "id, name, description, price, category_id, is_available"
        )
        .eq("hotel_id", hotel.id)
        .order("name");

    if (itemError) {
      setError(itemError.message);
      setLoading(false);
      return;
    }

    setCategories(categoryData || []);

    setMenuItems(
      (itemData || []).map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        price: Number(item.price),
        category_id: item.category_id,
        is_available: item.is_available,
      }))
    );

    setLoading(false);
  }

  const filteredItems =
    selectedCategory === "all"
      ? menuItems
      : menuItems.filter(
          (item) =>
            item.category_id === selectedCategory
        );

  function getCategoryName(categoryId: string) {
    const category = categories.find(
      (category) => category.id === categoryId
    );

    return category?.name || "Other";
  }
  async function createCategory() {
    if (!newCategory.name.trim()) {
      setError("Please enter a category name.");
      return;
    }

    const supabase = createClient();

    const { error: createError } = await supabase.rpc(
      "create_menu_category",
      {
        p_name: newCategory.name.trim(),
        p_display_order: Number(newCategory.display_order) || 0,
      }
    );

    if (createError) {
      setError(createError.message);
      return;
    }

    setNewCategory({
      name: "",
      display_order: "0",
    });

    setShowCategoryForm(false);
    setError("");

    await loadMenu();
  }

  async function updateCategory() {
    if (!editingCategory) {
      return;
    }

    if (!editCategory.name.trim()) {
      setError("Please enter a category name.");
      return;
    }

    const supabase = createClient();

    const { error: updateError } = await supabase.rpc(
      "update_menu_category",
      {
        p_category_id: editingCategory.id,
        p_name: editCategory.name.trim(),
        p_display_order:
          Number(editCategory.display_order) || 0,
      }
    );

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setEditingCategory(null);

    setEditCategory({
      name: "",
      display_order: "0",
    });

    setError("");

    await loadMenu();
  }

  async function toggleCategoryStatus(category: Category) {
    const supabase = createClient();

    const { error: toggleError } = await supabase.rpc(
      "toggle_menu_category_status",
      {
        p_category_id: category.id,
      }
    );

    if (toggleError) {
      setError(toggleError.message);
      return;
    }

    setError("");

    await loadMenu();
  }

  async function deleteCategory(category: Category) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${category.name}"?`
    );

    if (!confirmed) {
      return;
    }

    const supabase = createClient();

    const { error: deleteError } = await supabase.rpc(
      "delete_menu_category",
      {
        p_category_id: category.id,
      }
    );

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    if (selectedCategory === category.id) {
      setSelectedCategory("all");
    }

    setError("");

    await loadMenu();
  }



  async function addMenuItem() {
    if (!newItem.name.trim()) {
        setError("Please enter an item name.");
        return;
    }

    if (!newItem.price || Number(newItem.price) <= 0) {
        setError("Please enter a valid price.");
        return;
    }

    if (!newItem.category_id) {
        setError("Please select a category.");
        return;
    }

    const supabase = createClient();

    // Get hotel
    const { data: hotel, error: hotelError } =
        await supabase
        .from("hotels")
        .select("id")
        .eq("slug", "dineflow-demo")
        .single();

    if (hotelError || !hotel) {
        setError("Hotel not found.");
        return;
    }

    // Insert menu item
    const { error: insertError } = await supabase.rpc(
      "create_menu_item",
      {
        p_category_id: newItem.category_id,
        p_name: newItem.name.trim(),
        p_description: newItem.description.trim(),
        p_price: Number(newItem.price),
      }
    );

    if (insertError) {
        setError(insertError.message);
        return;
    }

    // Reset form
    setNewItem({
        name: "",
        description: "",
        price: "",
        category_id: "",
    });

    setShowAddForm(false);

    // Reload menu
    await loadMenu();
    }
    async function updateMenuItem() {
    if (!editingItem) {
        return;
    }

    if (!editItem.name.trim()) {
        setError("Please enter an item name.");
        return;
    }

    if (!editItem.price || Number(editItem.price) <= 0) {
        setError("Please enter a valid price.");
        return;
    }

    if (!editItem.category_id) {
        setError("Please select a category.");
        return;
    }

    const supabase = createClient();

    const { error: updateError } = await supabase.rpc(
      "update_menu_item",
      {
        p_item_id: editingItem.id,
        p_name: editItem.name.trim(),
        p_description: editItem.description.trim(),
        p_price: Number(editItem.price),
        p_category_id: editItem.category_id,
      }
    );

    if (updateError) {
        setError(updateError.message);
        return;
    }

    setEditingItem(null);

    setEditItem({
        name: "",
        description: "",
        price: "",
        category_id: "",
    });

    setError("");

    await loadMenu();
    }
    
    async function toggleAvailability(item: MenuItem) {
    const supabase = createClient();

    console.log("Toggling item:", item.id, item.name);
    console.log("Current availability:", item.is_available);

    const { error } = await supabase.rpc(
      "toggle_menu_item_availability",
      {
        p_item_id: item.id,
      }
    );


    console.log("Update error:", error);

    if (error) {
        setError(`Failed to update: ${error.message}`);
        return;
    }

    setError("");

    await loadMenu();
    }

    async function deleteMenuItem(item: MenuItem) {
    const confirmed = window.confirm(
        `Are you sure you want to delete "${item.name}"?`
    );

    if (!confirmed) {
        return;
    }

    const supabase = createClient();

    const { error: deleteError } = await supabase.rpc(
      "delete_menu_item",
      {
        p_item_id: item.id,
      }
    );

    if (deleteError) {
        setError(`Failed to delete item: ${deleteError.message}`);
        return;
    }

    setError("");

    await loadMenu();
    }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl font-semibold">
          Loading menu...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100">

      {/* HEADER */}
      <header className="bg-black text-white">
        <div className="max-w-7xl mx-auto px-6 py-6">

          <div className="flex items-center justify-between">

            <div>
              <h1 className="text-3xl font-bold">
                Menu Management
              </h1>

              <p className="text-gray-400 mt-1">
                Manage your restaurant menu
              </p>
            </div>

            <a
              href="/admin"
              className="bg-white text-black px-4 py-2 rounded-xl font-semibold hover:bg-gray-200"
            >
              ← Admin
            </a>

          </div>

        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">

        {/* ERROR */}
        {error && (
          <div className="bg-red-100 border border-red-300 text-red-700 rounded-xl p-4 mb-6">
            {error}
          </div>
        )}

        {/* SUMMARY */}
        <div className="grid sm:grid-cols-3 gap-5 mb-8">

          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <p className="text-gray-500">
              Total Items
            </p>

            <p className="text-3xl font-bold mt-2">
              {menuItems.length}
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <p className="text-gray-500">
              Available Items
            </p>

            <p className="text-3xl font-bold mt-2">
              {
                menuItems.filter(
                  (item) => item.is_available
                ).length
              }
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <p className="text-gray-500">
              Categories
            </p>

            <p className="text-3xl font-bold mt-2">
              {categories.length}
            </p>
          </div>

        </div>

        {/* CATEGORY FILTER */}
        <section className="bg-white rounded-2xl shadow-sm p-6 mb-6">

          <div className="flex items-center justify-between mb-5">

            <div>
              <h2 className="text-2xl font-bold">
                Categories
              </h2>

              <p className="text-gray-500 text-sm mt-1">
                Manage and filter menu categories.
              </p>
            </div>

            <button
              onClick={() => {
                setShowCategoryForm(true);
                setError("");
              }}
              className="bg-black text-white px-5 py-3 rounded-xl font-semibold hover:bg-gray-800"
            >
              + Add Category
            </button>

          </div>

          <div className="flex flex-wrap gap-3">

          {showCategoryForm && (
            <div className="bg-gray-50 rounded-2xl border p-5 mb-5">

              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold">
                    Add Category
                  </h3>

                  <p className="text-gray-500 text-sm mt-1">
                    Create a new menu category.
                  </p>
                </div>

                <button
                  onClick={() => {
                    setShowCategoryForm(false);
                    setError("");
                  }}
                  className="text-gray-500 text-2xl hover:text-black"
                >
                  ×
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-4">

                <div>
                  <label className="block font-semibold mb-2">
                    Category Name
                  </label>

                  <input
                    type="text"
                    value={newCategory.name}
                    onChange={(e) =>
                      setNewCategory({
                        ...newCategory,
                        name: e.target.value,
                      })
                    }
                    placeholder="e.g. Desserts"
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-black"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-2">
                    Display Order
                  </label>

                  <input
                    type="number"
                    min="0"
                    value={newCategory.display_order}
                    onChange={(e) =>
                      setNewCategory({
                        ...newCategory,
                        display_order: e.target.value,
                      })
                    }
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-black"
                  />
                </div>

              </div>

              <div className="flex gap-3 mt-5">

                <button
                  onClick={createCategory}
                  className="bg-green-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-700"
                >
                  Add Category
                </button>

                <button
                  onClick={() => {
                    setShowCategoryForm(false);
                    setError("");
                  }}
                  className="bg-gray-100 text-gray-700 px-6 py-3 rounded-xl font-semibold hover:bg-gray-200"
                >
                  Cancel
                </button>

              </div>

            </div>
          )}

            <button
              onClick={() =>
                setSelectedCategory("all")
              }
              className={`px-5 py-2 rounded-xl font-semibold ${
                selectedCategory === "all"
                  ? "bg-black text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              All Items
            </button>

            {categories.map((category) => (
              <div
                key={category.id}
                className="flex items-center gap-2"
              >

                <button
                  onClick={() =>
                    setSelectedCategory(category.id)
                  }
                  className={`px-5 py-2 rounded-xl font-semibold ${
                    selectedCategory === category.id
                      ? "bg-black text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {category.name}
                </button>

                <button
                  onClick={() => {
                    setEditingCategory(category);

                    setEditCategory({
                      name: category.name,
                      display_order: "0",
                    });

                    setError("");
                  }}
                  className="px-3 py-2 rounded-xl bg-blue-100 text-blue-700 hover:bg-blue-200 text-sm font-semibold"
                >
                  Edit
                </button>

                <button
                  onClick={() => toggleCategoryStatus(category)}
                  className={`px-3 py-2 rounded-xl text-sm font-semibold ${
                    category.is_active
                      ? "bg-green-100 text-green-700 hover:bg-green-200"
                      : "bg-red-100 text-red-700 hover:bg-red-200"
                  }`}
                >
                  {category.is_active
                    ? "Active"
                    : "Inactive"}
                </button>

                <button
                  onClick={() => deleteCategory(category)}
                  className="px-3 py-2 rounded-xl bg-red-100 text-red-700 hover:bg-red-200 text-sm font-semibold"
                >
                  Delete
                </button>

              </div>
            ))}

          </div>

        {/* EDIT CATEGORY FORM */}
        {editingCategory && (
          <div className="bg-white rounded-2xl shadow-sm border p-6 mb-6">

            <div className="flex items-center justify-between mb-5">

              <div>
                <h2 className="text-2xl font-bold">
                  Edit Category
                </h2>

                <p className="text-gray-500 text-sm mt-1">
                  Update the category details.
                </p>
              </div>

              <button
                onClick={() => {
                  setEditingCategory(null);
                  setError("");
                }}
                className="text-gray-500 text-2xl hover:text-black"
              >
                ×
              </button>

            </div>

            <div className="grid md:grid-cols-2 gap-5">

              <div>
                <label className="block font-semibold mb-2">
                  Category Name
                </label>

                <input
                  type="text"
                  value={editCategory.name}
                  onChange={(e) =>
                    setEditCategory({
                      ...editCategory,
                      name: e.target.value,
                    })
                  }
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block font-semibold mb-2">
                  Display Order
                </label>

                <input
                  type="number"
                  min="0"
                  value={editCategory.display_order}
                  onChange={(e) =>
                    setEditCategory({
                      ...editCategory,
                      display_order: e.target.value,
                    })
                  }
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-black"
                />
              </div>

            </div>

            <div className="flex gap-3 mt-6">

              <button
                onClick={updateCategory}
                className="bg-black text-white px-6 py-3 rounded-xl font-semibold hover:bg-gray-800"
              >
                Save Changes
              </button>

              <button
                onClick={() => {
                  setEditingCategory(null);
                  setError("");
                }}
                className="bg-gray-100 text-gray-700 px-6 py-3 rounded-xl font-semibold hover:bg-gray-200"
              >
                Cancel
              </button>

            </div>

          </div>
        )}

        {/* EDIT ITEM FORM */}
        {editingItem && (
        <div className="bg-white rounded-2xl shadow-sm border p-6 mb-6">

            <div className="flex items-center justify-between mb-5">

            <div>
                <h2 className="text-2xl font-bold">
                Edit Menu Item
                </h2>

                <p className="text-gray-500 text-sm mt-1">
                Update the details of {editingItem.name}.
                </p>
            </div>

            <button
                onClick={() => {
                setEditingItem(null);
                setError("");
                }}
                className="text-gray-500 text-2xl hover:text-black"
            >
                ×
            </button>

            </div>

            <div className="grid md:grid-cols-2 gap-5">

            {/* NAME */}
            <div>
                <label className="block font-semibold mb-2">
                Item Name
                </label>

                <input
                type="text"
                value={editItem.name}
                onChange={(e) =>
                    setEditItem({
                    ...editItem,
                    name: e.target.value,
                    })
                }
                className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-black"
                />
            </div>

            {/* PRICE */}
            <div>
                <label className="block font-semibold mb-2">
                Price
                </label>

                <input
                type="number"
                min="1"
                value={editItem.price}
                onChange={(e) =>
                    setEditItem({
                    ...editItem,
                    price: e.target.value,
                    })
                }
                className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-black"
                />
            </div>

            {/* CATEGORY */}
            <div>
                <label className="block font-semibold mb-2">
                Category
                </label>

                <select
                value={editItem.category_id}
                onChange={(e) =>
                    setEditItem({
                    ...editItem,
                    category_id: e.target.value,
                    })
                }
                className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-black"
                >
                <option value="">
                    Select category
                </option>

                {categories
                    .filter((category) => category.is_active)
                    .map((category) => (
                    <option
                        key={category.id}
                        value={category.id}
                    >
                        {category.name}
                    </option>
                    ))}
                </select>
            </div>

            {/* DESCRIPTION */}
            <div>
                <label className="block font-semibold mb-2">
                Description
                </label>

                <input
                type="text"
                value={editItem.description}
                onChange={(e) =>
                    setEditItem({
                    ...editItem,
                    description: e.target.value,
                    })
                }
                className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-black"
                />
            </div>

            </div>

            {/* ACTIONS */}
            <div className="flex gap-3 mt-6">

            <button
                onClick={updateMenuItem}
                className="bg-black text-white px-6 py-3 rounded-xl font-semibold hover:bg-gray-800"
            >
                Save Changes
            </button>

            <button
                onClick={() => {
                setEditingItem(null);
                setError("");
                }}
                className="bg-gray-100 text-gray-700 px-6 py-3 rounded-xl font-semibold hover:bg-gray-200"
            >
                Cancel
            </button>

            </div>

        </div>
        )}

        </section>

        {/* MENU ITEMS */}
        <section>
            {/* ADD ITEM FORM */}
            {showAddForm && (
            <div className="bg-white rounded-2xl shadow-sm border p-6 mb-6">

                <div className="flex items-center justify-between mb-5">

                <div>
                    <h2 className="text-2xl font-bold">
                    Add Menu Item
                    </h2>

                    <p className="text-gray-500 text-sm mt-1">
                    Add a new item to your restaurant menu.
                    </p>
                </div>

                <button
                    onClick={() => {
                    setShowAddForm(false);
                    setError("");
                    }}
                    className="text-gray-500 text-2xl hover:text-black"
                >
                    ×
                </button>

                </div>

                <div className="grid md:grid-cols-2 gap-5">

                {/* NAME */}
                <div>
                    <label className="block font-semibold mb-2">
                    Item Name
                    </label>

                    <input
                    type="text"
                    value={newItem.name}
                    onChange={(e) =>
                        setNewItem({
                        ...newItem,
                        name: e.target.value,
                        })
                    }
                    placeholder="e.g. Masala Dosa"
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-black"
                    />
                </div>

                {/* PRICE */}
                <div>
                    <label className="block font-semibold mb-2">
                    Price
                    </label>

                    <input
                    type="number"
                    min="1"
                    value={newItem.price}
                    onChange={(e) =>
                        setNewItem({
                        ...newItem,
                        price: e.target.value,
                        })
                    }
                    placeholder="e.g. 180"
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-black"
                    />
                </div>

                {/* CATEGORY */}
                <div>
                    <label className="block font-semibold mb-2">
                    Category
                    </label>

                    <select
                    value={newItem.category_id}
                    onChange={(e) =>
                        setNewItem({
                        ...newItem,
                        category_id: e.target.value,
                        })
                    }
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-black"
                    >
                    <option value="">
                        Select category
                    </option>

                    {categories
                        .filter((category) => category.is_active)
                        .map((category) => (
                        <option
                            key={category.id}
                            value={category.id}
                        >
                            {category.name}
                        </option>
                        ))}
                    </select>
                </div>

                {/* DESCRIPTION */}
                <div>
                    <label className="block font-semibold mb-2">
                    Description
                    </label>

                    <input
                    type="text"
                    value={newItem.description}
                    onChange={(e) =>
                        setNewItem({
                        ...newItem,
                        description: e.target.value,
                        })
                    }
                    placeholder="e.g. Crispy dosa served with chutney"
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-black"
                    />
                </div>

                </div>

                {/* ACTIONS */}
                <div className="flex gap-3 mt-6">

                <button
                    onClick={addMenuItem}
                    className="bg-green-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-700"
                >
                    Add Menu Item
                </button>

                <button
                    onClick={() => {
                    setShowAddForm(false);
                    setError("");
                    }}
                    className="bg-gray-100 text-gray-700 px-6 py-3 rounded-xl font-semibold hover:bg-gray-200"
                >
                    Cancel
                </button>

                </div>

            </div>
            )}

          <div className="flex items-center justify-between mb-5">

            <div>
                <h2 className="text-2xl font-bold">
                Menu Items
                </h2>

                <p className="text-gray-500 text-sm mt-1">
                {filteredItems.length} items shown
                </p>
            </div>

            <button
                onClick={() => {
                setShowAddForm(true);
                setError("");
                }}
                className="bg-black text-white px-5 py-3 rounded-xl font-semibold hover:bg-gray-800"
            >
                + Add Item
            </button>

            </div>

          {filteredItems.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center">
              <div className="text-5xl">
                🍽️
              </div>

              <h3 className="text-xl font-bold mt-4">
                No menu items
              </h3>

              <p className="text-gray-500 mt-2">
                There are no items in this category.
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">

              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl shadow-sm border overflow-hidden"
                >

                  <div className="p-5">

                    <div className="flex items-start justify-between gap-3">

                      <div>
                        <span className="text-xs font-semibold uppercase text-blue-600">
                          {getCategoryName(
                            item.category_id
                          )}
                        </span>

                        <h3 className="text-xl font-bold mt-1">
                          {item.name}
                        </h3>
                      </div>

                      <button
                        onClick={() => toggleAvailability(item)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer ${
                            item.is_available
                            ? "bg-green-100 text-green-700 hover:bg-green-200"
                            : "bg-red-100 text-red-700 hover:bg-red-200"
                        }`}
                        >
                        {item.is_available
                            ? "Available"
                            : "Unavailable"}
                        </button>

                    </div>

                    <p className="text-gray-500 text-sm mt-3 min-h-[40px]">
                      {item.description ||
                        "Freshly prepared for you"}
                    </p>

                    <div className="flex items-center justify-between mt-5">

                      <p className="text-2xl font-bold">
                        ₹{item.price.toFixed(2)}
                      </p>

                      <div className="flex gap-2">
                        <button
                            onClick={() => {
                            setEditingItem(item);

                            setEditItem({
                                name: item.name,
                                description: item.description || "",
                                price: String(item.price),
                                category_id: item.category_id,
                            });

                            setError("");
                            }}
                            className="border border-gray-300 text-gray-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-gray-100"
                        >
                            Edit
                        </button>

                        <button
                            onClick={() => deleteMenuItem(item)}
                            className="border border-red-300 text-red-600 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-red-50"
                        >
                            Delete
                        </button>
                        </div>

                    </div>

                  </div>

                </div>
              ))}

            </div>
          )}

        </section>

      </div>

    </main>
  );
}
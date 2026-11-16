"use client";

import React, { useEffect, useState, useCallback } from "react";

interface Todo {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
}

export default function TodoPage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Reload todos from backend
  const refreshTodos = useCallback(async () => {
    try {
      const res = await fetch("/api");
      if (res.ok) {
        const data = await res.json();
        setTodos(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to load todos", err);
    }
  }, []);

  useEffect(() => {
    let active = true;

    fetch("/api")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (active) {
          setTodos(Array.isArray(data) ? data : []);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Failed to load todos", err);
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  // Create Todo (POST /api)
  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      });

      if (res.ok) {
        const newTodo: Todo = await res.json();
        setTodos((prev) => [newTodo, ...prev]);
        setTitle("");
      }
    } catch (err) {
      console.error("Failed to add todo", err);
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Complete (PATCH /api)
  const handleToggleComplete = async (todo: Todo) => {
    // Optimistic update
    setTodos((prev) =>
      prev.map((t) => (t.id === todo.id ? { ...t, completed: !t.completed } : t))
    );

    try {
      const res = await fetch(`/api?id=${encodeURIComponent(todo.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !todo.completed }),
      });

      if (!res.ok) {
        refreshTodos();
      }
    } catch (err) {
      console.error("Failed to toggle todo", err);
      refreshTodos();
    }
  };

  // Delete Todo (DELETE /api?id=...)
  const handleDelete = async (id: string) => {
    // Optimistic update
    setTodos((prev) => prev.filter((t) => t.id !== id));

    try {
      const res = await fetch(`/api?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        refreshTodos();
      }
    } catch (err) {
      console.error("Failed to delete todo", err);
      refreshTodos();
    }
  };

  const completedCount = todos.filter((t) => t.completed).length;

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-100 p-4 sm:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Todo App</h1>
            <p className="text-sm text-slate-500 dark:text-zinc-400">
              Simple task manager with Go in-memory API
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="px-2.5 py-1 rounded-full bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300">
              Total: {todos.length}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              Done: {completedCount}
            </span>
          </div>
        </div>

        {/* Create Form */}
        <form
          onSubmit={handleAddTodo}
          className="flex gap-2 bg-white dark:bg-zinc-900 p-3 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm"
        >
          <input
            type="text"
            placeholder="Add a new task..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={submitting}
            className="flex-1 px-3.5 py-2 rounded-lg border border-slate-300 dark:border-zinc-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={submitting || !title.trim()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
          >
            {submitting ? "Adding..." : "Add"}
          </button>
        </form>

        {/* Table View */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-zinc-800 bg-slate-50/75 dark:bg-zinc-800/40 text-slate-500 dark:text-zinc-400 font-semibold text-xs uppercase tracking-wider">
                  <th className="py-3 px-4 w-12 text-center">Status</th>
                  <th className="py-3 px-4">Task</th>
                  <th className="py-3 px-4 w-28">Created</th>
                  <th className="py-3 px-4 w-36 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-slate-400">
                      Loading tasks...
                    </td>
                  </tr>
                ) : todos.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-slate-400">
                      No tasks yet. Add one above!
                    </td>
                  </tr>
                ) : (
                  todos.map((todo) => (
                    <tr
                      key={todo.id}
                      className={`hover:bg-slate-50/50 dark:hover:bg-zinc-800/50 transition-colors ${
                        todo.completed ? "bg-slate-50/30 dark:bg-zinc-900/40" : ""
                      }`}
                    >
                      {/* Status / Checkbox */}
                      <td className="py-3 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={todo.completed}
                          onChange={() => handleToggleComplete(todo)}
                          aria-label={`Mark "${todo.title}" as complete`}
                          className="h-4 w-4 rounded border-slate-300 dark:border-zinc-600 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                      </td>

                      {/* Task Title */}
                      <td className="py-3 px-4">
                        <span
                          className={`font-medium transition-all ${
                            todo.completed
                              ? "line-through text-slate-400 dark:text-zinc-500"
                              : "text-slate-800 dark:text-zinc-100"
                          }`}
                        >
                          {todo.title}
                        </span>
                      </td>

                      {/* Created Date */}
                      <td className="py-3 px-4 text-xs text-slate-400">
                        {todo.createdAt}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                        <button
                          onClick={() => handleToggleComplete(todo)}
                          className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                            todo.completed
                              ? "bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:hover:bg-amber-900/80 dark:text-amber-300"
                              : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/80 dark:text-emerald-300"
                          }`}
                        >
                          {todo.completed ? "Undo" : "Complete"}
                        </button>
                        <button
                          onClick={() => handleDelete(todo.id)}
                          className="px-2.5 py-1 text-xs font-medium rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:hover:bg-rose-900/80 dark:text-rose-300 transition-colors cursor-pointer"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}

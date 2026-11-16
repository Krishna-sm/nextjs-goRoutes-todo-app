package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"
)

// Todo represents a simple task item
type Todo struct {
	ID        string `json:"id"`
	Title     string `json:"title"`
	Completed bool   `json:"completed"`
	CreatedAt string `json:"createdAt"`
}

var (
	mu    sync.RWMutex
	todos = []Todo{
		{
			ID:        "1",
			Title:     "Design simple table todo UI",
			Completed: true,
			CreatedAt: "Nov 16",
		},
		{
			ID:        "2",
			Title:     "Implement Go route handlers",
			Completed: false,
			CreatedAt: "Nov 16",
		},
		{
			ID:        "3",
			Title:     "Connect frontend with Go backend",
			Completed: false,
			CreatedAt: "Nov 16",
		},
	}
)

func setJSON(w http.ResponseWriter) {
	w.Header().Set("Content-Type", "application/json")
}

// GET returns all todos
func GET(w http.ResponseWriter, r *http.Request) {
	mu.RLock()
	defer mu.RUnlock()

	setJSON(w)
	result := todos
	if result == nil {
		result = []Todo{}
	}
	json.NewEncoder(w).Encode(result)
}

// POST creates a new todo
func POST(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Title string `json:"title"`
	}

	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil || input.Title == "" {
		http.Error(w, `{"error":"Title is required"}`, http.StatusBadRequest)
		return
	}

	newTodo := Todo{
		ID:        fmt.Sprintf("%d", time.Now().UnixNano()),
		Title:     input.Title,
		Completed: false,
		CreatedAt: time.Now().Format("Jan 02"),
	}

	mu.Lock()
	todos = append([]Todo{newTodo}, todos...)
	mu.Unlock()

	setJSON(w)
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(newTodo)
}

// PATCH toggles completion or updates a todo
func PATCH(w http.ResponseWriter, r *http.Request) {
	var input struct {
		ID        string `json:"id"`
		Completed *bool  `json:"completed,omitempty"`
	}

	id := r.URL.Query().Get("id")

	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	if err := json.NewDecoder(r.Body).Decode(&input); err == nil && input.ID != "" {
		id = input.ID
	}

	if id == "" {
		http.Error(w, `{"error":"ID is required"}`, http.StatusBadRequest)
		return
	}

	mu.Lock()
	defer mu.Unlock()

	for i := range todos {
		if todos[i].ID == id {
			if input.Completed != nil {
				todos[i].Completed = *input.Completed
			} else {
				todos[i].Completed = !todos[i].Completed
			}
			setJSON(w)
			json.NewEncoder(w).Encode(todos[i])
			return
		}
	}

	http.Error(w, `{"error":"Todo not found"}`, http.StatusNotFound)
}

// Patch alias for PATCH
func Patch(w http.ResponseWriter, r *http.Request) {
	PATCH(w, r)
}

// DELETE deletes a todo by id
func DELETE(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")

	if id == "" && r.Body != nil {
		var input struct {
			ID string `json:"id"`
		}
		_ = json.NewDecoder(r.Body).Decode(&input)
		id = input.ID
	}

	if id == "" {
		http.Error(w, `{"error":"ID is required"}`, http.StatusBadRequest)
		return
	}

	mu.Lock()
	defer mu.Unlock()

	found := false
	updated := make([]Todo, 0, len(todos))
	for _, todo := range todos {
		if todo.ID == id {
			found = true
			continue
		}
		updated = append(updated, todo)
	}

	if !found {
		http.Error(w, `{"error":"Todo not found"}`, http.StatusNotFound)
		return
	}

	todos = updated
	setJSON(w)
	json.NewEncoder(w).Encode(map[string]any{
		"success": true,
		"id":      id,
	})
}

// Delete alias for DELETE
func Delete(w http.ResponseWriter, r *http.Request) {
	DELETE(w, r)
}

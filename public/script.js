// Check if user is logged in and token is valid
if (!localStorage.getItem('token') || isTokenExpired(localStorage.getItem('token'))) {
    window.location.href = '/login.html';
}

let todos = [];
const todoInput = document.getElementById('todoInput');
const todoList = document.getElementById('todoList');
const dustbin = document.querySelector('.dustbin');

// Load todos when page loads
loadTodos();
updateUserInfo();

function updateUserInfo() {
    const userInfo = localStorage.getItem('user');
    if (userInfo) {
        const user = JSON.parse(userInfo);
        const userNameElement = document.getElementById('userName');
        userNameElement.textContent = user.name || user.email;
    }
}

async function loadTodos() {
    try {
        const response = await fetch('/api/todos', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        if (response.ok) {
            todos = await response.json();
            renderTodos();
        } else {
            console.error('Failed to load todos');
            if (response.status === 401) {
                showNotification('Session expired. Please login again.', 'error');
                logout(); // Token expired or invalid
            } else {
                showNotification('Failed to load todos', 'error');
            }
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error loading todos', 'error');
    }
}

function renderTodos() {
    todoList.innerHTML = '';
    todos.forEach(todo => {
        const li = document.createElement('li');
        li.className = `todo-item ${todo.completed ? 'completed' : ''}`;
        li.dataset.id = todo.id;
        li.innerHTML = `
            <span class="todo-text">${escapeHtml(todo.text)}</span>
            <div class="todo-actions">
                <button class="action-btn edit-btn" onclick="editTodo(${todo.id})" ${todo.completed ? 'disabled' : ''}>
                    <i class="fas fa-pencil-alt"></i>
                </button>
                <button class="action-btn complete-btn" onclick="toggleTodo(${todo.id})">
                    <i class="fas ${todo.completed ? 'fa-undo' : 'fa-check'}"></i>
                </button>
                <button class="action-btn delete-btn" onclick="startDeleteAnimation(${todo.id}, this)">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        todoList.appendChild(li);
    });

    // Update empty state
    if (todos.length === 0) {
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-state';
        emptyState.innerHTML = `
            <i class="fas fa-tasks"></i>
            <p>No todos yet! Add your first task above.</p>
        `;
        todoList.appendChild(emptyState);
    }
}

function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

async function addTodo() {
    const text = todoInput.value.trim();
    if (!text) {
        showNotification('Please enter a task', 'error');
        return;
    }

    try {
        const response = await fetch('/api/todos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ text })
        });

        if (response.ok) {
            const newTodo = await response.json();
            todos.push(newTodo);
            renderTodos();
            todoInput.value = '';

            // Add appear animation to the new todo
            const newTodoElement = document.querySelector(`[data-id="${newTodo.id}"]`);
            if (newTodoElement) {
                newTodoElement.classList.add('appear');
                setTimeout(() => newTodoElement.classList.remove('appear'), 500);
            }
            showNotification('Todo added successfully!');
        } else if (response.status === 401) {
            showNotification('Session expired. Please login again.', 'error');
            logout();
        } else {
            showNotification('Failed to add todo', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error adding todo', 'error');
    }
}

async function toggleTodo(id) {
    try {
        const response = await fetch(`/api/todos/${id}/toggle`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            const todo = todos.find(t => t.id === id);
            if (todo) {
                todo.completed = !todo.completed;
                if (todo.completed) {
                    celebrateTodoCompletion();
                }
                renderTodos();
                showNotification(todo.completed ? 'Task completed!' : 'Task uncompleted');
            }
        } else if (response.status === 401) {
            showNotification('Session expired. Please login again.', 'error');
            logout();
        } else {
            showNotification('Failed to update todo', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error updating todo', 'error');
    }
}

function startDeleteAnimation(id, buttonElement) {
    // Prevent double-clicks
    buttonElement.disabled = true;

    const todoElement = document.querySelector(`[data-id="${id}"]`);
    if (!todoElement) return;

    // Get the original position and dimensions
    const originalRect = todoElement.getBoundingClientRect();

    // Create a clone for the animation
    const clone = todoElement.cloneNode(true);
    clone.style.position = 'fixed';
    clone.style.top = originalRect.top + 'px';
    clone.style.left = originalRect.left + 'px';
    clone.style.width = originalRect.width + 'px';
    clone.style.height = originalRect.height + 'px';
    clone.style.margin = '0';
    clone.classList.add('flying');
    document.body.appendChild(clone);

    // Hide the original
    todoElement.style.opacity = '0';

    // Show the dustbin
    dustbin.classList.add('show');

    // Get positions for animation
    const dustbinRect = dustbin.getBoundingClientRect();

    // Calculate the distance to move
    const moveX = dustbinRect.left - originalRect.left + (dustbinRect.width - originalRect.width) / 2;
    const moveY = dustbinRect.top - originalRect.top;

    // Start the animation
    requestAnimationFrame(() => {
        clone.style.transform = `translate(${moveX}px, ${moveY}px) rotate(10deg)`;
        clone.classList.add('fade-out');
    });

    // Clean up and delete after animation
    setTimeout(() => {
        clone.remove();
        dustbin.classList.remove('show');
        deleteTodo(id);
    }, 800);
}

async function deleteTodo(id) {
    try {
        const response = await fetch(`/api/todos/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            todos = todos.filter(todo => todo.id !== id);
            renderTodos();
            showNotification('Todo deleted successfully!');
        } else if (response.status === 401) {
            showNotification('Session expired. Please login again.', 'error');
            logout();
        } else {
            showNotification('Failed to delete todo', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error deleting todo', 'error');
    }
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    // Trigger the fade in animation
    setTimeout(() => notification.classList.add('show'), 100);

    // Remove the notification after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function celebrateTodoCompletion() {
    confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
    });
}

// Handle enter key in todo input
todoInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addTodo();
    }
});

const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();

// Configure CORS
app.use(cors({
    origin: ['https://daily-task-management-zmdu.onrender.com'],
    credentials: true
  }));
app.use(express.json());
app.use(express.static('public'));

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// MongoDB connection
// mongoose.connect('mongodb://localhost:27017/ToDoApp').then(() => {
//     console.log('Connected to MongoDB successfully');
// }).catch(err => {
//     console.error('MongoDB connection error:', err);
// });

// MongoDB connection
// mongoose.connect('mongodb+srv://yashkumargupta:MmhkPUSkWonHZoKR@todoapp.abdmx.mongodb.net/?retryWrites=true&w=majority&appName=ToDoApp').then(() => {

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ToDoApp').then(() => {
    console.log('Connected to MongoDB successfully');
}).catch(err => {
    console.error('MongoDB connection error:', err);
});

// User Schema with todos
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    todos: [{
        id: Number,
        text: String,
        completed: Boolean,
        createdAt: { type: Date, default: Date.now }
    }]
});

const User = mongoose.model('User', userSchema);

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Authentication required' });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            console.error('Token verification error:', err);
            return res.status(403).json({ message: 'Invalid token' });
        }
        req.user = decoded;
        next();
    });
};

// Auth Routes
app.post('/api/signup', async (req, res) => {
    try {
        console.log('Signup request received:', req.body);
        const { name, email, password } = req.body;

        // Log the request body
        console.log('Request Body:', { name, email, password });

        if (!name || !email || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({
            name,
            email,
            password: hashedPassword,
            todos: []
        });

        await user.save();
        console.log('User created successfully:', { name, email });
        res.status(201).json({ message: 'User created successfully' });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ message: 'Error creating user' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Check password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Create token
        const token = jwt.sign(
            { id: user._id, email: user.email },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Send response without password
        const userResponse = {
            id: user._id,
            name: user.name,
            email: user.email
        };

        res.json({
            token,
            user: userResponse,
            message: 'Login successful'
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Error during login' });
    }
});

// Todo Routes
app.get('/api/todos', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user.todos);
    } catch (error) {
        console.error('Get todos error:', error);
        res.status(500).json({ message: 'Error fetching todos' });
    }
});

app.post('/api/todos', authenticateToken, async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) {
            return res.status(400).json({ message: 'Todo text is required' });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const newTodo = {
            id: Date.now(),
            text,
            completed: false,
            createdAt: new Date()
        };

        user.todos.push(newTodo);
        await user.save();

        res.status(201).json(newTodo);
    } catch (error) {
        console.error('Create todo error:', error);
        res.status(500).json({ message: 'Error creating todo' });
    }
});

app.put('/api/todos/:id/toggle', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const todo = user.todos.find(t => t.id === parseInt(req.params.id));
        if (!todo) {
            return res.status(404).json({ message: 'Todo not found' });
        }

        todo.completed = !todo.completed;
        await user.save();

        res.json(todo);
    } catch (error) {
        console.error('Toggle todo error:', error);
        res.status(500).json({ message: 'Error updating todo' });
    }
});

app.delete('/api/todos/:id', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.todos = user.todos.filter(t => t.id !== parseInt(req.params.id));
        await user.save();

        res.json({ message: 'Todo deleted successfully' });
    } catch (error) {
        console.error('Delete todo error:', error);
        res.status(500).json({ message: 'Error deleting todo' });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

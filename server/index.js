const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(bodyParser.json());

// MySQL Connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'sakibspfurious@786',
  database: 'database chat_app'
});

db.connect((err) => {
  if (err) {
    throw err;
  }
  console.log('MySQL Connected...');
});

app.post('/register', async (req, res) => {
  const { name, email, phone, role, password } = req.body;

  if (!name || !email || !phone || !role || !password) {
    return res.status(400).json({ success: false, message: 'All fields are required' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const query = "INSERT INTO users (name, email, phone, role, password) VALUES (?, ?, ?, ?, ?)";
    db.query(query, [name, email, phone, role, hashedPassword], (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Error registering user' });
      }
      res.json({ success: true });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and Password are required' });
  }

  const query = "SELECT * FROM users WHERE email = ?";
  db.query(query, [email], async (err, results) => {
    if (err) {
      console.error("Error querying database:", err);
      return res.status(500).json({ success: false, message: 'Database query error' });
    }
    if (results.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid email or password' });
    }

    const user = results[0];

    console.log("Retrieved user:", user);
    console.log("Hashed password from DB:", user.password);

    try {
      if (!user.password) {
        return res.status(400).json({ success: false, message: 'Password not found for user' });
      }
      
      const isMatch = await bcrypt.compare(password, user.password);
      if (isMatch) {
        res.json({ success: true, user: { name: user.name, role: user.role, email: user.email } });
      } else {
        res.status(400).json({ success: false, message: 'Invalid email or password' });
      }
    } catch (error) {
      console.error("Error comparing passwords:", error);
      res.status(500).json({ success: false, message: 'Server error during password comparison' });
    }
  });
});

app.get('/user/:email', (req, res) => {
  const email = req.params.email;
  const query = "SELECT name, email, phone, role FROM users WHERE email = ?";
  
  db.query(query, [email], (err, results) => {
    if (err) {
      console.error("Error querying database:", err);
      return res.status(500).json({ success: false, message: 'Database query error' });
    }
    if (results.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, user: results[0] });
  });
});


app.put('/user/:email', async (req, res) => {
  const { name, email: newEmail, role } = req.body;
  const oldEmail = req.params.email;
  if (!name || !newEmail || !role) {
    return res.status(400).json({ success: false, message: 'All fields are required' });
  }

  const query = "UPDATE users SET name = ?, email = ?, role = ? WHERE email = ?";
  db.query(query, [name, newEmail, role, oldEmail], (err, result) => {
    if (err) {
      console.error("Error updating user:", err);
      return res.status(500).json({ success: false, message: 'Error updating user' });
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    res.json({ success: true, message: 'User information updated' });
  });
});

app.delete('/user/:email', (req, res) => {
  const email = req.params.email;
  const query = "DELETE FROM users WHERE email = ?";
  
  db.query(query, [email], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Error deleting user' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, message: 'User account deleted' });
  });
});
io.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('join', ({ username }) => {
    io.emit('message', { sender: 'system', msg: `${username} has joined the chat` });
  });

  socket.on('message', ({ sender, msg }) => {
    io.emit('message', { sender, msg });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/collaborative-editor', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Document Schema
const documentSchema = new mongoose.Schema({
  title: String,
  content: String,
  lastModified: { type: Date, default: Date.now }
});

const Document = mongoose.model('Document', documentSchema);

// Socket.IO Connection
io.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('join-document', async (documentId) => {
    socket.join(documentId);
    const document = await Document.findById(documentId);
    if (document) {
      socket.emit('load-document', document.content);
    }
  });

  socket.on('send-changes', (delta) => {
    socket.broadcast.to(delta.documentId).emit('receive-changes', delta);
  });

  socket.on('save-document', async (data) => {
    await Document.findByIdAndUpdate(data.documentId, {
      content: data.content,
      lastModified: Date.now()
    });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// API Routes
app.post('/api/documents', async (req, res) => {
  try {
    const document = new Document({
      title: req.body.title || 'Untitled Document',
      content: ''
    });
    await document.save();
    res.json(document);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/documents/:id', async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    res.json(document);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 
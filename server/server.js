const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

// Presence storage
const activeRooms = {}; // { tripId: { socketId: userDetails } }

io.on('connection', (socket) => {
  socket.on('join-trip', ({ tripId, user }) => {
    socket.join(`trip:${tripId}`);
    
    if (!activeRooms[tripId]) activeRooms[tripId] = {};
    activeRooms[tripId][socket.id] = user;
    
    io.to(`trip:${tripId}`).emit('presence-update', Object.values(activeRooms[tripId]));
  });

  socket.on('editing-activity', ({ tripId, activityId, userName }) => {
    socket.to(`trip:${tripId}`).emit('user-editing', { activityId, userName });
  });

  socket.on('stop-editing-activity', ({ tripId, activityId }) => {
    socket.to(`trip:${tripId}`).emit('user-stop-editing', { activityId });
  });

  socket.on('disconnect', () => {
    for (const tripId in activeRooms) {
      if (activeRooms[tripId][socket.id]) {
        delete activeRooms[tripId][socket.id];
        io.to(`trip:${tripId}`).emit('presence-update', Object.values(activeRooms[tripId]));
        break;
      }
    }
  });
});

const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

const tripRoutes = require('./routes/trips');
app.use('/api/trips', tripRoutes);

app.get('/health', (req, res) => res.send({ status: 'healthy' }));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

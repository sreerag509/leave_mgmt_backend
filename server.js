// Backend: Node.js with Express and MongoDB

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');


const app = express();
app.use(express.json());
// app.use(cors());
app.use(express.urlencoded({ extended: true })); 

mongoose.connect('mongodb://localhost:27017/mockDatabase', { useNewUrlParser: true, useUnifiedTopology: true })
.then(() => console.log("✅ Connected to MongoDB using Mongoose"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

const UserSchema = new mongoose.Schema({
  username: String,
  password: String,
  role: String
});

const ItemSchema = new mongoose.Schema({
    id: Number,
    employeeName: String,
    startDate: Date,
    endDate: Date,
    reason: String,
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected']
    }
});

const User = mongoose.model('User', UserSchema);
const Item = mongoose.model('Item', ItemSchema);



app.post('/register', async (req, res) => {

  const { username, password, role } = req.body;
  
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = new User({ username, password: hashedPassword, role });
  await user.save();
  res.send({ message: 'User registered' });
});

app.post('/login', async (req, res) => {
     const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).send({ message: 'Invalid credentials' });
  }
  const token = jwt.sign({ username, role: user.role }, 'secretKey', { expiresIn: '1h' });
  res.send({ token,role:user.role });
});

function authMiddleware(req, res, next) {
  const token = req.headers['authorization'];
  if (!token) return res.status(403).send({ message: 'Access denied' });
  jwt.verify(token, 'secretKey', (err, decoded) => {
    if (err) return res.status(403).send({ message: 'Invalid token' });
    req.user = decoded;
    next();
  });
}

app.post('/leaves', authMiddleware, async (req, res) => {
  // if (req.user.role !== 'admin') return res.status(403).send({ message: 'Forbidden' });
  const item = new Item({employeeName:req.user.username,...req.body});
  await item.save();
  res.send(item);
});

app.get('/leaves', authMiddleware, async (req, res) => {
  if (req.user.role === 'manager') {
    const items = await Item.find();
    res.send(items);
  }
  else{
    const items = await Item.find({employeeName:req.user.username});
    res.send(items);
  }
 
});

app.patch('/leaves/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'manager') return res.status(403).send({ message: 'Forbidden' });
  const item = await Item.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.send(item);
});

app.delete('/leaves/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'manager') return res.status(403).send({ message: 'Forbidden' });
  await Item.findByIdAndDelete(req.params.id);
  res.send({ message: 'Item deleted' });
});

app.listen(3000, () => console.log('Server running on port 3000'));

// Frontend: Angular application with CRUD, Dynamic Forms, and RBAC

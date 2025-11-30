import "dotenv/config";
import express from "express";
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { MongoClient, ServerApiVersion, ObjectId } from "mongodb";

const app = express();
const PORT = process.env.PORT || 3000;
// ES module: path import and __dirname setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const uri = process.env.MONGO_URI;

//Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Taken from stunning-octo-fortnight-hello-express class example
let db;
let erikasBooks; //hopefully where I keep all of my books...
async function connectDB() {
  try {
    await client.connect();
    db = client.db("personalLibrary"); // Database name
    erikasBooks = db.collection("books"); // Collection name
    console.log("Connected to MongoDB!");
  } catch (error) {
    console.error(
      "Looks like you did something wrong...Failed to connect to MongoDB:",
      error
    );
  }
}
connectDB();

app.use(express.static(join(__dirname, "public")));
app.use(express.json());

// Root route - serve the main auth page so users login first
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, "public", "auth.html"));
});

// Provide explicit routes for other pages
app.get('/library', (req, res) => {
  res.sendFile(join(__dirname, "public", "library.html"));
});

app.get('/library', (req, res) => {
  res.sendFile(join(__dirname, "public", "library.html"));
});

// JWT Secret (in production, this should be in .env file)
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-for-demo-only';

// JWT Middleware - Protect routes that require authentication
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    req.user = user; // Add user info to request
    next();
  });
}


app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Simple validation
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    if (password.length < 5) {
      return res.status(400).json({ error: 'Password must be at least 5 characters long' });
    }

    // Check if user already exists
    const existingUser = await db.collection('users').findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = { username, password: hashedPassword, createdAt: new Date() };
    const result = await db.collection('users').insertOne(user);

    console.log(`✅ New user registered: ${username}`);

    res.status(201).json({
      message: 'User registered successfully',
      userId: result.insertedId,
      username: username
    });
  } catch (error) {
    console.error('❌ Registration error:', error.message);
    res.status(500).json({ error: 'Failed to register user: ' + error.message });
  }
});

// Login user
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;


    // Simple validation
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Find user
    const user = await db.collection('users').findOne({ username });
    if (!user) {
      return res.status(400).json({ error: 'Invalid username or password' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Invalid username or password' });
    }

    // Create JWT token
    const tokenPayload = {
      userId: user._id,
      username: user.username
    };
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '24h' });

    console.log(`✅ User logged in: ${username}`);

    res.json({
      message: 'Login successful',
      token: token,
      user: { id: user._id, username: user.username }
    });
  } catch (error) {
    console.error('❌ Login error:', error.message);
    res.status(500).json({ error: 'Failed to login: ' + error.message });
  }
});

// Get current user info (protected route example)
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await db.collection('users').findOne(
      { _id: new ObjectId(req.user.userId) },
      { projection: { password: 0 } } // Don't return password
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get user info: ' + error.message });
  }
});

/*
endpoints for CRUD operations
all endpoints were derived from https://github.com/barrycumbie/stunning-octo-fortnight-hello-express
endpoints have been modified to fit this project.
*/

// Middleware to authenticate and attach user info from JWT
// function authenticateToken(req, res, next) {
//   const authHeader = req.headers["authorization"];
//   const token = authHeader && authHeader.split(" ")[1];
//   if (!token) return res.sendStatus(401);

//   jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
//     if (err) return res.sendStatus(403);
//     req.user = user; // user contains { id, email, ... }
//     next();
//   });
// }

// Creating a book entry - now tied to the logged-in user
app.post("/api/books", authenticateToken, async (req, res) => {
  try {
    const { title, author, genre, readStatus } = req.body;

    if (!title || !author || !genre || readStatus === undefined) {
      return res
        .status(400)
        .json({ error: "Please fill out the appropriate fields" });
    }

    const book = {
      title,
      author,
      genre,
      readStatus,
      createdAt: new Date(),
      userId: req.user.userId, // 👈 attach userId from JWT
    };

    const result = await db.collection("books").insertOne(book);

    console.log(`Congrats! Added: ${title}`);

    res.status(201).json({
      message: "Book added to library",
      bookId: result.insertedId,
      book: { ...book, _id: result.insertedId },
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to add book: " + error.message });
  }
});


// Reading library entries - now scoped to the logged-in user
app.get("/api/books", authenticateToken, async (req, res) => {
  try {
    // Only fetch books belonging to the logged-in user
    const books = await db
      .collection("books")
      .find({ userId: req.user.userId })   // 👈 use userId, not id
      .toArray();

    console.log(`Viewing books for user ${req.user.userId}`);
    res.json(books);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to fetch books: " + error.message });
  }
});



// Update a book entry - only if it belongs to the logged-in user
app.put("/api/books/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, author, genre, readStatus } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid book ID" });
    }

    const updatedBook = {
      title,
      author,
      genre,
      readStatus,
      updatedAt: new Date(),
    };

    // 👇 Ownership check: only update if this book belongs to the current user
    const result = await db.collection("books").updateOne(
      { _id: new ObjectId(id), userId: req.user.userId }, // filter by both id and userId
      { $set: updatedBook }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Book not found or not yours" });
    }

    console.log(`Updated book with ID: ${id} for user ${req.user.userId}`);
    res.json({ message: "Book updated successfully" });
  } catch (error) {
    console.error("Error updating book:", error);
    res.status(500).json({ error: "Failed to update book" });
  }
});


// Delete a book entry - only if it belongs to the logged-in user
app.delete("/api/books/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid book ID" });
    }

    // Ownership check: only delete if this book belongs to the current user
    const result = await db.collection("books").deleteOne({
      _id: new ObjectId(id),
      userId: req.user.userId,   // 👈 FIXED: use userId from JWT payload
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Book not found or not yours" });
    }

    console.log(`Deleted book with ID: ${id} for user ${req.user.userId}`);
    res.json({ message: "Book deleted successfully" });
  } catch (error) {
    console.error("Error deleting book:", error);
    res.status(500).json({ error: "Failed to delete book" });
  }
});


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

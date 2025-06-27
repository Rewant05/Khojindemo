const express = require("express");
const mysql = require("mysql2");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");
const multer = require("multer");

const app = express();
const PORT = 5000;
const SECRET_KEY = "your_secret_key";


console.log(" Connecting to DB: khojdb ");


app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// Multer setup
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage });

// MySQL connection
const db = mysql.createConnection({
  host: "sql12.freesqldatabase.com",
  user: "sql12787010",
  password: "BZxnTjmbVk",
  database: "sql12787010",
  port: 3306
});


db.connect((err) => {
  if (err) {
    console.error(" Database connection failed:", err);
    process.exit(1);
  }
  console.log(" MySQL Connected to khojdb");
});

app.get("/test-db", (req, res) => {
  db.query("SELECT DATABASE() AS db", (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ connectedTo: result[0].db });
  });
});

// Token verification 
const verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(403).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];
  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) return res.status(401).json({ message: "Unauthorized" });
    req.user = decoded;
    next();
  });
};

// Registration
app.post("/register", (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ message: "All fields required" });

  db.query("SELECT * FROM users WHERE email = ?", [email], (err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });
    if (results.length > 0)
      return res.status(400).json({ message: "Email already registered" });

    bcrypt.hash(password, 10, (err, hash) => {
      if (err) return res.status(500).json({ error: "Hashing error" });

      db.query(
        "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
        [name, email, hash],
        (err) => {
          if (err) return res.status(500).json({ error: "Insert error" });
          res.status(201).json({ message: "User registered" });
        }
      );
    });
  });
});

// Login
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: "All fields required" });

  db.query("SELECT * FROM users WHERE email = ?", [email], (err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });
    if (results.length === 0)
      return res.status(401).json({ message: "User not found" });

    bcrypt.compare(password, results[0].password, (err, match) => {
      if (err) return res.status(500).json({ error: "Compare error" });
      if (!match) return res.status(401).json({ message: "Invalid credentials" });

      const token = jwt.sign(
        { id: results[0].id, name: results[0].name, email: results[0].email },
        SECRET_KEY,
        { expiresIn: "1h" }
      );

      res.json({
        message: "Login successful",
        token,
        user: { name: results[0].name, email: results[0].email },
      });
    });
  });
});

// Report Lost Item
app.post("/report-lost", verifyToken, upload.single("image"), (req, res) => {
  const { item_name, description, location, date_lost } = req.body;
  const userId = req.user.id;
  const image_url = req.file ? `uploads/${req.file.filename}` : null;

  if (!item_name || !description || !location || !date_lost)
    return res.status(400).json({ message: "Missing fields" });

  const insertLost =
    "INSERT INTO lost_items (user_id, item_name, description, location, date_lost, image_url) VALUES (?, ?, ?, ?, ?, ?)";
  db.query(
    insertLost,
    [userId, item_name, description, location, date_lost, image_url],
    (err, result) => {
      if (err) return res.status(500).json({ message: "Insert error" });

      const lostId = result.insertId;

      const matchQuery =
        "SELECT id FROM found_items WHERE item_name = ? AND description = ? AND location = ?";
      db.query(matchQuery, [item_name, description, location], (err, matches) => {
        if (matches.length > 0) {
          const foundId = matches[0].id;
          db.query(
            "INSERT INTO matched_items (lost_item_id, found_item_id) VALUES (?, ?)",
            [lostId, foundId]
          );
          db.query("UPDATE lost_items SET status = 'Found' WHERE id = ?", [lostId]);
        }
        res.json({ message: "Lost item reported", id: lostId });
      });
    }
  );
});

// Report Found Item
app.post("/report-found", verifyToken, upload.single("image"), (req, res) => {
  const { item_name, description, location, date_found } = req.body;
  const userId = req.user.id;
  const image_url = req.file ? `uploads/${req.file.filename}` : null;

  if (!item_name || !description || !location || !date_found)
    return res.status(400).json({ message: "Missing fields" });

  const insertFound =
    "INSERT INTO found_items (user_id, item_name, description, location, date_found, image_url) VALUES (?, ?, ?, ?, ?, ?)";
  db.query(
    insertFound,
    [userId, item_name, description, location, date_found, image_url],
    (err, result) => {
      if (err) return res.status(500).json({ message: "Insert error" });

      const foundId = result.insertId;

      const matchQuery =
        "SELECT id FROM lost_items WHERE item_name = ? AND description = ? AND location = ?";
      db.query(matchQuery, [item_name, description, location], (err, matches) => {
        if (matches.length > 0) {
          const lostId = matches[0].id;
          db.query(
            "INSERT INTO matched_items (lost_item_id, found_item_id) VALUES (?, ?)",
            [lostId, foundId]
          );
          db.query("UPDATE lost_items SET status = 'Found' WHERE id = ?", [lostId]);
        }
        res.json({ message: "Found item reported", id: foundId });
      });
    }
  );
});

// Fetch items for user
app.get("/user-lost-items", verifyToken, (req, res) => {
  const userId = req.user.id;
  db.query(
    "SELECT item_name, description, status FROM lost_items WHERE user_id = ? ORDER BY created_at DESC",
    [userId],
    (err, results) => {
      if (err) return res.status(500).json({ message: "DB error" });
      res.json(results);
    }
  );
});


//Admin page

// Admin token verification
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(403).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];
  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) return res.status(401).json({ message: "Unauthorized" });
    req.user = decoded;
    next();
  });
};

// Only allow admin email
const checkAdmin = (req, res, next) => {
  if (req.user.email !== "admin@gmail.com") {
    return res.status(403).json({ message: "Access denied: Admins only" });
  }
  next();
};


// Get all users
app.get('/admin/users', authenticateToken, checkAdmin, async (req, res) => {
  try {
    const users = await User.find();  // Assuming Mongoose or your ORM
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Error fetching users" });
  }
});


////////////////////////////////////////
// Get all lost items
app.get('/admin/lost-items', authenticateToken, checkAdmin, async (req, res) => {
  try {
    const items = await LostItem.find();
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: "Error fetching lost items" });
  }
});

// Get all found items
app.get('/admin/found-items', authenticateToken, checkAdmin, async (req, res) => {
  try {
    const items = await FoundItem.find();
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: "Error fetching found items" });
  }
});

// Get all matched items
app.get('/admin/matched-items', authenticateToken, checkAdmin, async (req, res) => {
  try {
    const matches = await MatchedItem.find();
    res.json(matches);
  } catch (error) {
    res.status(500).json({ message: "Error fetching matched items" });
  }
});


// Start server
app.listen(PORT, () => {
  console.log(` Server running at http://localhost:${PORT}`);
});

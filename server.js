require("dotenv").config();

const express = require("express");
const mysql = require("mysql2");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 5000;
const SECRET_KEY = process.env.JWT_SECRET || "your_secret_key";

// -------------------------
// Basic setup
// -------------------------
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend + uploads
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// -------------------------
// Multer setup
// -------------------------
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/\s+/g, "-");
    cb(null, Date.now() + "-" + safeName);
  },
});
const upload = multer({ storage });

// -------------------------
// MySQL connection
// NOTE: no password set in your MySQL right now
// -------------------------
const db = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "khojdb",
});

db.connect((err) => {
  if (err) {
    console.error("Database connection failed:", err);
    process.exit(1);
  }
  console.log("MySQL Connected to khojdb");
});

// -------------------------
// Test routes
// -------------------------
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/test-db", (req, res) => {
  db.query("SELECT DATABASE() AS db", (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ connectedTo: result[0].db });
  });
});

// -------------------------
// Middleware
// -------------------------
const verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(403).json({ message: "Login required. No token provided." });
  }

  const token = authHeader.split(" ")[1];

  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) return res.status(401).json({ message: "Unauthorized" });
    req.user = decoded;
    next();
  });
};

// Keep admin logic simple for now
const checkAdmin = (req, res, next) => {
  if (req.user.email !== "admin@gmail.com") {
    return res.status(403).json({ message: "Access denied: Admins only" });
  }
  next();
};

// -------------------------
// Auth routes
// -------------------------
app.post("/register", (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "All fields required" });
  }

  db.query("SELECT * FROM users WHERE email = ?", [email], (err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });

    if (results.length > 0) {
      return res.status(400).json({ message: "Email already registered" });
    }

    bcrypt.hash(password, 10, (err, hash) => {
      if (err) return res.status(500).json({ error: "Hashing error" });

      db.query(
        "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
        [name, email, hash],
        (err) => {
          if (err) return res.status(500).json({ error: "Insert error" });
          res.status(201).json({ message: "User registered successfully" });
        }
      );
    });
  });
});

app.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "All fields required" });
  }

  db.query("SELECT * FROM users WHERE email = ?", [email], (err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });

    if (results.length === 0) {
      return res.status(401).json({ message: "User not found" });
    }

    bcrypt.compare(password, results[0].password, (err, match) => {
      if (err) return res.status(500).json({ error: "Compare error" });

      if (!match) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = jwt.sign(
        {
          id: results[0].id,
          name: results[0].name,
          email: results[0].email,
        },
        SECRET_KEY,
        { expiresIn: "1h" }
      );

      res.json({
        message: "Login successful",
        token,
        user: {
          id: results[0].id,
          name: results[0].name,
          email: results[0].email,
        },
      });
    });
  });
});

// -------------------------
// Lost / Found routes
// Initial matching = EXACTLY same logic style as your previous version
// item_name + description + location
// -------------------------

app.post("/report-lost", verifyToken, upload.single("image"), (req, res) => {
  const { item_name, description, location, date_lost } = req.body;
  const userId = req.user.id;
  const image_url = req.file ? `uploads/${req.file.filename}` : null;

  if (!item_name || !description || !location || !date_lost) {
    return res.status(400).json({ message: "Missing fields" });
  }

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
        if (err) return res.status(500).json({ message: "Match error" });

        if (matches.length > 0) {
          const foundId = matches[0].id;

          db.query(
            "INSERT IGNORE INTO matched_items (lost_item_id, found_item_id) VALUES (?, ?)",
            [lostId, foundId]
          );

          db.query("UPDATE lost_items SET status = 'Found' WHERE id = ?", [lostId]);
          db.query("UPDATE found_items SET status = 'Matched' WHERE id = ?", [foundId]);

          return res.json({
            message: "Lost item reported and a match was found",
            id: lostId,
            matched: true,
          });
        }

        res.json({
          message: "Lost item reported",
          id: lostId,
          matched: false,
        });
      });
    }
  );
});

app.post("/report-found", verifyToken, upload.single("image"), (req, res) => {
  const { item_name, description, location, date_found } = req.body;
  const userId = req.user.id;
  const image_url = req.file ? `uploads/${req.file.filename}` : null;

  if (!item_name || !description || !location || !date_found) {
    return res.status(400).json({ message: "Missing fields" });
  }

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
        if (err) return res.status(500).json({ message: "Match error" });

        if (matches.length > 0) {
          const lostId = matches[0].id;

          db.query(
            "INSERT IGNORE INTO matched_items (lost_item_id, found_item_id) VALUES (?, ?)",
            [lostId, foundId]
          );

          db.query("UPDATE lost_items SET status = 'Found' WHERE id = ?", [lostId]);
          db.query("UPDATE found_items SET status = 'Matched' WHERE id = ?", [foundId]);

          return res.json({
            message: "Found item reported and a match was found",
            id: foundId,
            matched: true,
          });
        }

        res.json({
          message: "Found item reported",
          id: foundId,
          matched: false,
        });
      });
    }
  );
});

// -------------------------
// User routes
// -------------------------
app.get("/user-lost-items", verifyToken, (req, res) => {
  const userId = req.user.id;

  db.query(
    "SELECT id, item_name, description, location, date_lost, image_url, status, created_at FROM lost_items WHERE user_id = ? ORDER BY created_at DESC",
    [userId],
    (err, results) => {
      if (err) return res.status(500).json({ message: "DB error" });
      res.json(results);
    }
  );
});

app.get("/user-found-items", verifyToken, (req, res) => {
  const userId = req.user.id;

  db.query(
    "SELECT id, item_name, description, location, date_found, image_url, status, created_at FROM found_items WHERE user_id = ? ORDER BY created_at DESC",
    [userId],
    (err, results) => {
      if (err) return res.status(500).json({ message: "DB error" });
      res.json(results);
    }
  );
});

app.get("/user-matches", verifyToken, (req, res) => {
  const userId = req.user.id;

  const sql = `
    SELECT
      m.id AS match_id,
      m.matched_at,
      l.id AS lost_id,
      l.item_name AS lost_item_name,
      l.description AS lost_description,
      l.location AS lost_location,
      l.status AS lost_status,
      f.id AS found_id,
      f.item_name AS found_item_name,
      f.description AS found_description,
      f.location AS found_location,
      f.status AS found_status
    FROM matched_items m
    JOIN lost_items l ON m.lost_item_id = l.id
    JOIN found_items f ON m.found_item_id = f.id
    WHERE l.user_id = ? OR f.user_id = ?
    ORDER BY m.matched_at DESC
  `;

  db.query(sql, [userId, userId], (err, results) => {
    if (err) return res.status(500).json({ message: "DB error" });
    res.json(results);
  });
});

// -------------------------
// Admin routes
// Fixed to use MySQL, not Mongoose
// -------------------------
app.get("/admin/users", verifyToken, checkAdmin, (req, res) => {
  db.query(
    "SELECT id, name, email, created_at FROM users ORDER BY created_at DESC",
    (err, results) => {
      if (err) return res.status(500).json({ message: "Error fetching users" });
      res.json(results);
    }
  );
});

app.get("/admin/lost-items", verifyToken, checkAdmin, (req, res) => {
  const sql = `
    SELECT l.*, u.name AS user_name, u.email AS user_email
    FROM lost_items l
    JOIN users u ON l.user_id = u.id
    ORDER BY l.created_at DESC
  `;

  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ message: "Error fetching lost items" });
    res.json(results);
  });
});

app.get("/admin/found-items", verifyToken, checkAdmin, (req, res) => {
  const sql = `
    SELECT f.*, u.name AS user_name, u.email AS user_email
    FROM found_items f
    JOIN users u ON f.user_id = u.id
    ORDER BY f.created_at DESC
  `;

  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ message: "Error fetching found items" });
    res.json(results);
  });
});

app.get("/admin/matched-items", verifyToken, checkAdmin, (req, res) => {
  const sql = `
    SELECT
      m.id,
      m.matched_at,
      l.item_name AS lost_item_name,
      l.description AS lost_description,
      l.location AS lost_location,
      f.item_name AS found_item_name,
      f.description AS found_description,
      f.location AS found_location
    FROM matched_items m
    JOIN lost_items l ON m.lost_item_id = l.id
    JOIN found_items f ON m.found_item_id = f.id
    ORDER BY m.matched_at DESC
  `;

  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ message: "Error fetching matched items" });
    res.json(results);
  });
});

// -------------------------
// Frontend auth guard helpers (optional)
// These return auth status so frontend can redirect if user is not logged in
// -------------------------
app.get("/me", verifyToken, (req, res) => {
  res.json({
    id: req.user.id,
    name: req.user.name,
    email: req.user.email,
  });
});



app.post("/partner-register", (req, res) => {
  const { name, type, location, email, description } = req.body;

  const sql = `
    INSERT INTO partners (name, type, location, email, description)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.query(sql, [name, type, location, email, description], (err) => {
    if (err) return res.status(500).json({ message: "Error" });

    res.json({ message: "Request submitted successfully" });
  });
});

// -------------------------
// Start server
// -------------------------
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

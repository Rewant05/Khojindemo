//New server.js but localy hosted
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

const {
  hybridMatchScore,
  suggestCategory,
  buildReportFeedback,
  answerFaq,
} = require("./matching");

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
  if (req.user.email !== "admin@khoj.in" || req.user.role !== "admin") {
    return res.status(403).json({ message: "Access denied: Admins only" });
  }
  next();
};


// -------------------------
// Admin Partner Routes
// -------------------------
app.get("/admin/partners", verifyToken, checkAdmin, (req, res) => {
  db.query(
    "SELECT id, name, type, location, email, description, status, created_at FROM partners ORDER BY created_at DESC",
    (err, results) => {
      if (err) {
        console.error("Partner fetch error:", err);
        return res.status(500).json({ message: "Error fetching partners" });
      }

      res.json(results);
    }
  );
});

app.put("/admin/partners/:id/status", verifyToken, checkAdmin, (req, res) => {
  const partnerId = req.params.id;
  const { status } = req.body;

  if (!["pending", "approved", "rejected"].includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  db.query(
    "UPDATE partners SET status = ? WHERE id = ?",
    [status, partnerId],
    (err, result) => {
      if (err) {
        console.error("Partner status update error:", err);
        return res.status(500).json({ message: "Error updating partner status" });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Partner request not found" });
      }

      res.json({ message: `Partner request ${status} successfully` });
    }
  );
});

//Admin things END here-------------------------------------------------------

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

  // -------------------------
  // Default Admin Login
  // -------------------------
  if (email === "admin@khoj.in" && password === "KhojAdmin@123") {
    const token = jwt.sign(
      {
        id: 0,
        name: "KHOJ Admin",
        email: "admin@khoj.in",
        role: "admin",
      },
      SECRET_KEY,
      { expiresIn: "2h" }
    );

    return res.json({
      message: "Admin login successful",
      token,
      user: {
        id: 0,
        name: "KHOJ Admin",
        email: "admin@khoj.in",
        role: "admin",
      },
    });
  }

  // -------------------------
  // Normal User Login
  // -------------------------
  db.query("SELECT * FROM users WHERE email = ?", [email], (err, results) => {
    if (err) {
      console.error("Login database error:", err);
      return res.status(500).json({ error: "Database error" });
    }

    if (results.length === 0) {
      return res.status(401).json({ message: "User not found" });
    }

    bcrypt.compare(password, results[0].password, (err, match) => {
      if (err) {
        console.error("Password compare error:", err);
        return res.status(500).json({ error: "Compare error" });
      }

      if (!match) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = jwt.sign(
        {
          id: results[0].id,
          name: results[0].name,
          email: results[0].email,
          role: "user",
        },
        SECRET_KEY,
        { expiresIn: "1h" }
      );

      return res.json({
        message: "Login successful",
        token,
        user: {
          id: results[0].id,
          name: results[0].name,
          email: results[0].email,
          role: "user",
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

//report lost changes 
// -------------------------
// Smart Matching Helpers
// -------------------------
function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getWords(text) {
  return normalizeText(text)
    .split(" ")
    .filter((word) => word.length > 1);
}

function calculateWordSimilarity(text1, text2) {
  const words1 = getWords(text1);
  const words2 = getWords(text2);

  if (words1.length === 0 || words2.length === 0) return 0;

  let common = 0;

  for (let word of words1) {
    if (words2.includes(word)) {
      common++;
    }
  }

  return common / Math.max(words1.length, words2.length);
}

function calculateDateScore(date1, date2) {
  if (!date1 || !date2) return 0;

  const d1 = new Date(date1);
  const d2 = new Date(date2);

  if (Number.isNaN(d1.getTime()) || Number.isNaN(d2.getTime())) return 0;

  const diffDays = Math.abs(d1 - d2) / (1000 * 60 * 60 * 24);

  if (diffDays <= 1) return 10;
  if (diffDays <= 3) return 7;
  if (diffDays <= 7) return 4;

  return 0;
}

function calculateMatchScore(lostItem, foundItem) {
  const itemScore =
    calculateWordSimilarity(lostItem.item_name, foundItem.item_name) * 40;

  const locationScore =
    calculateWordSimilarity(lostItem.location, foundItem.location) * 25;

  const descriptionScore =
    calculateWordSimilarity(lostItem.description, foundItem.description) * 25;

  const dateScore =
    calculateDateScore(lostItem.date_lost, foundItem.date_found);

  const totalScore = Math.round(
    itemScore + locationScore + descriptionScore + dateScore
  );

  const reasons = [];

  if (itemScore >= 20) reasons.push("similar item name");
  if (locationScore >= 10) reasons.push("similar location");
  if (descriptionScore >= 10) reasons.push("similar description");
  if (dateScore >= 4) reasons.push("nearby date");

  return {
    score: totalScore,
    reason: reasons.length ? reasons.join(", ") : "low similarity",
  };
}

//end here
app.post("/report-lost", verifyToken, upload.single("image"), (req, res) => {
  const { item_name, description, location, date_lost } = req.body;
  const userId = req.user.id;
  const image_url = req.file ? `uploads/${req.file.filename}` : null;

  if (!item_name || !description || !location || !date_lost) {
    return res.status(400).json({ message: "Missing fields" });
  }

  const category = suggestCategory({ item_name, description });

  const insertLost = `
    INSERT INTO lost_items
    (user_id, item_name, description, location, date_lost, image_url, category)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    insertLost,
    [userId, item_name, description, location, date_lost, image_url, category],
    (err, result) => {
      if (err) {
        console.error("Lost item insert error:", err);
        return res.status(500).json({ message: "Insert error", error: err.message });
      }

      const lostId = result.insertId;

      const lostItem = {
        id: lostId,
        item_name,
        description,
        location,
        date_lost,
        category,
      };

      const matchQuery = `
        SELECT id, item_name, description, location, date_found, category, status
        FROM found_items
        WHERE status = 'Available'
      `;

      db.query(matchQuery, (err, foundItems) => {
        if (err) {
          console.error("Lost item match error:", err);
          return res.status(500).json({ message: "Match error", error: err.message });
        }

        const scoredMatches = foundItems
          .map((foundItem) => {
            const scoreResult = hybridMatchScore(lostItem, foundItem);

            return {
              foundId: foundItem.id,
              score: scoreResult.score,
              confidence: scoreResult.confidence,
              explanation: scoreResult.explanation,
            };
          })
          .filter((match) => match.score >= 0.60)
          .sort((a, b) => b.score - a.score)
          .slice(0, 3);

        if (scoredMatches.length === 0) {
          return res.json({
            message: "Lost item reported. No possible match found yet.",
            id: lostId,
            matched: false,
          });
        }

        let completed = 0;
        let insertedCount = 0;

        scoredMatches.forEach((match) => {
          const insertMatch = `
            INSERT IGNORE INTO matched_items
            (lost_item_id, found_item_id, match_score, confidence_label, match_reason, status)
            VALUES (?, ?, ?, ?, ?, 'Pending Review')
          `;

          db.query(
            insertMatch,
            [
              lostId,
              match.foundId,
              Number((match.score * 100).toFixed(2)),
              match.confidence,
              match.explanation,
            ],
            (err, insertResult) => {
              completed++;

              if (err) {
                console.error("Pending match insert error:", err);
              } else if (insertResult.affectedRows > 0) {
                insertedCount++;
              }

              if (completed === scoredMatches.length) {
                return res.json({
                  message: "Lost item reported. Possible matches sent for admin review.",
                  id: lostId,
                  matched: insertedCount > 0,
                  pending_matches: insertedCount,
                  top_score: Number((scoredMatches[0].score * 100).toFixed(2)),
                  confidence: scoredMatches[0].confidence,
                  explanation: scoredMatches[0].explanation,
                });
              }
            }
          );
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

  const category = suggestCategory({ item_name, description });

  const insertFound = `
    INSERT INTO found_items
    (user_id, item_name, description, location, date_found, image_url, category)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    insertFound,
    [userId, item_name, description, location, date_found, image_url, category],
    (err, result) => {
      if (err) {
        console.error("Found item insert error:", err);
        return res.status(500).json({ message: "Insert error", error: err.message });
      }

      const foundId = result.insertId;

      const foundItem = {
        id: foundId,
        item_name,
        description,
        location,
        date_found,
        category,
      };

      const matchQuery = `
        SELECT id, item_name, description, location, date_lost, category, status
        FROM lost_items
        WHERE status = 'Pending'
      `;

      db.query(matchQuery, (err, lostItems) => {
        if (err) {
          console.error("Found item match error:", err);
          return res.status(500).json({ message: "Match error", error: err.message });
        }

        const scoredMatches = lostItems
          .map((lostItem) => {
            const scoreResult = hybridMatchScore(lostItem, foundItem);

            return {
              lostId: lostItem.id,
              score: scoreResult.score,
              confidence: scoreResult.confidence,
              explanation: scoreResult.explanation,
            };
          })
          .filter((match) => match.score >= 0.60)
          .sort((a, b) => b.score - a.score)
          .slice(0, 3);

        if (scoredMatches.length === 0) {
          return res.json({
            message: "Found item reported. No possible match found yet.",
            id: foundId,
            matched: false,
          });
        }

        let completed = 0;
        let insertedCount = 0;

        scoredMatches.forEach((match) => {
          const insertMatch = `
            INSERT IGNORE INTO matched_items
            (lost_item_id, found_item_id, match_score, confidence_label, match_reason, status)
            VALUES (?, ?, ?, ?, ?, 'Pending Review')
          `;

          db.query(
            insertMatch,
            [
              match.lostId,
              foundId,
              Number((match.score * 100).toFixed(2)),
              match.confidence,
              match.explanation,
            ],
            (err, insertResult) => {
              completed++;

              if (err) {
                console.error("Pending match insert error:", err);
              } else if (insertResult.affectedRows > 0) {
                insertedCount++;
              }

              if (completed === scoredMatches.length) {
                return res.json({
                  message: "Found item reported. Possible matches sent for admin review.",
                  id: foundId,
                  matched: insertedCount > 0,
                  pending_matches: insertedCount,
                  top_score: Number((scoredMatches[0].score * 100).toFixed(2)),
                  confidence: scoredMatches[0].confidence,
                  explanation: scoredMatches[0].explanation,
                });
              }
            }
          );
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
      m.match_score,
      m.confidence_label,
      m.match_reason,
      m.status AS match_status,

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
    WHERE (l.user_id = ? OR f.user_id = ?)
      AND m.status != 'Rejected'
    ORDER BY m.matched_at DESC
  `;

  db.query(sql, [userId, userId], (err, results) => {
    if (err) {
      console.error("User matches fetch error:", err);
      return res.status(500).json({ message: "DB error" });
    }

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
      m.match_score,
      m.confidence_label,
      m.match_reason,
      m.status AS match_status,

      l.id AS lost_id,
      l.item_name AS lost_item_name,
      l.description AS lost_description,
      l.location AS lost_location,
      l.status AS lost_status,
      l.category AS lost_category,

      f.id AS found_id,
      f.item_name AS found_item_name,
      f.description AS found_description,
      f.location AS found_location,
      f.status AS found_status,
      f.category AS found_category
    FROM matched_items m
    JOIN lost_items l ON m.lost_item_id = l.id
    JOIN found_items f ON m.found_item_id = f.id
    ORDER BY m.matched_at DESC
  `;
  db.query(sql, (err, results) => {
    if (err) {
      console.error("Admin matched items fetch error:", err);
      return res.status(500).json({ message: "Error fetching matched items" });
    }
    res.json(results);
  });
});

// -------------------------
// Admin Match Approval / Rejection Route
// -------------------------
app.put("/admin/matches/:id/status", verifyToken, checkAdmin, (req, res) => {
  const matchId = req.params.id;
  const { status } = req.body;

  if (!["Confirmed", "Rejected"].includes(status)) {
    return res.status(400).json({ message: "Invalid match status" });
  }

  const getMatchSql = `
    SELECT lost_item_id, found_item_id, status
    FROM matched_items
    WHERE id = ?
  `;

  db.query(getMatchSql, [matchId], (err, matches) => {
    if (err) {
      console.error("Match fetch error:", err);
      return res.status(500).json({ message: "Error fetching match" });
    }

    if (matches.length === 0) {
      return res.status(404).json({ message: "Match not found" });
    }

    const match = matches[0];

    if (status === "Rejected") {
      db.query(
        "UPDATE matched_items SET status = 'Rejected' WHERE id = ?",
        [matchId],
        (err) => {
          if (err) {
            console.error("Reject match error:", err);
            return res.status(500).json({ message: "Error rejecting match" });
          }

          return res.json({
            message: "Match rejected. Items remain searchable.",
          });
        }
      );

      return;
    }

    db.query(
      "UPDATE matched_items SET status = 'Confirmed' WHERE id = ?",
      [matchId],
      (err) => {
        if (err) {
          console.error("Confirm match error:", err);
          return res.status(500).json({ message: "Error confirming match" });
        }

        db.query(
          "UPDATE lost_items SET status = 'Found' WHERE id = ?",
          [match.lost_item_id],
          (err) => {
            if (err) {
              console.error("Lost item status update error:", err);
              return res.status(500).json({ message: "Error updating lost item" });
            }

            db.query(
              "UPDATE found_items SET status = 'Matched' WHERE id = ?",
              [match.found_item_id],
              (err) => {
                if (err) {
                  console.error("Found item status update error:", err);
                  return res.status(500).json({ message: "Error updating found item" });
                }

                return res.json({
                  message: "Match confirmed. Item statuses updated successfully.",
                });
              }
            );
          }
        );
      }
    );
  });
});

app.get("/admin/contact-messages", verifyToken, checkAdmin, (req, res) => {
  db.query(
    "SELECT * FROM contact_messages ORDER BY created_at DESC",
    (err, results) => {
      if (err) {
        console.error("Contact messages fetch error:", err);
        return res.status(500).json({ message: "Error fetching contact messages" });
      }

      res.json(results);
    }
  );
});
// -------------------------
// Admin Contact Message Status Update
// -------------------------
app.put("/admin/contact-messages/:id/status", verifyToken, checkAdmin, (req, res) => {
  const messageId = req.params.id;
  const { status } = req.body;

  if (!["Unread", "Read", "Resolved"].includes(status)) {
    return res.status(400).json({ message: "Invalid contact message status" });
  }

  const sql = `
    UPDATE contact_messages
    SET status = ?
    WHERE id = ?
  `;

  db.query(sql, [status, messageId], (err, result) => {
    if (err) {
      console.error("Contact message status update error:", err);
      return res.status(500).json({ message: "Error updating contact message status" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Contact message not found" });
    }

    res.json({
      message: `Contact message marked as ${status}`,
    });
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

  if (!name || !type || !location || !email) {
    return res.status(400).json({ message: "Please fill all required fields" });
  }

  const sql = `
    INSERT INTO partners (name, type, location, email, description, status)
    VALUES (?, ?, ?, ?, ?, 'pending')
  `;

  db.query(sql, [name, type, location, email, description || ""], (err) => {
    if (err) {
      console.error("Partner request error:", err);
      return res.status(500).json({ message: "Error submitting partner request" });
    }

    res.json({ message: "Partner request submitted successfully. Admin will review it soon." });
  });
});



//CONTACT US _-------------------
app.post("/contact", (req, res) => {
  const { name, email, subject, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ message: "Name, email and message are required" });
  }

  const sql = `
    INSERT INTO contact_messages (name, email, subject, message)
    VALUES (?, ?, ?, ?)
  `;

  db.query(sql, [name, email, subject || "", message], (err) => {
    if (err) {
      console.error("Contact message error:", err);
      return res.status(500).json({ message: "Error sending message" });
    }

    res.json({ message: "Message sent successfully. We will contact you soon." });
  });
});

// -------------------------
// Start server
// -------------------------
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

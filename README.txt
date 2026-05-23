# 🔍 KHOJ – Centralized Lost & Found Platform

KHOJ is a full-stack lost and found platform designed to make reporting, tracking, and matching lost/found items more structured and efficient.

The platform allows users to report lost or found items, upload item details/images, manage their reports, and discover possible matches. Unlike a basic static matching system, KHOJ now uses **GloVe-based semantic similarity** to compare lost and found reports based on meaning, not just exact keyword matches.

---

## 🚀 Key Features

- 🧾 **Report Lost Items** – Users can submit item name, description, location, and other details.
- 📦 **Report Found Items** – Users can report items they found with relevant information.
- 🔐 **Secure Authentication** – JWT-based login and protected routes.
- 🖼️ **Image Upload Support** – Item image handling using Multer.
- 🧠 **GloVe-Based Semantic Matching** – Matches lost and found reports using semantic similarity.
- 📍 **Field-Level Matching** – Compares item name, description, and location between lost/found reports.
- 📊 **User Dashboard** – Users can view and track their submitted reports.
- 🛠️ **Admin Dashboard Support** – Admin can manage reported lost/found records.
- 🌐 **Deployment Ready** – Frontend and backend can be deployed using services like Netlify and Render.

---

## 🧠 Smart Matching System

KHOJ includes a semantic matching system to improve the accuracy of lost/found item discovery.

Instead of relying only on exact keyword matching, the system compares:

- Lost item name ↔ Found item name
- Lost description ↔ Found description
- Lost location ↔ Found location

The matching logic uses **GloVe word embeddings** to calculate semantic similarity between text fields. This helps match reports even when two users describe the same item differently.

Example:

```text
Lost report: "black leather wallet near library"
Found report: "dark wallet found around reading area"
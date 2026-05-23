document.addEventListener("DOMContentLoaded", () => {
  const menuToggle = document.querySelector(".menu-toggle");
  const mobilePanel = document.querySelector(".mobile-panel");

  if (menuToggle && mobilePanel) {
    menuToggle.addEventListener("click", () => {
      mobilePanel.classList.toggle("open");
      menuToggle.setAttribute("aria-expanded", mobilePanel.classList.contains("open") ? "true" : "false");
    });
  }

  const yearLine = document.getElementById("year-line");
  if (yearLine) {
    yearLine.textContent = `© ${new Date().getFullYear()} KHOJ — Built for trusted recovery.`;
  }

  const revealItems = document.querySelectorAll(".reveal");
  if (revealItems.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    revealItems.forEach((item) => io.observe(item));
  }

  document.querySelectorAll(".file-input").forEach((input) => {
    input.addEventListener("change", () => {
      const target = document.getElementById(input.dataset.preview);
      if (!target) return;
      target.textContent = input.files.length ? input.files[0].name : "No file selected yet.";
    });
  });
});

async function handleLostFormSubmit(event) {
  event.preventDefault();

  const token = localStorage.getItem("token");
  if (!token) {
    alert("Please login first.");
    window.location.href = "login.html";
    return;
  }

  const itemName = document.getElementById("item_name").value.trim();
  const description = document.getElementById("description").value.trim();
  const location = document.getElementById("location").value.trim();
  const dateLost = document.getElementById("date_lost").value;
  const imageFile = document.getElementById("image").files[0];

  if (!itemName || !description || !location || !dateLost) {
    alert("Please fill all required fields.");
    return;
  }

  const formData = new FormData();
  formData.append("item_name", itemName);
  formData.append("description", description);
  formData.append("location", location);
  formData.append("date_lost", dateLost);

  if (imageFile) {
    formData.append("image", imageFile);
  }

  try {
    const response = await fetch("http://localhost:5000/report-lost", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await response.json();

    if (response.ok) {
      alert(data.message || "Lost item reported successfully.");
      document.getElementById("lostForm").reset();

      const preview = document.getElementById("lost-file-preview");
      if (preview) preview.textContent = "No file selected yet.";
    } else {
      alert(data.message || "Failed to report lost item.");
    }
  } catch (error) {
    console.error("Lost form submit error:", error);
    alert("Server error. Please try again.");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const lostForm = document.getElementById("lostForm");
  if (lostForm) {
    lostForm.addEventListener("submit", handleLostFormSubmit);
  }
});
async function handleRegisterSubmit(event) {
  event.preventDefault();

  const name = document.getElementById("name")?.value.trim();
  const email = document.getElementById("email")?.value.trim();
  const password = document.getElementById("password")?.value;
  const confirmPassword = document.getElementById("confirmPassword")?.value;

  if (!name || !email || !password || !confirmPassword) {
    alert("Please fill all fields.");
    return;
  }

  if (password !== confirmPassword) {
    alert("Passwords do not match.");
    return;
  }

  try {
    const response = await fetch("http://localhost:5000/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await response.json();

    if (response.ok) {
      alert(data.message || "Account created successfully.");
      window.location.href = "login.html";
    } else {
      alert(data.message || "Registration failed.");
    }
  } catch (error) {
    console.error("Register error:", error);
    alert("Server error. Please try again.");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const registerForm = document.getElementById("registerForm");
  if (registerForm) {
    registerForm.addEventListener("submit", handleRegisterSubmit);
  }
});



async function handleLoginSubmit(event) {
  event.preventDefault();

  const email = document.getElementById("loginEmail")?.value.trim();
  const password = document.getElementById("loginPassword")?.value;

  if (!email || !password) {
    alert("Please fill all fields.");
    return;
  }

  try {
    const response = await fetch("http://localhost:5000/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (response.ok) {
      alert(data.message || "Login successful!");

      localStorage.setItem("token", data.token);
      localStorage.setItem("name", data.user.name);
      localStorage.setItem("email", data.user.email);
      localStorage.setItem("role", data.user.role || "user");

      if (data.user.role === "admin") {
        window.location.href = "admin.html";
      } else {
        window.location.href = "dashboard.html";
      }
    } else {
      alert(data.message || "Login failed");
    }
  } catch (error) {
    console.error("Login error:", error);
    alert("Server error");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", handleLoginSubmit);
  }
});




function getToken() {
  return localStorage.getItem("token");
}

function getStoredName() {
  return localStorage.getItem("name");
}

function getStoredEmail() {
  return localStorage.getItem("email");
}

function updateNavbarUser() {
  const token = getToken();
  const name = getStoredName();

  const navUserBtn = document.getElementById("navUserBtn");
  const mobileNavUserBtn = document.getElementById("mobileNavUserBtn");

  if (token && name) {
    if (navUserBtn) {
      navUserBtn.textContent = name;
      navUserBtn.href = "dashboard.html";
    }

    if (mobileNavUserBtn) {
      mobileNavUserBtn.textContent = name;
      mobileNavUserBtn.href = "dashboard.html";
    }
  } else {
    if (navUserBtn) {
      navUserBtn.textContent = "Login";
      navUserBtn.href = "login.html";
    }

    if (mobileNavUserBtn) {
      mobileNavUserBtn.textContent = "Login";
      mobileNavUserBtn.href = "login.html";
    }
  }
}

function requireLoginOnDashboard() {
  const currentPage = window.location.pathname.split("/").pop();
  const protectedPages = ["dashboard.html", "report-lost.html", "report-found.html", "admin.html"];

  if (protectedPages.includes(currentPage) && !getToken()) {
    alert("Please login first.");
    window.location.href = "login.html";
    return;
  }

  if (currentPage === "admin.html") {
    const role = localStorage.getItem("role");
    const email = localStorage.getItem("email");

    if (role !== "admin" || email !== "admin@khoj.in") {
      alert("Admins only.");
      window.location.href = "dashboard.html";
    }
  }
}

async function loadDashboardData() {
  const currentPage = window.location.pathname.split("/").pop();
  if (currentPage !== "dashboard.html") return;

  const token = getToken();
  if (!token) return;

  const dashboardUserName = document.getElementById("dashboardUserName");
  const dashboardUserEmail = document.getElementById("dashboardUserEmail");
  const userNameStat = document.getElementById("userNameStat");
  const lostCount = document.getElementById("lostCount");
  const foundCount = document.getElementById("foundCount");
  const matchCount = document.getElementById("matchCount");
  const lostItemsContainer = document.getElementById("lostItemsContainer");

  try {
    // user info from localStorage
    const storedName = getStoredName();
    const storedEmail = getStoredEmail();

    if (dashboardUserName) dashboardUserName.textContent = storedName || "User";
    if (dashboardUserEmail) dashboardUserEmail.textContent = storedEmail || "Not available";
    if (userNameStat) userNameStat.textContent = storedName || "-";

    // load lost items
    const lostRes = await fetch("http://localhost:5000/user-lost-items", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const lostData = await lostRes.json();

    if (lostRes.ok) {
      if (lostCount) lostCount.textContent = lostData.length;

      if (lostItemsContainer) {
        if (lostData.length === 0) {
          lostItemsContainer.innerHTML = `<div class="notice">You have not reported any lost items yet.</div>`;
        } else {
          lostItemsContainer.innerHTML = lostData
            .map((item) => {
              const statusClass =
                item.status === "Found"
                  ? "success-chip"
                  : item.status === "Claimed"
                    ? "neutral-chip"
                    : "warning-chip";

              const dateText = item.date_lost
                ? new Date(item.date_lost).toLocaleDateString()
                : "No date";

              return `
                <article class="list-card">
                  <header>
                    <div>
                      <h3>${item.item_name}</h3>
                      <div class="meta-row">
                        <span>${item.location || "No location"}</span>
                        <span>${dateText}</span>
                      </div>
                    </div>
                    <span class="${statusClass}">${item.status}</span>
                  </header>
                  <p>${item.description || "No description provided."}</p>
                </article>
              `;
            })
            .join("");
        }
      }
    } else {
      if (lostItemsContainer) {
        lostItemsContainer.innerHTML = `<div class="notice">Failed to load lost items.</div>`;
      }
    }

    // load found items count
    const foundRes = await fetch("http://localhost:5000/user-found-items", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const foundData = await foundRes.json();
    if (foundRes.ok && foundCount) {
      foundCount.textContent = foundData.length;
    }

    // load matches count
    const matchRes = await fetch("http://localhost:5000/user-matches", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const matchData = await matchRes.json();
    if (matchRes.ok && matchCount) {
      matchCount.textContent = matchData.length;
    }
  } catch (error) {
    console.error("Dashboard load error:", error);
    if (lostItemsContainer) {
      lostItemsContainer.innerHTML = `<div class="notice">Server error while loading dashboard.</div>`;
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // existing functions
  updateNavbarUser();
  requireLoginOnDashboard();
  loadDashboardData();

  // 🔥 ADD THIS
  const foundForm = document.getElementById("foundForm");
  if (foundForm) {
    foundForm.addEventListener("submit", handleFoundFormSubmit);
  }
});
async function handleFoundFormSubmit(event) {
  event.preventDefault();

  const token = localStorage.getItem("token");
  if (!token) {
    alert("Please login first.");
    window.location.href = "login.html";
    return;
  }

  const itemName = document.getElementById("found_item_name")?.value.trim();
  const description = document.getElementById("found_description")?.value.trim();
  const location = document.getElementById("found_location")?.value.trim();
  const dateFound = document.getElementById("date_found")?.value;
  const imageFile = document.getElementById("found_image")?.files[0];

  if (!itemName || !description || !location || !dateFound) {
    alert("Please fill all required fields.");
    return;
  }

  const formData = new FormData();
  formData.append("item_name", itemName);
  formData.append("description", description);
  formData.append("location", location);
  formData.append("date_found", dateFound);

  if (imageFile) {
    formData.append("image", imageFile);
  }

  try {
    const response = await fetch("http://localhost:5000/report-found", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await response.json();

    if (response.ok) {
      alert(data.message || "Found item reported successfully.");
      document.getElementById("foundForm").reset();

      const preview = document.getElementById("found-file-preview");
      if (preview) preview.textContent = "No file selected yet.";
    } else {
      alert(data.message || "Failed to report found item.");
    }
  } catch (error) {
    console.error("Found form submit error:", error);
    alert("Server error. Please try again.");
  }
}


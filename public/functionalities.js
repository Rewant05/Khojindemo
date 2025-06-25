function openContactPage() {
    let button = document.querySelector(".contact-btn");
    let spinner = button.querySelector(".spinner");
    spinner.style.display = "inline-block";
    setTimeout(() => {
      window.location.href = "contact.html";
    }, 1000);
  }

  document.addEventListener("scroll", function () {
    document.querySelectorAll(".fade-in").forEach((section) => {
      const sectionTop = section.getBoundingClientRect().top;
      if (sectionTop < window.innerHeight - 50) {
        section.classList.add("show");
      }
    });
  });

  function toggleMenu() {
const navLinks = document.querySelector(".nav-links");
const hamburger = document.querySelector(".hamburger");
navLinks.classList.toggle("show");
hamburger.classList.toggle("active");
}

  function checkAuth() {
    const token = localStorage.getItem("token");
    const authLink = document.getElementById("authLink");
    const lostLink = document.getElementById("lostLink");
    const foundLink = document.getElementById("foundLink");
    const reportLostBtn = document.getElementById("reportLostBtn");
    const reportFoundBtn = document.getElementById("reportFoundBtn");

    if (token) {
      authLink.textContent = "Logout";
      authLink.href = "#";
      authLink.onclick = logout;
    } else {
      authLink.textContent = "Login";
      authLink.href = "login.html";
    }

    if (!token) {
      lostLink.onclick = () => {
        alert("You must be logged in to report a lost item.");
        return false;
      };
      foundLink.onclick = () => {
        alert("You must be logged in to report a found item.");
        return false;
      };
      reportLostBtn.onclick = (e) => {
        e.preventDefault();
        alert("You must be logged in to report a lost item.");
      };
      reportFoundBtn.onclick = (e) => {
        e.preventDefault();
        alert("You must be logged in to report a found item.");
      };
    }
  }

  function logout() {
    localStorage.removeItem("token");
    alert("Logged out successfully.");
    window.location.href = "index.html"; 
  }

  checkAuth();
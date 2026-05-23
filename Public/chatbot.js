/* ========================================================= */
/* KHOJ Futuristic AI Chatbot Logic */
/* ========================================================= */

const chatbotToggle = document.getElementById("chatbotToggle");
const chatbotWindow = document.getElementById("chatbotWindow");
const chatbotClose = document.getElementById("chatbotClose");
const chatbotMinimize = document.getElementById("chatbotMinimize");
const chatbotClear = document.getElementById("chatbotClear");
const chatbotForm = document.getElementById("chatbotForm");
const chatbotInput = document.getElementById("chatbotInput");
const chatbotMessages = document.getElementById("chatbotMessages");
const quickPromptButtons = document.querySelectorAll(".ai-quick-actions button");
const chatbotCanvas = document.getElementById("chatbotCanvas");

let chatOpenedOnce = false;

const welcomeMessage = `
  <div class="ai-message bot-message">
    <div class="message-meta">KHOJ AI</div>
    <div class="message-bubble">
      Hi Rewant 👋 I’m <b>KHOJ AI Sentinel</b>.<br><br>
      I can help users report lost items, submit found items, understand matching, verify claims, and guide partner centers.
    </div>
  </div>
`;

function openChatbot() {
  chatbotWindow.classList.add("open");
  chatbotCanvas.classList.add("active");

  if (window.gsap) {
    gsap.fromTo(
      chatbotWindow,
      {
        opacity: 0,
        y: 30,
        scale: 0.92,
        filter: "blur(8px)"
      },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        filter: "blur(0px)",
        duration: 0.45,
        ease: "power3.out"
      }
    );
  }

  if (!chatOpenedOnce) {
    chatOpenedOnce = true;
    setTimeout(() => {
      addBotMessage("System scan complete. KHOJ recovery assistant is ready ⚡");
    }, 700);
  }
}

function closeChatbot() {
  if (window.gsap) {
    gsap.to(chatbotWindow, {
      opacity: 0,
      y: 25,
      scale: 0.94,
      duration: 0.25,
      ease: "power2.in",
      onComplete: () => {
        chatbotWindow.classList.remove("open");
        chatbotCanvas.classList.remove("active");
      }
    });
  } else {
    chatbotWindow.classList.remove("open");
    chatbotCanvas.classList.remove("active");
  }
}

if (chatbotToggle && chatbotWindow) {
  chatbotToggle.addEventListener("click", () => {
    if (chatbotWindow.classList.contains("open")) {
      closeChatbot();
    } else {
      openChatbot();
    }
  });
}

if (chatbotClose) {
  chatbotClose.addEventListener("click", closeChatbot);
}

if (chatbotMinimize) {
  chatbotMinimize.addEventListener("click", closeChatbot);
}

if (chatbotClear) {
  chatbotClear.addEventListener("click", () => {
    chatbotMessages.innerHTML = welcomeMessage;
  });
}

function addUserMessage(text) {
  const messageDiv = document.createElement("div");
  messageDiv.className = "ai-message user-message";

  messageDiv.innerHTML = `
    <div class="message-meta">You</div>
    <div class="message-bubble">${escapeHTML(text)}</div>
  `;

  chatbotMessages.appendChild(messageDiv);
  scrollToBottom();
}

function addBotMessage(html) {
  const messageDiv = document.createElement("div");
  messageDiv.className = "ai-message bot-message";

  messageDiv.innerHTML = `
    <div class="message-meta">KHOJ AI</div>
    <div class="message-bubble">${html}</div>
  `;

  chatbotMessages.appendChild(messageDiv);
  scrollToBottom();
}

function showTypingIndicator() {
  const typingDiv = document.createElement("div");
  typingDiv.className = "ai-message bot-message";
  typingDiv.id = "typingIndicator";

  typingDiv.innerHTML = `
    <div class="message-meta">KHOJ AI</div>
    <div class="typing-bubble">
      <div class="typing-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  `;

  chatbotMessages.appendChild(typingDiv);
  scrollToBottom();
}

function removeTypingIndicator() {
  const typingIndicator = document.getElementById("typingIndicator");
  if (typingIndicator) typingIndicator.remove();
}

function scrollToBottom() {
  chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
}

function escapeHTML(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function getKhojBotReply(userQuestion) {
  const q = userQuestion.toLowerCase();

  if (
    q.includes("lost") ||
    q.includes("report lost") ||
    q.includes("lost item") ||
    q.includes("i lost")
  ) {
    return `
      To report a lost item, open the <b>Report Lost Item</b> page and add:
      <br><br>
      • Item name<br>
      • Description<br>
      • Last seen location<br>
      • Date and time<br>
      • Image, if available<br><br>
      The more specific the details, the stronger the match quality.
      <br><br>
      <a href="report-lost.html">Launch Lost Item Report →</a>
    `;
  }

  if (
    q.includes("found") ||
    q.includes("report found") ||
    q.includes("found item") ||
    q.includes("i found")
  ) {
    return `
      If someone found an item, they should submit a <b>Found Item Report</b>.
      <br><br>
      They should include item photo, location, date, item condition, and where the owner can claim it.
      <br><br>
      <a href="report-found.html">Launch Found Item Report →</a>
    `;
  }

  if (
    q.includes("match") ||
    q.includes("matching") ||
    q.includes("detect") ||
    q.includes("similar")
  ) {
    return `
      KHOJ’s matching engine can compare:
      <br><br>
      • Item category<br>
      • Description similarity<br>
      • Location proximity<br>
      • Date and time<br>
      • Uploaded images<br><br>
      Example: if a black wallet is lost near a metro station and a similar wallet is found nearby, KHOJ can mark it as a <b>possible match</b>.
    `;
  }

  if (
    q.includes("claim") ||
    q.includes("verify") ||
    q.includes("verification") ||
    q.includes("ownership") ||
    q.includes("owner")
  ) {
    return `
      For secure recovery, KHOJ should verify ownership before handover.
      <br><br>
      A user may need to prove:
      <br><br>
      • Hidden item details<br>
      • Photo proof<br>
      • Purchase bill<br>
      • ID proof for cards/documents<br>
      • Unique marks or scratches<br><br>
      This prevents fake claims and builds trust.
    `;
  }

  if (
    q.includes("partner") ||
    q.includes("institution") ||
    q.includes("college") ||
    q.includes("airport") ||
    q.includes("metro") ||
    q.includes("mall") ||
    q.includes("hotel")
  ) {
    return `
      KHOJ can onboard institutions like colleges, airports, malls, hotels, offices, and metro stations.
      <br><br>
      Partner centers can manage found items, upload inventory, and connect with users who lost similar items.
      <br><br>
      <a href="partner-register.html">Register as Partner Center →</a>
    `;
  }

  if (
    q.includes("login") ||
    q.includes("signup") ||
    q.includes("register") ||
    q.includes("account")
  ) {
    return `
      Users can create an account or login before reporting items.
      <br><br>
      This helps KHOJ track reports, show user-specific lost items, and notify them when matches appear.
      <br><br>
      <a href="login.html">Go to Login →</a>
    `;
  }

  if (
    q.includes("contact") ||
    q.includes("support") ||
    q.includes("email") ||
    q.includes("help")
  ) {
    return `
      For support, feedback, or partnership questions, users can contact the KHOJ team.
      <br><br>
      <a href="contact.html">Contact KHOJ →</a>
    `;
  }

  if (
    q.includes("safe") ||
    q.includes("security") ||
    q.includes("privacy") ||
    q.includes("trust")
  ) {
    return `
      KHOJ is designed around trust.
      <br><br>
      Important safety features should include:
      <br><br>
      • Login-based reporting<br>
      • Ownership verification<br>
      • Admin moderation<br>
      • Secure claim flow<br>
      • No direct handover without proof<br><br>
      This makes the platform serious enough for campuses, airports, malls, and public institutions.
    `;
  }

  if (
    q.includes("hello") ||
    q.includes("hi") ||
    q.includes("hey")
  ) {
    return `
      Hey 👋 I’m your KHOJ AI assistant.
      <br><br>
      Ask me about lost items, found items, item matching, claim verification, partner centers, or account help.
    `;
  }

  return `
    I can help with KHOJ-related questions like:
    <br><br>
    • How to report a lost item<br>
    • How to report a found item<br>
    • How matching works<br>
    • How claim verification works<br>
    • How partner centers register<br>
    • How users contact support<br><br>
    Try asking: <b>How does KHOJ match lost and found items?</b>
  `;
}

if (chatbotForm) {
  chatbotForm.addEventListener("submit", function (e) {
    e.preventDefault();

    const userQuestion = chatbotInput.value.trim();
    if (!userQuestion) return;

    addUserMessage(userQuestion);
    chatbotInput.value = "";

    showTypingIndicator();

    setTimeout(() => {
      removeTypingIndicator();
      const reply = getKhojBotReply(userQuestion);
      addBotMessage(reply);
    }, 850);
  });
}

quickPromptButtons.forEach(button => {
  button.addEventListener("click", () => {
    const question = button.getAttribute("data-question");
    chatbotInput.value = question;
    chatbotForm.dispatchEvent(new Event("submit"));
  });
});

/* ========================================================= */
/* Futuristic Particle Canvas */
/* ========================================================= */

const canvas = chatbotCanvas;
const ctx = canvas ? canvas.getContext("2d") : null;

let particles = [];
let mouse = {
  x: null,
  y: null
};

function resizeCanvas() {
  if (!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function createParticles() {
  particles = [];

  const totalParticles = window.innerWidth < 600 ? 35 : 75;

  for (let i = 0; i < totalParticles; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.45,
      vy: (Math.random() - 0.5) * 0.45,
      radius: Math.random() * 1.8 + 0.6
    });
  }
}

function drawParticles() {
  if (!ctx || !canvas) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  particles.forEach((p, index) => {
    p.x += p.vx;
    p.y += p.vy;

    if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
    if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(103, 232, 249, 0.75)";
    ctx.fill();

    for (let j = index + 1; j < particles.length; j++) {
      const p2 = particles[j];
      const dx = p.x - p2.x;
      const dy = p.y - p2.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 115) {
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = `rgba(103, 232, 249, ${1 - distance / 115})`;
        ctx.lineWidth = 0.45;
        ctx.stroke();
      }
    }

    if (mouse.x && mouse.y) {
      const dx = p.x - mouse.x;
      const dy = p.y - mouse.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 150) {
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(mouse.x, mouse.y);
        ctx.strokeStyle = `rgba(168, 85, 247, ${1 - distance / 150})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    }
  });

  requestAnimationFrame(drawParticles);
}

if (canvas && ctx) {
  resizeCanvas();
  createParticles();
  drawParticles();

  window.addEventListener("resize", () => {
    resizeCanvas();
    createParticles();
  });

  window.addEventListener("mousemove", e => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });

  window.addEventListener("mouseleave", () => {
    mouse.x = null;
    mouse.y = null;
  });
}
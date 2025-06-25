async function register() {
    const name = document.getElementById("regName").value;
    const email = document.getElementById("regEmail").value;
    const password = document.getElementById("regPassword").value;

    if (!name || !email || !password) {
        alert("All fields are required!");
        return;
    }

    try {
        const response = await fetch("http://localhost:5000/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password })
        });

        const data = await response.json();
        alert(data.message);

        if (response.ok) {
            window.location.href = "login.html"; // Redirect to login page after successful registration
        }
    } catch (error) {
        console.error("Error:", error);
        alert("Registration failed! Try again.");
    }
}

async function login() {
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;

    if (!email || !password) {
        alert("All fields are required!");
        return;
    }

    try {
        const response = await fetch("http://localhost:5000/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        alert(data.message);

        if (response.ok && data.token) {
            localStorage.setItem("token", data.token);
            localStorage.setItem("userName", data.user.name);
            localStorage.setItem("userEmail", data.user.email);
        
            if (data.user.email === "admin@gmail.com") {
                window.location.href = "admin.html";
            } else {
                window.location.href = "index.html";
            }
        }
        
    } catch (error) {
        console.error("Error:", error);
        alert("Login failed! Try again.");
    }
}

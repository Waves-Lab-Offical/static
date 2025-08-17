function alert2(success, msg) {
    const alertBox = document.createElement("div");
    alertBox.textContent = msg;

    // Core position & size
    alertBox.style.position = "fixed";
    alertBox.style.top = "20px";
    alertBox.style.right = "20px";
    alertBox.style.padding = "12px 18px";
    alertBox.style.borderRadius = "8px";
    alertBox.style.fontFamily = "monospace, sans-serif";
    alertBox.style.fontWeight = "bold";
    alertBox.style.color = "#fff";
    alertBox.style.fontSize = "16px";
    alertBox.style.textShadow = "0 0 6px rgba(0,0,0,0.8)";
    alertBox.style.zIndex = "9999";
    alertBox.style.opacity = "0";
    alertBox.style.transform = "scale(0.95)";
    alertBox.style.transition = "opacity 0.3s ease, transform 0.3s ease";

    // Colors for success / error
    if (success) {
        alertBox.style.backgroundColor = "rgba(40, 167, 69, 0.85)"; // translucent green
        alertBox.style.border = "2px solid rgba(0, 255, 100, 0.9)";
        alertBox.style.boxShadow = "0 0 12px rgba(0, 255, 100, 0.7)";
    } else {
        alertBox.style.backgroundColor = "rgba(220, 53, 69, 0.85)"; // translucent red
        alertBox.style.border = "2px solid rgba(255, 60, 60, 0.9)";
        alertBox.style.boxShadow = "0 0 12px rgba(255, 60, 60, 0.7)";
    }

    // Add to DOM
    document.body.appendChild(alertBox);

    // Fade & scale in
    requestAnimationFrame(() => {
        alertBox.style.opacity = "1";
        alertBox.style.transform = "scale(1)";
    });

    // Auto-hide after 3 seconds
    setTimeout(() => {
        alertBox.style.opacity = "0";
        alertBox.style.transform = "scale(0.95)";
        setTimeout(() => {
            alertBox.remove();
        }, 300);
    }, 3000);
}

export default alert2;
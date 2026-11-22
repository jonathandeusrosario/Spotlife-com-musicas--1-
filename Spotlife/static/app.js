document.querySelectorAll(".toggle-password").forEach((button) => {
    const input = document.getElementById(button.getAttribute("aria-controls"));
    const label = input.labels[0].textContent.toLowerCase();
    button.hidden = false;

    function updateButton(show) {
        button.textContent = show ? "Ocultar" : "Mostrar";
        button.setAttribute("aria-label", `${button.textContent}: ${label}`);
    }

    updateButton(false);
    button.addEventListener("click", () => {
        const show = input.type === "password";
        input.type = show ? "text" : "password";
        updateButton(show);
    });
});

const confirmation = document.getElementById("confirmation");
const password = document.getElementById("password");

if (confirmation) {
    const validateConfirmation = () => {
        const mismatch = confirmation.value && confirmation.value !== password.value;
        confirmation.setCustomValidity(mismatch ? "As senhas precisam ser iguais." : "");
    };

    confirmation.addEventListener("input", validateConfirmation);
    password.addEventListener("input", validateConfirmation);
    document.getElementById("auth-form").addEventListener("submit", (event) => {
        validateConfirmation();
        if (!confirmation.reportValidity()) {
            event.preventDefault();
        }
    });
}
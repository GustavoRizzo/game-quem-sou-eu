// Home page glue: copy the PIX "copia e cola" code to the clipboard.
import { track } from "./lib/analytics.js";

// Track when the "Ajude o projeto" support section is expanded.
const supportCard = document.querySelector(".card-support");

supportCard?.addEventListener("toggle", () => {
  if (supportCard.open) track("support_section_opened");
});

const button = document.getElementById("pix-copy");

button?.addEventListener("click", async () => {
  const code = button.dataset.pix;
  try {
    await navigator.clipboard.writeText(code);
    const original = button.textContent;
    button.textContent = "✅ Código copiado!";
    button.classList.add("copied");
    track("donation_pix_copied");
    setTimeout(() => {
      button.textContent = original;
      button.classList.remove("copied");
    }, 2000);
  } catch {
    // Clipboard blocked (e.g. insecure context): show the code so it can be copied by hand.
    button.textContent = "Copie: " + code;
  }
});

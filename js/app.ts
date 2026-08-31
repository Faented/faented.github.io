document.addEventListener("DOMContentLoaded", () => {
  const card = document.querySelector<HTMLDivElement>(".glass-card");
  if (!card) return;

  card.addEventListener("mouseenter", () => {
    card.style.backgroundColor = "rgba(255,255,255,0.25)";
  });
  card.addEventListener("mouseleave", () => {
    card.style.backgroundColor = "";
  });

  const icons = document.querySelectorAll<HTMLAnchorElement>(".social-icons a");
  icons.forEach((icon) => {
    icon.addEventListener("mouseenter", () => {
      icon.style.transform = "scale(1.3)";
    });
    icon.addEventListener("mouseleave", () => {
      icon.style.transform = "";
    });
  });
});

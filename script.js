const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const WHATSAPP = "5491165547782";

// Entrada del hero
window.addEventListener("load", () => document.body.classList.add("loaded"));

// Navegación, barra de progreso y parallax del plato principal
const nav = $("#nav");
const bar = $("#progress");
const heroImg = $(".arch img");
const onScroll = () => {
  nav.classList.toggle("scrolled", scrollY > 40);
  const max = document.documentElement.scrollHeight - innerHeight;
  bar.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
  if (scrollY < innerHeight) heroImg.style.transform = `scale(1.08) translateY(${scrollY * 0.05}px)`;
};
onScroll();
addEventListener("scroll", onScroll, { passive: true });

// Menú móvil
const burger = $("#burger");
const links = $("#links");
const toggleMenu = (open) => {
  links.classList.toggle("open", open);
  burger.setAttribute("aria-expanded", open);
  document.body.classList.toggle("lock", open);
};
burger.addEventListener("click", () => toggleMenu(!links.classList.contains("open")));
$$("a", links).forEach((a) => a.addEventListener("click", () => toggleMenu(false)));

// Cinta que se desplaza (se duplica el contenido para que el bucle sea continuo)
const track = $(".marquee__track");
track.innerHTML += track.innerHTML;

// Revelar elementos al entrar en pantalla
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add("in");
    io.unobserve(e.target);
  });
}, { threshold: 0.15 });
$$(".reveal").forEach((el) => io.observe(el));

// Resplandor que sigue al mouse en el hero
const hero = $("#inicio");
const glow = $("#glow");
hero.addEventListener("pointermove", (e) => {
  const r = hero.getBoundingClientRect();
  glow.style.setProperty("--x", `${e.clientX - r.left - 260}px`);
  glow.style.setProperty("--y", `${e.clientY - r.top - 260}px`);
});

// Botones "magnéticos"
$$(".btn").forEach((b) => {
  b.addEventListener("pointermove", (e) => {
    const r = b.getBoundingClientRect();
    b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.12}px, ${(e.clientY - r.top - r.height / 2) * 0.2}px)`;
  });
  b.addEventListener("pointerleave", () => (b.style.transform = ""));
});

// Inclinación 3D suave en imágenes
$$("[data-tilt]").forEach((el) => {
  el.addEventListener("pointermove", (e) => {
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(900px) rotateX(${(-py * 8).toFixed(2)}deg) rotateY(${(px * 10).toFixed(2)}deg)`;
  });
  el.addEventListener("pointerleave", () => (el.style.transform = ""));
});

// Pestañas del menú
$$(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    $$(".tab").forEach((t) => {
      t.classList.toggle("active", t === tab);
      t.setAttribute("aria-selected", t === tab);
    });
    $$(".panel").forEach((p) => p.classList.toggle("active", p.id === tab.dataset.tab));
  });
});

// Visor de imágenes (clic para ampliar, Esc o clic para cerrar)
const lb = $("#lightbox");
const lbImg = $("img", lb);
$$(".zoomable").forEach((img) => {
  img.addEventListener("click", () => {
    lbImg.src = img.currentSrc || img.src;
    lbImg.alt = img.alt;
    lb.classList.add("open");
    document.body.classList.add("lock");
  });
});
const closeLb = () => {
  lb.classList.remove("open");
  document.body.classList.remove("lock");
};
lb.addEventListener("click", closeLb);
addEventListener("keydown", (e) => e.key === "Escape" && closeLb());

// Formulario: arma el mensaje y abre WhatsApp con los datos ya escritos
const form = $("#form");
form.elements.fecha.min = new Date().toISOString().split("T")[0];
form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  const f = form.elements;
  const fecha = f.fecha.value.split("-").reverse().join("/");
  let msg = `Hola Nicolás, soy ${f.nombre.value}. Quiero reservar: ${f.tipo.value}, para ${f.comensales.value} personas, el ${fecha}.`;
  if (f.mensaje.value.trim()) msg += ` ${f.mensaje.value.trim()}`;
  window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
});

// Año del footer
$("#year").textContent = new Date().getFullYear();
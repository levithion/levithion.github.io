document.addEventListener("DOMContentLoaded", () => {
    const header = document.querySelector(".site-header");
    const progress = document.querySelector(".progress span");
    const menuButton = document.querySelector(".menu-toggle");
    const nav = document.querySelector("#site-nav");
    const navLinks = nav.querySelectorAll("a");
    const reveals = document.querySelectorAll(".reveal");

    const updateScrollState = () => {
        const scrollTop = window.scrollY;
        const scrollRange = document.documentElement.scrollHeight - window.innerHeight;
        const percentage = scrollRange > 0 ? (scrollTop / scrollRange) * 100 : 0;

        header.classList.toggle("scrolled", scrollTop > 24);
        progress.style.width = `${percentage}%`;
    };

    const setMenu = (open) => {
        menuButton.setAttribute("aria-expanded", String(open));
        nav.classList.toggle("open", open);
        document.body.classList.toggle("menu-open", open);
        menuButton.querySelector(".menu-label").textContent = open ? "Close" : "Menu";
    };

    menuButton.addEventListener("click", () => {
        setMenu(menuButton.getAttribute("aria-expanded") !== "true");
    });

    navLinks.forEach((link) => {
        link.addEventListener("click", () => setMenu(false));
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") setMenu(false);
    });

    if ("IntersectionObserver" in window) {
        const observer = new IntersectionObserver((entries, revealObserver) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add("is-visible");
                revealObserver.unobserve(entry.target);
            });
        }, {
            threshold: 0.08,
            rootMargin: "0px 0px -8% 0px"
        });

        reveals.forEach((element) => observer.observe(element));
    } else {
        reveals.forEach((element) => element.classList.add("is-visible"));
    }

    window.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    updateScrollState();
});

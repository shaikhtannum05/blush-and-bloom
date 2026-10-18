
/* =========================================================
   BLUSH & BLOOM — COMPLETE WEBSITE JAVASCRIPT
   Cart, wishlist, search, filters, side panels and checkout
   ========================================================= */

"use strict";

/* ---------- STORAGE + SHARED STATE ---------- */

const CART_STORAGE_KEY = "blushBloomCart";
const WISHLIST_STORAGE_KEY = "blushBloomWishlist";

function readStorage(key, fallback) {
    try {
        const saved = localStorage.getItem(key);
        return saved ? JSON.parse(saved) : fallback;
    } catch (error) {
        console.warn(`Could not read ${key} from localStorage:`, error);
        return fallback;
    }
}

let cart = readStorage(CART_STORAGE_KEY, []);
let savedWishlist = readStorage(WISHLIST_STORAGE_KEY, []);

if (!Array.isArray(cart)) cart = [];
if (!Array.isArray(savedWishlist)) savedWishlist = [];

cart = cart
    .filter(item => item && typeof item.name === "string")
    .map(item => ({
        name: item.name,
        price: Number(item.price) || 0,
        quantity: Math.max(1, Number.parseInt(item.quantity, 10) || 1)
    }));

savedWishlist = savedWishlist.filter(name => typeof name === "string");

function saveCart() {
    try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (error) {
        console.warn("Could not save cart:", error);
    }
}

function saveWishlist() {
    try {
        localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(savedWishlist));
    } catch (error) {
        console.warn("Could not save wishlist:", error);
    }
}

function formatPrice(value) {
    return Number(value || 0).toLocaleString("en-IN", {
        maximumFractionDigits: 2
    });
}

function getProductName(card) {
    return card?.querySelector("h3, .product-name, .product-title")
        ?.textContent.trim() || "Beauty product";
}

function getProductPrice(card) {
    const priceElement = card?.querySelector(".price, .product-price, [data-price]");
    if (!priceElement) return 0;

    const dataPrice = priceElement.getAttribute("data-price");
    if (dataPrice && Number.isFinite(Number(dataPrice))) {
        return Number(dataPrice);
    }

    const match = priceElement.textContent
        .replace(/,/g, "")
        .match(/\d+(?:\.\d+)?/);

    return match ? Number(match[0]) : 0;
}

/* ---------- NAVBAR COUNTS ---------- */

function updateNavbarCartCount() {
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);

    ["nav-cart-count"].forEach(id => {
        const element = document.getElementById(id);
        if (element) element.textContent = String(count);
    });
}

function updateNavbarWishlistCount() {
    const element = document.getElementById("nav-wishlist-count");
    if (element) element.textContent = String(savedWishlist.length);
}

/* ---------- CART RENDERING ---------- */

function renderCart() {
    const cartItems = document.getElementById("cart-items");
    const cartTotal = document.getElementById("cart-total");
    const checkoutItems = document.getElementById("checkout-items");
    const checkoutTotal = document.getElementById("checkout-total");
    const cartCount = document.getElementById("cart-count");

    const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    if (cartCount) cartCount.textContent = String(itemCount);

    if (cartItems) {
        cartItems.replaceChildren();

        if (cart.length === 0) {
            const empty = document.createElement("p");
            empty.className = "empty-cart";
            empty.textContent =
                "Your bag is empty. Find a little something you love ♡";
            cartItems.appendChild(empty);
        } else {
            cart.forEach(item => {
                const row = document.createElement("div");
                row.className = "cart-item";

                const details = document.createElement("div");
                details.className = "cart-item-details";

                const name = document.createElement("h3");
                name.textContent = item.name;

                const price = document.createElement("p");
                price.textContent = `₹${formatPrice(item.price)} each`;

                details.append(name, price);

                const controls = document.createElement("div");
                controls.className = "quantity-controls";

                const minus = document.createElement("button");
                minus.type = "button";
                minus.className = "quantity-btn";
                minus.textContent = "−";
                minus.setAttribute(
                    "aria-label",
                    `Decrease quantity of ${item.name}`
                );
                minus.addEventListener("click", () => {
                    changeQuantity(item.name, -1);
                });

                const quantity = document.createElement("span");
                quantity.textContent = String(item.quantity);

                const plus = document.createElement("button");
                plus.type = "button";
                plus.className = "quantity-btn";
                plus.textContent = "+";
                plus.setAttribute(
                    "aria-label",
                    `Increase quantity of ${item.name}`
                );
                plus.addEventListener("click", () => {
                    changeQuantity(item.name, 1);
                });

                const remove = document.createElement("button");
                remove.type = "button";
                remove.className = "remove-btn";
                remove.textContent = "Remove";
                remove.addEventListener("click", () => {
                    removeCartItem(item.name);
                });

                controls.append(minus, quantity, plus, remove);
                row.append(details, controls);
                cartItems.appendChild(row);
            });
        }
    }

    const total = cart.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
    );

    if (cartTotal) cartTotal.textContent = formatPrice(total);

    if (checkoutItems && checkoutTotal) {
        checkoutItems.replaceChildren();

        if (cart.length === 0) {
            const empty = document.createElement("p");
            empty.textContent = "Your bag is currently empty.";
            checkoutItems.appendChild(empty);
        } else {
            cart.forEach(item => {
                const line = document.createElement("p");
                line.textContent =
                    `${item.name} × ${item.quantity} — ₹${formatPrice(item.price * item.quantity)}`;
                checkoutItems.appendChild(line);
            });
        }

        checkoutTotal.textContent = formatPrice(total);
    }

    saveCart();
    updateNavbarCartCount();
    renderBagPanel();
}

function addToCart(name, price) {
    const existing = cart.find(item => item.name === name);

    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({
            name,
            price: Number(price) || 0,
            quantity: 1
        });
    }

    renderCart();
}

function changeQuantity(name, change) {
    const item = cart.find(product => product.name === name);
    if (!item) return;

    item.quantity += change;

    if (item.quantity <= 0) {
        cart = cart.filter(product => product.name !== name);
    }

    renderCart();
}

function removeCartItem(name) {
    cart = cart.filter(item => item.name !== name);
    renderCart();
}

/* ---------- WISHLIST ---------- */

function setWishlistButtonState(button, isSaved, productName) {
    button.classList.toggle("active", isSaved);
    button.setAttribute("aria-pressed", String(isSaved));
    button.setAttribute(
        "aria-label",
        `${isSaved ? "Remove" : "Add"} ${productName} ${
            isSaved ? "from" : "to"
        } wishlist`
    );

    if (!button.querySelector("svg")) {
        button.textContent = isSaved ? "♥" : "♡";
    }
}

function refreshWishlistButtons() {
    document.querySelectorAll(".product-card").forEach(card => {
        const name = getProductName(card);
        const button = card.querySelector(".wishlist-btn");

        if (button) {
            setWishlistButtonState(
                button,
                savedWishlist.includes(name),
                name
            );
        }
    });
}

document.querySelectorAll(".product-card .wishlist-btn").forEach(button => {
    const card = button.closest(".product-card");
    const name = getProductName(card);

    setWishlistButtonState(button, savedWishlist.includes(name), name);

    button.addEventListener("click", event => {
        event.preventDefault();

        const productName = getProductName(
            button.closest(".product-card")
        );

        if (savedWishlist.includes(productName)) {
            savedWishlist = savedWishlist.filter(
                name => name !== productName
            );
        } else {
            savedWishlist.push(productName);
        }

        saveWishlist();
        refreshWishlistButtons();
        updateNavbarWishlistCount();
        renderWishlistPanel();
    });
});

/* ---------- PRODUCT ADD-TO-CART BUTTONS ---------- */

document.querySelectorAll(".product-card .add-btn").forEach(button => {
    button.addEventListener("click", () => {
        const card = button.closest(".product-card");
        if (!card) return;

        const name = getProductName(card);
        const price = getProductPrice(card);

        addToCart(name, price);

        const originalText =
            button.dataset.originalText || button.textContent;

        button.dataset.originalText = originalText;
        button.textContent = "ADDED ♡";

        window.setTimeout(() => {
            if (button.isConnected) {
                button.textContent = originalText;
            }
        }, 1000);
    });
});

/* ---------- SEARCH + CATEGORY FILTERS ---------- */

function applyProductFilters() {
    const searchInput =
        document.getElementById("product-search") ||
        document.getElementById("search-input") ||
        document.querySelector('input[type="search"]');

    const searchTerm = searchInput?.value.trim().toLowerCase() || "";

    const activeFilter = document.querySelector(
        ".filter-btn.active, .category-btn.active, [data-category].active"
    );

    const selectedCategory =
        activeFilter?.dataset.category ||
        activeFilter?.getAttribute("data-filter") ||
        "all";

    document.querySelectorAll(".product-card").forEach(card => {
        const searchableText = card.textContent.toLowerCase();
        const category = (card.dataset.category || "all").toLowerCase();

        const matchesSearch = searchableText.includes(searchTerm);

        const matchesCategory =
            selectedCategory === "all" ||
            selectedCategory === "*" ||
            category === selectedCategory.toLowerCase();

        card.hidden = !(matchesSearch && matchesCategory);
    });
}

const searchInput =
    document.getElementById("product-search") ||
    document.getElementById("search-input") ||
    document.querySelector('input[type="search"]');

searchInput?.addEventListener("input", applyProductFilters);

document.querySelectorAll(
    ".filter-btn, .category-btn, [data-filter]"
).forEach(button => {
    button.addEventListener("click", () => {
        const filter = button.dataset.category || button.dataset.filter;
        if (!filter) return;

        document.querySelectorAll(
            ".filter-btn, .category-btn, [data-filter]"
        ).forEach(other => other.classList.remove("active"));

        button.classList.add("active");
        applyProductFilters();
    });
});

/* ---------- SIDE PANELS ---------- */

const wishlistPanel = document.getElementById("wishlist-panel");
const bagPanel = document.getElementById("bag-panel");
const panelOverlay = document.getElementById("panel-overlay");
const wishlistPanelItems = document.getElementById("wishlist-panel-items");
const bagPanelItems = document.getElementById("bag-panel-items");
const panelBagTotal = document.getElementById("panel-bag-total");

function openSidePanel(panel) {
    console.log("Side panel function is running!", panel);
    if (!panel || !panelOverlay) return;

    wishlistPanel?.classList.remove("is-open");
    bagPanel?.classList.remove("is-open");

    wishlistPanel?.setAttribute("aria-hidden", "true");
    bagPanel?.setAttribute("aria-hidden", "true");

    panel.classList.add("is-open");
    panel.setAttribute("aria-hidden", "false");

    panelOverlay.classList.add("is-visible");
    document.body.classList.add("panel-open");
}

function closeSidePanels() {
    wishlistPanel?.classList.remove("is-open");
    bagPanel?.classList.remove("is-open");

    wishlistPanel?.setAttribute("aria-hidden", "true");
    bagPanel?.setAttribute("aria-hidden", "true");

    panelOverlay?.classList.remove("is-visible");
    document.body.classList.remove("panel-open");
}

function createPanelButton(label, action) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", action);
    return button;
}

/* ---------- REFRESH SHOPPING BAG PANEL ---------- */

function renderBagPanel() {
    if (!bagPanelItems || !panelBagTotal) return;

    bagPanelItems.replaceChildren();

    let total = 0;

    if (cart.length === 0) {
        const empty = document.createElement("p");
        empty.className = "panel-empty";
        empty.textContent =
            "Your bag is waiting for something beautiful. ♡";

        bagPanelItems.appendChild(empty);
    }

    cart.forEach(item => {
        total += item.price * item.quantity;

        const row = document.createElement("div");
        row.className = "panel-product";

        const info = document.createElement("div");
        info.className = "panel-product-info";

        const name = document.createElement("h3");
        name.textContent = item.name;

        const price = document.createElement("p");
        price.textContent =
            `₹${formatPrice(item.price)} × ${item.quantity} = ₹${formatPrice(item.price * item.quantity)}`;

        info.append(name, price);

        const actions = document.createElement("div");
        actions.className = "panel-product-actions";

        actions.append(
            createPanelButton("−", () => {
                changeQuantity(item.name, -1);
            }),
            createPanelButton("+", () => {
                changeQuantity(item.name, 1);
            }),
            createPanelButton("Remove", () => {
                removeCartItem(item.name);
            })
        );

        row.append(info, actions);
        bagPanelItems.appendChild(row);
    });

    panelBagTotal.textContent = formatPrice(total);
}

/* ---------- REFRESH WISHLIST PANEL ---------- */

function renderWishlistPanel() {
    if (!wishlistPanelItems) return;

    wishlistPanelItems.replaceChildren();

    if (savedWishlist.length === 0) {
        const empty = document.createElement("p");
        empty.className = "panel-empty";
        empty.textContent =
            "Your wishlist is waiting for a little love. ♡";

        wishlistPanelItems.appendChild(empty);
        return;
    }

    savedWishlist.forEach(productName => {
        const row = document.createElement("div");
        row.className = "panel-product";

        const info = document.createElement("div");
        info.className = "panel-product-info";

        const name = document.createElement("h3");
        name.textContent = productName;

        const card = Array.from(
            document.querySelectorAll(".product-card")
        ).find(productCard => getProductName(productCard) === productName);

        const price = document.createElement("p");
        const priceElement = card?.querySelector(
            ".price, .product-price, [data-price]"
        );

        price.textContent = priceElement
            ? priceElement.textContent.trim()
            : "A little beauty favourite";

        info.append(name, price);

        const actions = document.createElement("div");
        actions.className = "panel-product-actions";

        actions.append(
            createPanelButton("Shop", () => {
                closeSidePanels();

                if (card) {
                    card.scrollIntoView({
                        behavior: "smooth",
                        block: "center"
                    });
                } else {
                    document.getElementById("bestsellers")
                        ?.scrollIntoView({ behavior: "smooth" });
                }
            }),

            createPanelButton("Remove", () => {
                savedWishlist = savedWishlist.filter(
                    name => name !== productName
                );

                saveWishlist();
                refreshWishlistButtons();
                updateNavbarWishlistCount();
                renderWishlistPanel();
            })
        );

        row.append(info, actions);
        wishlistPanelItems.appendChild(row);
    });
}

/* ---------- OPEN PANELS FROM NAVBAR ---------- */

document.querySelectorAll(".nav-icon-btn").forEach(button => {
    const label = (
        button.getAttribute("aria-label") || ""
    ).toLowerCase();

    if (label.includes("wishlist") || label.includes("shopping bag")) {
        button.removeAttribute("onclick");
    }

    if (label.includes("wishlist")) {
        button.addEventListener("click", event => {
            event.preventDefault();
            renderWishlistPanel();
            openSidePanel(wishlistPanel);
        });
    } else if (label.includes("shopping bag")) {
        button.addEventListener("click", event => {
            event.preventDefault();
            renderBagPanel();
            openSidePanel(bagPanel);
        });
    }
});

/* ---------- CLOSE PANELS ---------- */

panelOverlay?.addEventListener("click", closeSidePanels);

document.querySelectorAll("[data-close-panel]").forEach(button => {
    button.addEventListener("click", closeSidePanels);
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        closeSidePanels();
    }
});
document.getElementById("footer-shopping-bag")?.addEventListener("click", event => {
    event.preventDefault();

    const bagPanel = document.getElementById("bag-panel");

    if (typeof renderBagPanel === "function") {
        renderBagPanel();
    }

    if (typeof openSidePanel === "function") {
        openSidePanel(bagPanel);
    }
});

/* ---------- PANEL CHECKOUT BUTTON ---------- */

document.getElementById("panel-checkout")?.addEventListener("click", () => {
    closeSidePanels();

    document.getElementById("checkout-section")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
});

/* ---------- CHECKOUT ---------- */

const checkoutForm = document.getElementById("checkout-form");

checkoutForm?.addEventListener("submit", event => {
    event.preventDefault();

    if (cart.length === 0) {
        alert(
            "Your shopping bag is empty. Add something lovely before checking out. ♡"
        );
        return;
    }

    if (!checkoutForm.checkValidity()) {
        checkoutForm.reportValidity();
        return;
    }

    const orderMessage = document.getElementById("order-message");

    const orderTotal = cart.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
    );

    const orderLines = cart.map(item =>
        `${item.name} × ${item.quantity} — ₹${formatPrice(item.price * item.quantity)}`
    );

    if (orderMessage) {
        orderMessage.textContent =
            `Thank you for your order! ♡ ${orderLines.join(" | ")}. Total: ₹${formatPrice(orderTotal)}.`;

        orderMessage.hidden = false;

        orderMessage.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
    } else {
        alert(
            `Thank you for your order! ♡\n\n${orderLines.join("\n")}\n\nTotal: ₹${formatPrice(orderTotal)}`
        );
    }

    cart = [];
    renderCart();
    checkoutForm.reset();
});

/* ---------- OTHER CHECKOUT BUTTONS ---------- */

document.querySelectorAll(
    "#checkout-button, .checkout-btn, [data-checkout]"
).forEach(button => {
    if (button.id === "panel-checkout") return;

    button.addEventListener("click", () => {
        const section = document.getElementById("checkout-section");

        section?.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    });
});

/* ---------- INITIAL PAGE STATE ---------- */

refreshWishlistButtons();
renderCart();
updateNavbarWishlistCount();
renderWishlistPanel();
renderBagPanel();




document.querySelectorAll(".lipstick-shades").forEach(shadeGroup => {
    const productCard = shadeGroup.closest(".product-card");
    const shadeName = productCard.querySelector(".selected-shade");
    const productImage = productCard.querySelector("img");
    const shadeButtons = shadeGroup.querySelectorAll(".shade-circle");

    shadeButtons.forEach(button => {
        button.addEventListener("click", () => {

            // Update the selected shade name
            if (shadeName) {
                shadeName.textContent = button.dataset.shade;
            }

           
 // Change the product photo with a smooth animation
if (productImage && button.dataset.image) {
    productImage.classList.remove("shade-photo-change");

    productImage.src = button.dataset.image;

    void productImage.offsetWidth;

    productImage.classList.add("shade-photo-change");
}


            // Update the selected circle
            shadeButtons.forEach(shade => {
                shade.classList.remove("selected");
                shade.setAttribute("aria-pressed", "false");
            });

            button.classList.add("selected");
            button.setAttribute("aria-pressed", "true");
        });
    });
});

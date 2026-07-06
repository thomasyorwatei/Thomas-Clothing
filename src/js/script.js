document.addEventListener("DOMContentLoaded", () => {
    // Store Configuration for Rwanda
    const storeConfig = {
        name: "Rwanda Trad",
        location: "Rwanda",
        currency: "RWF",
        locale: "rw-RW"
    };

    // Initialize and expose price formatter for use in the UI
    const priceFormatter = new Intl.NumberFormat(storeConfig.locale, {
        style: 'currency',
        currency: storeConfig.currency,
    });
    window.formatPrice = (amount) => priceFormatter.format(amount);

    // Header adjustment for <768px
    const toggle = document.querySelector(".toggle");
    const menu = document.querySelector(".nav-menu");

    function toggleMenu() {
        if (!menu || !toggle) return;
        if (menu.classList.contains("active")) {
            menu.classList.remove("active");
            // add hamburger icon
            toggle.innerHTML = `<i class="fa fa-bars"></i>`;
        } else {
            menu.classList.add("active");
            // add X icon
            toggle.innerHTML = `<i class="fa fa-times"></i>`;
        }
    }

    if (toggle) {
        toggle.addEventListener("click", toggleMenu, false);
    }

    // Account Page variables
    const logForm = document.getElementById("loginForm");
    const regForm = document.getElementById("registerForm");
    const remLog = document.getElementById("removeLog");
    const remReg = document.getElementById("removeReg");

    const forgotForm = document.getElementById("forgotForm");

    // Expose functions to window for HTML onclick attributes
    window.login = function () {
        if (remLog && remReg && logForm && regForm) {
            remLog.style.display = "none";
            remReg.style.display = "block";
            logForm.style.display = "flex";
            regForm.style.display = "none";
            if (forgotForm) forgotForm.style.display = "none";
        }
    };

    window.register = function () {
        if (remLog && remReg && logForm && regForm) {
            remReg.style.display = "none";
            remLog.style.display = "block";
            regForm.style.display = "flex";
            logForm.style.display = "none";
            if (forgotForm) forgotForm.style.display = "none";
        }
    };

    // Preview images for the product slider
    const prodImg = document.getElementById("prodImg");
    const smallImgs = document.querySelectorAll(".small-img");

    if (prodImg && smallImgs.length > 0) {
        smallImgs.forEach((img) => {
            img.addEventListener("click", () => {
                prodImg.src = img.src;
            });
        });
    }
});

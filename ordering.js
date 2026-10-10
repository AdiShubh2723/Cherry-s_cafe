(() => {
    const cafeUpiId = '771900666-3@ybl';
    const cafeWhatsappNumber = '917719006666';
    const cartStorageKey = 'cherrys-cafe-cart-v1';
    const cart = new Map();

    try {
        const savedCart = JSON.parse(sessionStorage.getItem(cartStorageKey) || '[]');
        savedCart.forEach((item) => cart.set(item.key, item));
    } catch {
        sessionStorage.removeItem(cartStorageKey);
    }

    const launcher = document.createElement('button');
    launcher.className = 'cart-launcher';
    launcher.type = 'button';
    launcher.setAttribute('aria-label', 'Open shopping cart');
    launcher.innerHTML = '<span>Cart</span><span class="cart-launcher-count">0</span><span class="cart-launcher-total">₹0.00</span>';

    const dialog = document.createElement('dialog');
    dialog.className = 'cart-dialog';
    dialog.setAttribute('aria-labelledby', 'cart-dialog-title');
    dialog.innerHTML = `
        <div class="cart-dialog-header">
            <h2 id="cart-dialog-title">Your order</h2>
            <button class="cart-close" type="button" aria-label="Close cart">Close</button>
        </div>
        <div class="cart-items" aria-live="polite"></div>
        <div class="cart-empty">Your cart is empty.</div>
        <div class="cart-summary"><span>Total</span><strong>₹0.00</strong></div>
        <form class="checkout-form">
            <label>Name<input name="customerName" autocomplete="name" required></label>
            <label>Mobile number<input name="customerPhone" type="tel" autocomplete="tel" required></label>
            <label>Delivery address <span>(optional)</span><textarea name="customerAddress" rows="2" autocomplete="street-address"></textarea></label>
            <a class="upi-pay-button" href="#">Pay ₹0.00 with UPI</a>
        </form>
        <p class="upi-id-note">Payee UPI ID: <strong class="upi-id-value"></strong></p>
        <p class="payment-note">UPI payment is not verified by this website. After paying, return here, tap “Notify cafe”, then send the prepared WhatsApp message. The cafe should verify the payment in its UPI app.</p>
        <button class="whatsapp-notify-button" type="button" hidden>Notify cafe on WhatsApp</button>
        <p class="whatsapp-note" hidden>WhatsApp will open with your order details. Tap Send there to deliver the message.</p>
        <button class="cart-clear" type="button">Clear cart</button>
    `;

    document.body.append(launcher, dialog);

    const itemsElement = dialog.querySelector('.cart-items');
    const emptyElement = dialog.querySelector('.cart-empty');
    const totalElement = dialog.querySelector('.cart-summary strong');
    const payLink = dialog.querySelector('.upi-pay-button');
    dialog.querySelector('.upi-id-value').textContent = cafeUpiId;
    const checkoutForm = dialog.querySelector('.checkout-form');
    const notifyButton = dialog.querySelector('.whatsapp-notify-button');
    const whatsappNote = dialog.querySelector('.whatsapp-note');
    let orderReference = '';

    function money(amount) {
        return `₹${amount.toFixed(2)}`;
    }

    function cartTotal() {
        return [...cart.values()].reduce((sum, item) => sum + item.price * item.quantity, 0);
    }

    function updatePaymentLink() {
        if (!cart.size) {
            payLink.href = '#';
            return;
        }

        if (!orderReference) orderReference = `CC${Date.now().toString().slice(-8)}`;
        const params = new URLSearchParams({
            pa: cafeUpiId,
            pn: "Cherry's Cafe",
            am: cartTotal().toFixed(2),
            cu: 'INR',
            tn: `Order ${orderReference}`
        });
        payLink.href = `upi://pay?${params.toString()}`;
    }

    function saveCart() {
        sessionStorage.setItem(cartStorageKey, JSON.stringify([...cart.values()]));
    }

    function addToCart(name, variant, price) {
        const key = `${name}|${variant}|${price}`;
        const item = cart.get(key) || { key, name, variant, price, quantity: 0 };
        item.quantity += 1;
        cart.set(key, item);
        saveCart();
        renderCart();
    }

    function addButton(label, onClick, className = 'order-add-button') {
        const button = document.createElement('button');
        button.className = className;
        button.type = 'button';
        button.textContent = label;
        button.addEventListener('click', onClick);
        return button;
    }

    function installMenuItemControls() {
        document.querySelectorAll('.menu-item').forEach((menuItem) => {
            if (menuItem.dataset.orderReady) return;

            const itemName = menuItem.querySelector('.item-name')?.textContent.trim();
            if (!itemName) return;

            const sizePrices = [...menuItem.querySelectorAll('.price-stack strong')];
            const prices = sizePrices.length ? sizePrices : [...menuItem.querySelectorAll('.single-price')];
            const choices = prices.map((priceElement) => {
                const label = priceElement.previousElementSibling?.matches('span')
                    ? priceElement.previousElementSibling.textContent.trim()
                    : '';
                return { label, price: Number.parseFloat(priceElement.textContent.trim()) };
            }).filter((choice) => Number.isFinite(choice.price));

            if (!choices.length) return;
            menuItem.dataset.orderReady = 'true';

            const controls = document.createElement('div');
            controls.className = 'order-controls';
            let choiceSelect;

            if (choices.length > 1) {
                choiceSelect = document.createElement('select');
                choiceSelect.className = 'order-choice';
                choiceSelect.setAttribute('aria-label', `Choose an option for ${itemName}`);
                choices.forEach((choice, index) => {
                    const option = document.createElement('option');
                    option.value = String(index);
                    option.textContent = `${choice.label || `Option ${index + 1}`} · ${money(choice.price)}`;
                    choiceSelect.append(option);
                });
                controls.append(choiceSelect);
            }

            controls.append(addButton('Add to cart', () => {
                const choice = choices[choiceSelect ? Number(choiceSelect.value) : 0];
                addToCart(itemName, choice.label, choice.price);
                launcher.classList.add('cart-launcher-updated');
                window.setTimeout(() => launcher.classList.remove('cart-launcher-updated'), 300);
            }));
            menuItem.append(controls);
        });
    }

    function installVariantControls() {
        document.querySelectorAll('.menu-table-row:not(.header-row)').forEach((row) => {
            const itemName = row.querySelector('.cell-name')?.textContent.trim();
            const headerCells = [...(row.closest('.menu-table')?.querySelectorAll('.header-row .cell-price') || [])];
            if (!itemName) return;

            [...row.querySelectorAll('.cell-price')].forEach((cell, index) => {
                if (cell.dataset.orderReady || !/^\d+(?:\.\d{1,2})?$/.test(cell.textContent.trim())) return;
                const price = Number.parseFloat(cell.textContent.trim());
                const variant = headerCells[index]?.textContent.trim() || `Option ${index + 1}`;
                const button = addButton('+', () => addToCart(itemName, variant, price), 'variant-add-button');
                button.setAttribute('aria-label', `Add ${itemName}, ${variant}, ${money(price)} to cart`);
                button.title = `Add ${variant} to cart`;
                cell.append(button);
                cell.dataset.orderReady = 'true';
            });
        });
    }

    function installComboControls() {
        document.querySelectorAll('.combo-list h3').forEach((heading) => {
            if (heading.dataset.orderReady) return;
            const text = heading.textContent.trim();
            const match = text.match(/\s@\s*(\d+(?:\.\d{1,2})?)\/-$/);
            if (!match) return;

            const price = Number.parseFloat(match[1]);
            const name = text.slice(0, match.index).trim();
            const button = addButton(`Add combo · ${money(price)}`, () => addToCart(name, '', price), 'combo-add-button');
            heading.insertAdjacentElement('afterend', button);
            heading.dataset.orderReady = 'true';
        });
    }

    function renderCart() {
        itemsElement.replaceChildren();
        const entries = [...cart.values()];
        const total = cartTotal();
        const itemCount = entries.reduce((sum, item) => sum + item.quantity, 0);
        emptyElement.hidden = entries.length > 0;
        dialog.classList.toggle('has-items', entries.length > 0);
        totalElement.textContent = money(total);
        launcher.querySelector('.cart-launcher-count').textContent = String(itemCount);
        launcher.querySelector('.cart-launcher-total').textContent = money(total);
        const itemLabel = itemCount === 1 ? 'item' : 'items';
        launcher.setAttribute('aria-label', `Open cart with ${itemCount} ${itemLabel}, total ${money(total)}`);
        payLink.textContent = `Pay ${money(total)} with UPI`;
        payLink.setAttribute('aria-disabled', String(entries.length === 0));
        updatePaymentLink();

        entries.forEach((item) => {
            const row = document.createElement('div');
            row.className = 'cart-item-row';
            const description = document.createElement('div');
            description.className = 'cart-item-description';
            const name = document.createElement('strong');
            name.textContent = item.name;
            const variant = document.createElement('span');
            variant.textContent = [item.variant, `${money(item.price)} each`].filter(Boolean).join(' · ');
            description.append(name, variant);

            const quantity = document.createElement('div');
            quantity.className = 'cart-quantity';
            const minusButton = addButton('−', () => updateQuantity(item.key, -1), 'quantity-button');
            minusButton.setAttribute('aria-label', `Remove one ${item.name}`);
            const count = document.createElement('span');
            count.textContent = String(item.quantity);
            const plusButton = addButton('+', () => updateQuantity(item.key, 1), 'quantity-button');
            plusButton.setAttribute('aria-label', `Add one ${item.name}`);
            quantity.append(minusButton, count, plusButton);

            const lineTotal = document.createElement('strong');
            lineTotal.className = 'cart-item-total';
            lineTotal.textContent = money(item.price * item.quantity);
            row.append(description, quantity, lineTotal);
            itemsElement.append(row);
        });
    }

    function updateQuantity(key, change) {
        const item = cart.get(key);
        if (!item) return;
        item.quantity += change;
        if (item.quantity <= 0) cart.delete(key);
        saveCart();
        renderCart();
    }

    function customerDetails() {
        const formData = new FormData(checkoutForm);
        return {
            name: String(formData.get('customerName') || '').trim(),
            phone: String(formData.get('customerPhone') || '').trim(),
            address: String(formData.get('customerAddress') || '').trim()
        };
    }

    function startPayment(event) {
        event.preventDefault();
        if (!cart.size) return;
        if (!checkoutForm.reportValidity()) return;

        updatePaymentLink();
        notifyButton.hidden = false;
        whatsappNote.hidden = false;
        window.location.href = payLink.href;
    }

    function notifyCafe() {
        if (!cart.size || !checkoutForm.reportValidity()) return;
        const customer = customerDetails();
        const lines = [...cart.values()].map((item) => {
            const label = [item.name, item.variant].filter(Boolean).join(' - ');
            return `${item.quantity} x ${label} (${money(item.price * item.quantity)})`;
        });
        const message = [
            "Hello Cherry's Cafe, I have placed an order:",
            ...lines,
            `Total paid via UPI: ${money(cartTotal())}`,
            `UPI ID: ${cafeUpiId}`,
            `Order reference: ${orderReference || 'Not generated'}`,
            `Customer: ${customer.name}`,
            `Mobile: ${customer.phone}`,
            customer.address ? `Delivery address: ${customer.address}` : '',
            'The customer reports completing payment. Please verify the credit in your UPI app before preparing the order.'
        ].filter(Boolean).join('\n');
        const whatsappUrl = `https://wa.me/${cafeWhatsappNumber}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    }

    launcher.addEventListener('click', () => dialog.showModal());
    dialog.querySelector('.cart-close').addEventListener('click', () => dialog.close());
    dialog.querySelector('.cart-clear').addEventListener('click', () => {
        cart.clear();
        orderReference = '';
        notifyButton.hidden = true;
        whatsappNote.hidden = true;
        saveCart();
        renderCart();
    });
    payLink.addEventListener('click', startPayment);
    notifyButton.addEventListener('click', notifyCafe);

    installMenuItemControls();
    installVariantControls();
    installComboControls();
    renderCart();
})();

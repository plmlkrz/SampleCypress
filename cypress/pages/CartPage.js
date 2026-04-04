// ─── CartPage.js — Page Object Model ─────────────────────────────────────────
// Represents the shopping cart page (/cart.html) on SauceDemo.

class CartPage {
  // ── Selectors ──────────────────────────────────────────────────────────────
  elements = {
    // Each item row in the cart
    cartItems:        () => cy.get('.cart_item'),

    // "Continue Shopping" button returns to the inventory
    continueShoppingBtn: () => cy.get('[data-test="continue-shopping"]'),

    // "Checkout" button advances to the checkout flow
    checkoutBtn:      () => cy.get('[data-test="checkout"]'),

    // The page title ("Your Cart")
    pageTitle:        () => cy.get('.title'),
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  /**
   * Remove an item from the cart by its product name.
   * @param {string} productName
   */
  removeItem(productName) {
    cy.contains('.inventory_item_name', productName)
      .closest('.cart_item')
      .find('button')
      .click()
  }

  /**
   * Click the Checkout button to begin the checkout flow.
   */
  checkout() {
    this.elements.checkoutBtn().click()
  }

  /**
   * Click Continue Shopping to go back to the inventory.
   */
  continueShopping() {
    this.elements.continueShoppingBtn().click()
  }

  // ── Assertions / Getters ──────────────────────────────────────────────────

  /**
   * Assert that a product is present in the cart by name.
   * @param {string} productName
   */
  verifyItemInCart(productName) {
    this.elements.cartItems()
      .should('contain.text', productName)
  }

  /**
   * Assert that a product is NOT in the cart.
   * @param {string} productName
   */
  verifyItemNotInCart(productName) {
    this.elements.cartItems()
      .should('not.contain.text', productName)
  }

  /**
   * Returns the cart item elements for further assertions.
   */
  getCartItems() {
    return this.elements.cartItems()
  }
}

export default new CartPage()

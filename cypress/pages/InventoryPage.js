// ─── InventoryPage.js — Page Object Model ────────────────────────────────────
// Represents the product listing page (/inventory.html) on SauceDemo.

class InventoryPage {
  // ── Selectors ──────────────────────────────────────────────────────────────
  elements = {
    // The shopping cart icon/badge in the top-right corner
    cartBadge:       () => cy.get('.shopping_cart_badge'),
    cartLink:        () => cy.get('.shopping_cart_link'),

    // Each product card on the inventory page
    inventoryItems:  () => cy.get('.inventory_item'),

    // The sort dropdown (Price low→high, A→Z, etc.)
    sortDropdown:    () => cy.get('[data-test="product_sort_container"]'),

    // The page title ("Products")
    pageTitle:       () => cy.get('.title'),
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  /**
   * Add a product to the cart by its visible display name.
   * Traversal strategy: find the name element → go up to the card container
   * → find the button inside. This survives product reordering.
   * @param {string} productName  e.g. 'Sauce Labs Backpack'
   */
  addToCart(productName) {
    cy.contains('.inventory_item_name', productName)
      .closest('.inventory_item')
      .find('button')
      .click()
  }

  /**
   * Remove a product from the cart while still on the inventory page.
   * @param {string} productName
   */
  removeFromCart(productName) {
    cy.contains('.inventory_item_name', productName)
      .closest('.inventory_item')
      .find('button')
      .click()
  }

  /**
   * Sort products using the dropdown.
   * @param {'az'|'za'|'lohi'|'hilo'} value  The option value attribute
   */
  sortBy(value) {
    this.elements.sortDropdown().select(value)
  }

  /**
   * Navigate to the cart page.
   */
  goToCart() {
    this.elements.cartLink().click()
  }

  // ── Assertions / Getters ──────────────────────────────────────────────────

  /** Returns the cart badge element (shows item count). */
  getCartBadge() {
    return this.elements.cartBadge()
  }

  /** Returns the number of inventory items currently visible. */
  getItemCount() {
    return this.elements.inventoryItems()
  }
}

export default new InventoryPage()

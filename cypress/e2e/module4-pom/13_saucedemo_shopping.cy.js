// ─── Module 4 | Lesson 13: Page Object Model — Shopping Flow ─────────────────
// This spec tests the end-to-end shopping flow on SauceDemo using three Page Objects:
//   LoginPage    → handles authentication
//   InventoryPage → handles the product listing
//   CartPage     → handles the shopping cart
//
// testIsolation: false — the browser session persists across all tests.
// State management strategy:
//   • Log in ONCE in the before() hook (cold page load, runs once)
//   • Between tests: log out (client-side nav) → clear localStorage → log back in
//     This gives a fresh session with an empty cart for each test, with NO
//     full page reloads that could trigger SPA load-event timeouts.
//
// Key lesson: In SPAs, cy.visit() on virtual URLs and cy.reload() can fail
// because the server returns 404 for routes that only exist client-side.
// Use the app's own navigation (clicking links) to move between pages.

import LoginPage from '../../pages/LoginPage'
import InventoryPage from '../../pages/InventoryPage'
import CartPage from '../../pages/CartPage'

describe('Module 4 | POM — SauceDemo Shopping Cart', { testIsolation: false }, () => {
  before(() => {
    // Single cold page load (cy.visit to the root URL — only run once).
    LoginPage.visit()
    LoginPage.login(
      Cypress.env('standard_user'),
      Cypress.env('password')
    )
    cy.url().should('include', '/inventory')
  })

  beforeEach(() => {
    // ─── Reset to a clean logged-in state before each test ───────────────────
    //
    // Strategy: Logout (client-side SPA nav) → clearLocalStorage → Login again.
    //
    // Why NOT cy.visit() or cy.reload() here?
    // SauceDemo's server only serves index.html for the root path ('/').
    // Paths like '/inventory.html' and '/cart.html' are virtual (React router only).
    // cy.reload() on a virtual path would hit a server 404.
    // cy.visit() on the root from a virtual URL can timeout waiting for the load event.
    //
    // Client-side navigation (clicking logout/login) avoids both issues.
    cy.get('#react-burger-menu-btn').click({ force: true })
    cy.get('#logout_sidebar_link').should('be.visible').click()

    // Verify we're on the login page (client-side nav to login form).
    cy.get('#login-button').should('be.visible')

    // Clear ALL localStorage — removes both the session token AND cart contents.
    // This guarantees the next login starts with an empty cart.
    cy.clearLocalStorage()

    // Log back in via the form (client-side nav, no full page load).
    LoginPage.login(
      Cypress.env('standard_user'),
      Cypress.env('password')
    )
    cy.url().should('include', '/inventory')
  })

  it('adds a single item to the cart and verifies the cart badge', () => {
    cy.fixture('products').then((data) => {
      const product = data.items[0].name // 'Sauce Labs Backpack'

      InventoryPage.addToCart(product)

      // The cart badge should show "1".
      InventoryPage.getCartBadge().should('have.text', '1')
    })
  })

  it('adds multiple items and verifies the cart count', () => {
    cy.fixture('products').then((data) => {
      InventoryPage.addToCart(data.items[0].name) // Backpack
      InventoryPage.addToCart(data.items[1].name) // Bike Light

      InventoryPage.getCartBadge().should('have.text', '2')
    })
  })

  it('navigates to the cart and verifies items are present', () => {
    cy.fixture('products').then((data) => {
      const backpack = data.items[0].name
      const bikeLight = data.items[1].name

      InventoryPage.addToCart(backpack)
      InventoryPage.addToCart(bikeLight)
      InventoryPage.goToCart()

      cy.url().should('include', '/cart')

      // Verify both items appear in the cart.
      CartPage.verifyItemInCart(backpack)
      CartPage.verifyItemInCart(bikeLight)
    })
  })

  it('removes an item from the cart', () => {
    cy.fixture('products').then((data) => {
      const backpack = data.items[0].name
      const bikeLight = data.items[1].name

      InventoryPage.addToCart(backpack)
      InventoryPage.addToCart(bikeLight)
      InventoryPage.goToCart()

      // Remove one item.
      CartPage.removeItem(backpack)

      // Backpack is gone; Bike Light remains.
      CartPage.verifyItemNotInCart(backpack)
      CartPage.verifyItemInCart(bikeLight)

      // Cart should now show 1 item.
      CartPage.getCartItems().should('have.length', 1)
    })
  })

  it('uses Continue Shopping to return to the inventory', () => {
    cy.fixture('products').then((data) => {
      InventoryPage.addToCart(data.items[0].name)
      InventoryPage.goToCart()

      CartPage.continueShopping()

      cy.url().should('include', '/inventory')
    })
  })

  it('sorts products by price (low to high) and verifies ascending order', () => {
    InventoryPage.sortBy('lohi')

    // Wait for the sort to apply: the cheapest item ($7.99) must appear first.
    // .should() retries automatically, so this blocks until the React re-render settles.
    cy.get('.inventory_item_price').first().should('contain', '$7.99')

    // Get all price elements and verify they're in ascending order.
    cy.get('.inventory_item_price').then(($prices) => {
      const prices = [...$prices].map((el) =>
        parseFloat(el.innerText.replace('$', ''))
      )
      const sorted = [...prices].sort((a, b) => a - b)
      expect(prices).to.deep.eq(sorted)
    })
  })

  it('verifies all 6 products are displayed on the inventory page', () => {
    cy.fixture('products').then((data) => {
      InventoryPage.getItemCount().should('have.length', data.items.length)
    })
  })
})

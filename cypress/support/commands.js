// ─── commands.js — Custom Cypress Commands ────────────────────────────────────
// Custom commands extend the cy.* namespace so you can call them in any spec.
// They're perfect for repetitive sequences like logging in or adding to cart.
//
// Syntax:  Cypress.Commands.add('commandName', (args) => { ... })
// Usage:   cy.commandName(args)
//
// Docs: https://docs.cypress.io/api/cypress-api/custom-commands

// ─── cy.login(username, password) ────────────────────────────────────────────
// Logs into saucedemo.com via the UI.
// Used in Module 4 POM tests as a quick setup step.
//
// Why use a custom command instead of repeating cy.get/type?
// → Single source of truth. If the login page changes, update ONE place.
Cypress.Commands.add('login', (username, password) => {
  cy.visit(Cypress.env('saucedemo_url'))
  cy.get('#user-name').type(username)
  cy.get('#password').type(password)
  cy.get('#login-button').click()
})

// ─── cy.addToCart(productName) ───────────────────────────────────────────────
// Clicks the "Add to cart" button for a product by its visible name.
//
// Strategy: find the product title that matches, traverse up to its container,
// then find the button within that container. This is robust — it doesn't rely
// on positional indices that break when products reorder.
Cypress.Commands.add('addToCart', (productName) => {
  cy.contains('.inventory_item_name', productName)
    .closest('.inventory_item')
    .find('button')
    .click()
})

// ─── cy.logout() ─────────────────────────────────────────────────────────────
// Opens the burger menu and clicks "Logout".
Cypress.Commands.add('logout', () => {
  cy.get('#react-burger-menu-btn').click()
  cy.get('#logout_sidebar_link').click()
})

// ─── cy.apiGet(endpoint) ─────────────────────────────────────────────────────
// A thin wrapper around cy.request for GET calls to the configured API base URL.
// Returns the Cypress chainable so you can .then(response => ...) on it.
//
// Example:
//   cy.apiGet('/posts/1').then(res => {
//     expect(res.status).to.eq(200)
//   })
Cypress.Commands.add('apiGet', (endpoint) => {
  return cy.request({
    method: 'GET',
    url: `${Cypress.env('api_url')}${endpoint}`,
    failOnStatusCode: false, // Let the test assert the status code itself
  })
})

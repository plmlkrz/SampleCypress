// ─── Module 4 | Lesson 12: Page Object Model — Login ─────────────────────────
// This spec demonstrates the Page Object Model (POM) pattern.
// Notice how clean the tests read — they describe BEHAVIOUR, not DOM selectors.
//
// Compare this to how module1-module3 tests directly call cy.get().
// With POM:
//   • The LoginPage class owns all selectors and actions for the login page.
//   • If the login button's ID changes, we fix it in LoginPage.js — not here.
//   • Tests are self-documenting: loginPage.login(user, pass) tells the story.
//
// testIsolation: false
// ────────────────────
// Cypress 12+ enables testIsolation by default, which navigates to about:blank
// between tests and resets all storage. For external SaaS apps like SauceDemo
// (which load many async resources), the repeated cold navigation is slow.
//
// Setting testIsolation: false keeps the browser on saucedemo between tests.
// We compensate by manually clearing localStorage before each test (which
// removes the SauceDemo session token) then reloading the login page.
// This is faster than cold-loading from about:blank each time.
//
// Fixture usage:
//   cy.fixture() loads cypress/fixtures/users.json so credentials live in one
//   place and can be updated without touching test code.

import LoginPage from '../../pages/LoginPage'

describe('Module 4 | POM — SauceDemo Login', { testIsolation: false }, () => {
  before(() => {
    // Cold-load SauceDemo once before the entire suite runs.
    LoginPage.visit()
  })

  beforeEach(() => {
    // Get back to the login form before each test by logging out via the UI.
    // Clicking Logout is a client-side React route change — no full page reload,
    // so no risk of the SPA load-event timeout issue.
    //
    // On the first test, before() landed us on the login form already.
    // On subsequent tests, we're on an app page (inventory or similar) after the
    // previous test, so we need to log out.
    //
    // We check the current URL to determine whether to log out or just wait.
    cy.url().then((url) => {
      if (!url.includes('www.saucedemo.com') || url.includes('/inventory') || url.includes('/cart')) {
        // We're on an app page — log out via the burger menu.
        cy.get('#react-burger-menu-btn').click({ force: true })
        cy.get('#logout_sidebar_link').should('be.visible').click()
      }
    })
    // Wait for the login form to be ready.
    cy.get('#login-button').should('be.visible')
  })

  it('logs in successfully with valid credentials', () => {
    cy.fixture('users').then((users) => {
      LoginPage.login(users.standard.username, users.standard.password)

      // After successful login, the inventory page loads.
      cy.url().should('include', '/inventory')
      cy.get('.title').should('have.text', 'Products')
    })
  })

  it('shows an error message for a locked-out user', () => {
    cy.fixture('users').then((users) => {
      LoginPage.login(users.locked.username, users.locked.password)

      // Locked users cannot log in — expect an error banner.
      LoginPage.getErrorMessage()
        .should('be.visible')
        .and('contain.text', 'Sorry, this user has been locked out')
    })
  })

  it('shows an error message for invalid credentials', () => {
    cy.fixture('users').then((users) => {
      LoginPage.login(users.invalid.username, users.invalid.password)

      LoginPage.getErrorMessage()
        .should('be.visible')
        .and('contain.text', 'Username and password do not match')
    })
  })

  it('shows an error when username is missing', () => {
    LoginPage.login('', 'some-password')

    LoginPage.getErrorMessage()
      .should('be.visible')
      .and('contain.text', 'Username is required')
  })

  it('shows an error when password is missing', () => {
    LoginPage.login('standard_user', '')

    LoginPage.getErrorMessage()
      .should('be.visible')
      .and('contain.text', 'Password is required')
  })

  it('dismisses the error message using the close button', () => {
    LoginPage.login('', '')

    // The error banner is visible.
    LoginPage.getErrorMessage().should('be.visible')

    // Click the ✕ to dismiss it.
    LoginPage.dismissError()

    // The banner should be gone.
    LoginPage.getErrorMessage().should('not.exist')
  })
})

// ─── LoginPage.js — Page Object Model ────────────────────────────────────────
// The Page Object Model (POM) pattern encapsulates a page's selectors and
// interactions into a reusable class. Tests call page methods instead of
// duplicating cy.get() calls.
//
// Benefits:
//   • If a selector changes, update it in ONE place (here), not every test.
//   • Tests become readable descriptions of behavior, not raw DOM queries.
//   • Forces you to think about your page's API, not its implementation.

class LoginPage {
  // ── Selectors ──────────────────────────────────────────────────────────────
  // Stored as functions (not strings) so that cy.get() is called lazily —
  // only when the method is invoked in a test, not when the class is imported.
  elements = {
    usernameInput:  () => cy.get('#user-name'),
    passwordInput:  () => cy.get('#password'),
    loginButton:    () => cy.get('#login-button'),
    errorMessage:   () => cy.get('[data-test="error"]'),
    errorCloseBtn:  () => cy.get('[data-test="error"] button'),
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  /**
   * Navigate to the SauceDemo login page.
   * Uses Cypress.env so the URL is configured in one place (cypress.config.js).
   */
  visit() {
    cy.visit(Cypress.env('saucedemo_url'))
  }

  /**
   * Fill in credentials and click login.
   * @param {string} username
   * @param {string} password
   */
  login(username, password) {
    // cy.type() cannot accept an empty string — use .clear() alone for blank fields.
    // This lets tests verify validation errors for missing username/password.
    if (username) {
      this.elements.usernameInput().clear().type(username)
    } else {
      this.elements.usernameInput().clear()
    }
    if (password) {
      this.elements.passwordInput().clear().type(password)
    } else {
      this.elements.passwordInput().clear()
    }
    this.elements.loginButton().click()
  }

  /**
   * Dismiss the error banner (click the ✕ close button).
   */
  dismissError() {
    this.elements.errorCloseBtn().click()
  }

  // ── Assertions / Getters ──────────────────────────────────────────────────
  // These return the Cypress chainable so tests can attach .should() to them.

  /** Returns the error message element for assertion chaining. */
  getErrorMessage() {
    return this.elements.errorMessage()
  }
}

// Export a singleton instance — no need to `new LoginPage()` in every test.
export default new LoginPage()

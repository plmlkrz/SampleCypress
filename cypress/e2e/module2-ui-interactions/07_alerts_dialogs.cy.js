// ─── Module 2 | Lesson 7: Alerts & Dialogs ───────────────────────────────────
// JavaScript native alerts (alert, confirm, prompt) block the UI and can't be
// interacted with like DOM elements. Cypress handles them through Window events.
//
// Key concepts:
//   cy.on('window:alert', cb)   — listen for window.alert() calls
//   cy.on('window:confirm', cb) — listen for window.confirm(); return true/false
//   cy.stub(win, 'alert')       — replace alert with a stub you can assert on
//
// IMPORTANT: Cypress automatically accepts (clicks OK on) all alerts by default.
// You only need to handle them manually when you want to:
//   • Assert what message was shown
//   • Cancel a confirm dialog (return false)

describe('Module 2 | Alerts & Dialogs', () => {
  it('handles a simple alert and asserts its message', () => {
    cy.visit('/javascript_alerts')

    // Register the listener BEFORE triggering the alert.
    cy.on('window:alert', (alertText) => {
      // This callback fires synchronously when alert() is called.
      expect(alertText).to.equal('I am a JS Alert')
    })

    cy.contains('button', 'Click for JS Alert').click()

    // Cypress automatically dismisses the alert (clicks OK).
    // Verify the result text on the page confirms it was dismissed.
    cy.get('#result').should('have.text', 'You successfully clicked an alert')
  })

  it('accepts a confirm dialog (clicks OK)', () => {
    cy.visit('/javascript_alerts')

    // Return true from the window:confirm listener to click OK.
    cy.on('window:confirm', () => true)

    cy.contains('button', 'Click for JS Confirm').click()
    cy.get('#result').should('have.text', 'You clicked: Ok')
  })

  it('dismisses a confirm dialog (clicks Cancel)', () => {
    cy.visit('/javascript_alerts')

    // Return false from the window:confirm listener to click Cancel.
    cy.on('window:confirm', () => false)

    cy.contains('button', 'Click for JS Confirm').click()
    cy.get('#result').should('have.text', 'You clicked: Cancel')
  })

  it('handles a prompt dialog and provides input', () => {
    cy.visit('/javascript_alerts')

    // For prompt dialogs, use cy.window() + cy.stub() to provide a return value.
    // The stub replaces window.prompt with a function that returns your string.
    cy.window().then((win) => {
      cy.stub(win, 'prompt').returns('Hello from Cypress!')
    })

    cy.contains('button', 'Click for JS Prompt').click()
    cy.get('#result').should('contain.text', 'Hello from Cypress!')
  })
})

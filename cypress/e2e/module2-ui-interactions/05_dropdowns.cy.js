// ─── Module 2 | Lesson 5: Dropdowns ──────────────────────────────────────────
// Two common dropdown patterns exist on the web:
//   1. Native <select> elements — Cypress handles with .select()
//   2. Custom dropdowns (div/ul/li) — click to open, click to choose
//
// Key commands covered:
//   .select(value)       — choose an option in a native <select>
//   .select(text)        — choose by visible text (also works)
//   .should('have.value')— assert selected value
//   .should('be.selected')— assert a specific <option> is selected

describe('Module 2 | Dropdowns', () => {
  it('selects an option from a native <select> by value', () => {
    cy.visit('/dropdown')

    // The <select> has id="dropdown". .select() accepts the option's value attribute.
    cy.get('#dropdown').select('1')

    // Verify the correct option is now selected.
    cy.get('#dropdown').should('have.value', '1')
  })

  it('selects an option from a native <select> by visible text', () => {
    cy.visit('/dropdown')

    // .select() also accepts the visible text of the option.
    cy.get('#dropdown').select('Option 2')
    cy.get('#dropdown').should('have.value', '2')
  })

  it('asserts that an option is selected using :selected', () => {
    cy.visit('/dropdown')
    cy.get('#dropdown').select('Option 1')

    // .filter(':selected') keeps only the currently selected option.
    cy.get('#dropdown option:selected').should('have.text', 'Option 1')
  })

  it('verifies all options in the dropdown', () => {
    cy.visit('/dropdown')

    // Collect all options and verify their text values.
    cy.get('#dropdown option').then(($options) => {
      const texts = Array.from($options).map((el) => el.text.trim())
      expect(texts).to.include('Option 1')
      expect(texts).to.include('Option 2')
    })
  })

  it('interacts with a custom (non-native) dropdown', () => {
    // The-internet doesn't have a great custom dropdown example, but this
    // pattern covers the typical click → wait for list → click item approach
    // used on any site that builds dropdowns with div/ul/li instead of <select>.

    cy.visit('/jqueryui/menu')

    // Hover over a top-level menu item to reveal its submenu.
    cy.contains('Enabled').trigger('mouseover')

    // The submenu should become visible after triggering the hover.
    cy.contains('Back to JQuery UI').should('be.visible').click()

    // Verify navigation occurred (link goes to /jqueryui on the same host).
    cy.url().should('include', '/jqueryui')
  })
})

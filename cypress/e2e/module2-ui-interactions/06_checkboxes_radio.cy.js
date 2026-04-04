// ─── Module 2 | Lesson 6: Checkboxes & Radio Buttons ─────────────────────────
// Checkboxes and radio buttons need special commands — clicking is not enough
// when you need to guarantee the final state.
//
// Key commands covered:
//   .check()             — check a checkbox or radio (idempotent — safe to call twice)
//   .uncheck()           — uncheck a checkbox
//   .should('be.checked')— assert the input is checked
//   .should('not.be.checked') — assert it is unchecked

describe('Module 2 | Checkboxes & Radio Buttons', () => {
  it('reads the initial state of checkboxes', () => {
    cy.visit('/checkboxes')

    // The first checkbox starts unchecked, the second starts checked.
    cy.get('input[type="checkbox"]').eq(0).should('not.be.checked')
    cy.get('input[type="checkbox"]').eq(1).should('be.checked')
  })

  it('checks an unchecked checkbox', () => {
    cy.visit('/checkboxes')

    cy.get('input[type="checkbox"]').eq(0).check()
    cy.get('input[type="checkbox"]').eq(0).should('be.checked')
  })

  it('unchecks a checked checkbox', () => {
    cy.visit('/checkboxes')

    cy.get('input[type="checkbox"]').eq(1).uncheck()
    cy.get('input[type="checkbox"]').eq(1).should('not.be.checked')
  })

  it('checks multiple checkboxes at once', () => {
    cy.visit('/checkboxes')

    // Pass an array of values to .check() to select multiple at once.
    // This only works when the checkboxes have a value attribute.
    // When they don't, chain .check() individually.
    cy.get('input[type="checkbox"]').eq(0).check()
    cy.get('input[type="checkbox"]').eq(1).check()

    cy.get('input[type="checkbox"]').each(($cb) => {
      expect($cb).to.be.checked
    })
  })

  it('counts how many checkboxes are checked', () => {
    cy.visit('/checkboxes')

    cy.get('input[type="checkbox"]').check() // check all
    cy.get('input[type="checkbox"]:checked').should('have.length', 2)
  })

  // ─── Note on Radio Buttons ─────────────────────────────────────────────────
  // the-internet.herokuapp.com doesn't have a dedicated radio button page,
  // but the commands work the same way:
  //
  //   cy.get('input[type="radio"][value="option1"]').check()
  //   cy.get('input[type="radio"][value="option1"]').should('be.checked')
  //   cy.get('input[type="radio"][value="option2"]').should('not.be.checked')
  //
  // Because radio buttons are mutually exclusive, checking one automatically
  // unchecks the others in the same group. Cypress handles this correctly.
})

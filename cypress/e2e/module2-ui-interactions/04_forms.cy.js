// ─── Module 2 | Lesson 4: Forms ───────────────────────────────────────────────
// Forms are the most common interaction surface in web apps.
//
// Key commands covered:
//   .type(text)          — simulate keyboard input into an input/textarea
//   .clear()             — clear an input's current value
//   .submit()            — submit a form element
//   .invoke('val', '')   — set value programmatically (bypasses typing delay)
//   .should('have.value')— assert the current input value
//   cy.get('form').submit() vs clicking the submit button — both work

describe('Module 2 | Forms', () => {
  beforeEach(() => {
    cy.visit('/login')
  })

  it('types into username and password fields', () => {
    cy.get('#username').type('tomsmith')
    cy.get('#password').type('SuperSecretPassword!')

    cy.get('#username').should('have.value', 'tomsmith')
    cy.get('#password').should('have.value', 'SuperSecretPassword!')
  })

  it('clears a field and re-types', () => {
    cy.get('#username').type('wrong-user')
    cy.get('#username').clear().type('tomsmith')
    cy.get('#username').should('have.value', 'tomsmith')
  })

  it('submits the form by clicking the button', () => {
    cy.get('#username').type('tomsmith')
    cy.get('#password').type('SuperSecretPassword!')
    cy.get('button[type="submit"]').click()

    // After successful login, the URL changes and a flash message appears.
    cy.url().should('include', '/secure')
    cy.get('.flash.success').should('be.visible').and('contain.text', 'logged in')
  })

  it('submits the form using .submit() on the form element', () => {
    cy.get('#username').type('tomsmith')
    cy.get('#password').type('SuperSecretPassword!')
    // .submit() triggers the form's submit event directly.
    cy.get('form').submit()
    cy.url().should('include', '/secure')
  })

  it('shows an error for invalid credentials', () => {
    cy.get('#username').type('bad-user')
    cy.get('#password').type('wrong-password')
    cy.get('button[type="submit"]').click()

    // Invalid login → stays on /login and shows an error flash.
    cy.url().should('include', '/login')
    cy.get('.flash.error')
      .should('be.visible')
      .and('contain.text', 'Your username is invalid!')
  })

  it('types special characters and keyboard sequences', () => {
    // Cypress supports special key sequences using curly-brace notation.
    cy.get('#username').type('hello{selectall}{del}')
    cy.get('#username').should('have.value', '')

    // Type then press Enter to submit (same as clicking Submit).
    cy.get('#username').type('tomsmith')
    cy.get('#password').type('SuperSecretPassword!{enter}')
    cy.url().should('include', '/secure')
  })
})

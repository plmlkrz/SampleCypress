// ─── Module 1 | Lesson 2: Assertions ─────────────────────────────────────────
// Assertions verify that the application behaves as expected.
// Cypress uses two assertion styles — pick the one that reads best for your context.
//
// 1. BDD style  (Chai-BDD)  — chains onto cy commands:  .should('be.visible')
// 2. TDD style  (Chai-TDD)  — standalone expect():      expect(value).to.eq(42)
//
// Key commands covered:
//   .should()        — the primary assertion chain
//   .and()           — chain additional assertions on the same subject
//   expect()         — TDD-style for values you already have
//   .should(cb)      — callback form for complex multi-step assertions

describe('Module 1 | Assertions', () => {
  beforeEach(() => {
    cy.visit('/login')
  })

  // ── Visibility ────────────────────────────────────────────────────────────
  it('asserts elements are visible', () => {
    cy.get('#username').should('be.visible')
    cy.get('#password').should('be.visible')
    cy.get('button[type="submit"]').should('be.visible')
  })

  it('asserts an element does NOT exist', () => {
    // 'not.exist' means the element is not in the DOM at all.
    // 'not.be.visible' means it's in the DOM but hidden (display:none etc).
    cy.get('.flash.error').should('not.exist')
  })

  // ── Text Content ──────────────────────────────────────────────────────────
  it('asserts exact and partial text', () => {
    // 'have.text' checks the full trimmed text content.
    // The login page h2 reads "Login Page" — use contain for partial matches.
    cy.get('h2').should('contain.text', 'Login')

    // 'contain.text' (or just 'contain') checks for a substring.
    // The login page has a subtext element below the heading.
    cy.get('h4').should('contain.text', 'This is where you can log into the secure area')
  })

  // ── Attribute Assertions ──────────────────────────────────────────────────
  it('asserts element attributes', () => {
    cy.get('#username')
      .should('have.attr', 'name', 'username')
      .and('have.attr', 'type', 'text')

    // .and() chains another assertion on the SAME subject (the #username input).
    cy.get('#password')
      .should('have.attr', 'type', 'password')
  })

  // ── Value Assertions ──────────────────────────────────────────────────────
  it('asserts input value after typing', () => {
    cy.get('#username').type('tomsmith')

    // 'have.value' checks the current value of a form input.
    cy.get('#username').should('have.value', 'tomsmith')
  })

  // ── CSS Class Assertions ──────────────────────────────────────────────────
  it('asserts CSS classes on an element', () => {
    cy.get('button[type="submit"]').should('have.class', 'radius')
  })

  // ── Chaining Multiple Assertions ──────────────────────────────────────────
  it('chains multiple assertions with .and()', () => {
    cy.get('#username')
      .should('be.visible')
      .and('not.be.disabled')
      .and('have.attr', 'name', 'username')
  })

  // ── TDD Style with expect() ───────────────────────────────────────────────
  it('uses expect() for value-based assertions', () => {
    cy.title().then((title) => {
      // .then() yields the resolved value (title string here).
      // Inside .then() you have a synchronous value — use expect().
      expect(title).to.eq('The Internet')
      expect(title).to.be.a('string')
      expect(title).to.have.length.above(3)
    })
  })

  // ── Callback-form .should() ───────────────────────────────────────────────
  it('uses .should(callback) for multi-step assertions', () => {
    // When you need to assert multiple things AND Cypress should retry
    // the whole assertion if any part fails, use the callback form.
    cy.get('h2').should(($el) => {
      const text = $el.text()
      expect(text).to.include('Login')
      expect($el).to.have.length(1)
    })
  })

  // ── Length Assertions ─────────────────────────────────────────────────────
  it('asserts the number of matching elements', () => {
    cy.visit('/')
    // The homepage lists many links. Assert there are more than 5.
    cy.get('ul li a').should('have.length.above', 5)
  })
})

// ─── Module 1 | Lesson 3: Locators ───────────────────────────────────────────
// Locators tell Cypress which DOM element(s) to target.
// Choosing the right locator makes tests maintainable and resilient to change.
//
// Locator priority (best → worst):
//   1. data-cy / data-test attributes  (purpose-built for testing, never change)
//   2. ID (#id)                        (stable if the dev keeps them meaningful)
//   3. Accessible labels / roles       (cy.contains, ARIA)
//   4. CSS class (.class)              (avoid — styling changes break tests)
//   5. XPath                           (last resort — Cypress doesn't use it natively)
//
// Key commands covered:
//   cy.get(selector)       — CSS selector (most common)
//   cy.contains(text)      — find by visible text
//   .find(selector)        — search within a found element
//   .within(fn)            — scope all commands inside a parent
//   .eq(index)             — pick one element from a matched set
//   .first() / .last()     — shorthand for .eq(0) / .eq(-1)
//   .filter(selector)      — narrow a matched set
//   .not(selector)         — exclude from a matched set
//   cy.get('input').each() — iterate over multiple matched elements

describe('Module 1 | Locators', () => {
  it('finds elements by ID', () => {
    cy.visit('/login')
    // ID selectors (#id) are fast and specific — prefer them when available.
    cy.get('#username').should('be.visible')
    cy.get('#password').should('be.visible')
  })

  it('finds elements by CSS attribute selector', () => {
    cy.visit('/login')
    // Attribute selectors [attr="value"] are great for stable attributes like name, type.
    cy.get('[name="username"]').should('exist')
    cy.get('button[type="submit"]').should('be.visible')
  })

  it('finds elements by visible text with cy.contains()', () => {
    cy.visit('/')
    // cy.contains(text) finds the first element that contains the given text.
    // You can also pass a selector to scope it: cy.contains('a', 'Checkboxes')
    cy.contains('a', 'Checkboxes').should('be.visible')
    cy.contains('a', 'Form Authentication').should('be.visible')
  })

  it('narrows search with .find() inside a parent', () => {
    cy.visit('/')
    // .find() searches within the previously found element — like a CSS descendant.
    // This is safer than a long CSS path because it's explicit about the relationship.
    cy.get('#content')
      .find('ul')
      .find('li')
      .should('have.length.above', 5)
  })

  it('scopes commands with .within()', () => {
    cy.visit('/login')
    // .within() is like temporarily zooming into a container.
    // All cy commands inside the callback are scoped to that element.
    cy.get('form').within(() => {
      cy.get('#username').type('tomsmith')
      cy.get('#password').type('SuperSecretPassword!')
      cy.get('button[type="submit"]').click()
    })
    cy.url().should('include', '/secure')
  })

  it('picks a specific element from a list with .eq()', () => {
    cy.visit('/')
    // .eq(n) is zero-indexed. .eq(0) === .first(), .eq(-1) === .last()
    cy.get('#content ul li').eq(0).should('contain.text', 'A/B Testing')
    cy.get('#content ul li').first().should('contain.text', 'A/B Testing')
    cy.get('#content ul li').last().invoke('text').should('not.be.empty')
  })

  it('filters a matched set with .filter()', () => {
    cy.visit('/checkboxes')
    // .filter() keeps only the elements that match the extra selector.
    cy.get('input[type="checkbox"]')
      .filter(':checked')
      .should('have.length', 1)
  })

  it('excludes elements from a matched set with .not()', () => {
    cy.visit('/checkboxes')
    // .not() is the inverse of .filter() — removes matching elements from the set.
    cy.get('input[type="checkbox"]')
      .not(':checked')
      .should('have.length', 1)
  })

  it('iterates over multiple elements with .each()', () => {
    cy.visit('/')
    // .each() loops over every element in the matched set.
    // The callback receives a jQuery-wrapped element and its index.
    cy.get('#content ul li a').each(($link, index) => {
      expect($link).to.be.visible
      expect($link.text().length).to.be.above(0)
    })
  })
})

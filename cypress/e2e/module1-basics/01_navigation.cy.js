// ─── Module 1 | Lesson 1: Navigation ─────────────────────────────────────────
// Learn how Cypress navigates between pages and how to assert on URL / title.
//
// Key commands covered:
//   cy.visit()   — load a URL in the browser
//   cy.url()     — get the current URL as a string (chainable)
//   cy.title()   — get the page <title> tag content
//   cy.go()      — browser back / forward navigation
//   cy.reload()  — reload the current page
//
// The baseUrl is set to https://the-internet.herokuapp.com in cypress.config.js,
// so cy.visit('/') opens that site's homepage.

describe('Module 1 | Navigation', () => {
  // beforeEach runs before every it() block in this describe.
  // It's the right place to set up shared preconditions.
  beforeEach(() => {
    cy.visit('/')
  })

  it('visits the homepage and asserts the URL', () => {
    // cy.url() returns the full current URL.
    // .should() chains an assertion directly onto the command.
    cy.url().should('include', 'the-internet.herokuapp.com')
  })

  it('asserts the page title', () => {
    // cy.title() reads the <title> element of the page.
    cy.title().should('eq', 'The Internet')
  })

  it('navigates to a sub-page and asserts the URL changes', () => {
    // Relative paths are appended to the baseUrl automatically.
    cy.visit('/login')
    cy.url().should('include', '/login')

    // The page should contain the word "Login" somewhere.
    cy.contains('h2', 'Login').should('be.visible')
  })

  it('uses browser back and forward navigation', () => {
    cy.visit('/login')
    cy.url().should('include', '/login')

    // cy.go('back') simulates clicking the browser's ← button.
    cy.go('back')
    cy.url().should('eq', 'https://the-internet.herokuapp.com/')

    // cy.go('forward') simulates the browser's → button.
    cy.go('forward')
    cy.url().should('include', '/login')
  })

  it('reloads the page', () => {
    cy.visit('/login')

    // Type something in the username field…
    cy.get('#username').type('test-user')

    // …then reload. The field should be empty again.
    cy.reload()
    cy.get('#username').should('have.value', '')
  })

  it('visits an absolute URL (overrides baseUrl)', () => {
    // You can always pass a full URL to override the baseUrl.
    // The baseUrl is ignored when a full URL is passed to cy.visit().
    cy.visit('https://the-internet.herokuapp.com/forgot_password')
    cy.url().should('include', '/forgot_password')
    cy.title().should('not.be.empty')
  })
})

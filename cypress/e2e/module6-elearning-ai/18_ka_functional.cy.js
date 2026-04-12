// Module 6 | Spec 18: Khan Academy — Functional Happy Path
//
// Tests Khan Academy's public pages (no login required).
// Goal: confirm the site loads, key navigation works, and search returns results.
// This is a smoke-test layer — the foundation all other Module 6 specs build on.
//
// Target: https://www.khanacademy.org (Cypress.env('khanacademy_url'))
// testIsolation: true (default) — cy.visit() is safe on top-level KA routes.

import KhanAcademyPage from '../../pages/KhanAcademyPage'

describe('Module 6 | KA Functional — Happy Path', () => {
  it('homepage loads with a visible main heading', () => {
    KhanAcademyPage.visit()
    KhanAcademyPage.elements.mainHeading().should('be.visible')
  })

  it('homepage contains links to core academic subjects', () => {
    KhanAcademyPage.visit()
    // At least one subject link (math, science, or computing) must be present
    KhanAcademyPage.elements.subjectLinks().should('have.length.greaterThan', 0)
  })

  it('math subject page loads and has a heading', () => {
    KhanAcademyPage.visitMath()
    KhanAcademyPage.elements.mainHeading().should('be.visible')
    cy.url().should('include', '/math')
  })

  it('science subject page loads and has a heading', () => {
    KhanAcademyPage.visitScience()
    KhanAcademyPage.elements.mainHeading().should('be.visible')
    cy.url().should('include', '/science')
  })

  it('search input is present on the homepage', () => {
    KhanAcademyPage.visit()
    KhanAcademyPage.elements.searchInput().should('exist')
  })
})

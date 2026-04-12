// Page Object: KhanAcademyPage
// Covers Khan Academy's public-facing pages (no login required).
// Selector strategy: [data-test-id] > #id > [aria-label] > attribute pattern > class wildcard

class KhanAcademyPage {
  elements = {
    // Homepage
    mainHeading:   () => cy.get('h1'),
    // Subject/course navigation — KA uses data-test-id on some links; fall back to href patterns
    subjectLinks:  () => cy.get('a[href*="/math"], a[href*="/science"], a[href*="/computing"]'),
    courseCards:   () => cy.get('[data-test-id="course-card"], [class*="CourseCard"], [class*="course-card"]'),
    // Search
    searchInput:   () => cy.get('input[type="search"], [data-test-id="search-box"], input[placeholder*="Search"]'),
    searchResults: () => cy.get('[data-test-id="search-result"], [class*="SearchResult"], [class*="search-result"]'),
  }

  visit() {
    cy.visit(Cypress.env('khanacademy_url'))
  }

  visitMath() {
    cy.visit(`${Cypress.env('khanacademy_url')}/math`)
  }

  visitScience() {
    cy.visit(`${Cypress.env('khanacademy_url')}/science`)
  }

  search(query) {
    this.elements.searchInput().type(query)
    cy.get('body').type('{enter}')
  }
}

export default new KhanAcademyPage()

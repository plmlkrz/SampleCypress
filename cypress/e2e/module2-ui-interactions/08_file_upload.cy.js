// ─── Module 2 | Lesson 8: File Upload ────────────────────────────────────────
// Cypress can simulate file uploads using .selectFile(), introduced in v9.3.
// No plugins required for basic file uploads.
//
// Key commands covered:
//   .selectFile(path)         — attach a real file from the filesystem
//   .selectFile(fixture)      — attach a file using a Cypress fixture
//   .selectFile([...], {multiple:true}) — attach multiple files
//   cy.fixture(name)          — load fixture data / files for use in tests

describe('Module 2 | File Upload', () => {
  it('uploads a file using a fixture', () => {
    cy.visit('/upload')

    // cy.fixture() loads the file from cypress/fixtures/.
    // Chained .selectFile() attaches it to the file input.
    cy.get('#file-upload').selectFile('cypress/fixtures/users.json')

    cy.get('#file-submit').click()

    // After upload, the page shows the uploaded filename.
    cy.get('#uploaded-files').should('contain.text', 'users.json')
  })

  it('uploads a file using a blob (created in the test)', () => {
    cy.visit('/upload')

    // You can also create a file on-the-fly using a Cypress.Buffer.
    // This is useful when you don't want to commit test files to the repo.
    const fileContent = 'Hello from Cypress file upload test!'

    cy.get('#file-upload').selectFile({
      contents: Cypress.Buffer.from(fileContent),
      fileName: 'test-upload.txt',
      mimeType: 'text/plain',
    })

    cy.get('#file-submit').click()
    cy.get('#uploaded-files').should('contain.text', 'test-upload.txt')
  })

  it('verifies the file input shows the selected filename before upload', () => {
    cy.visit('/upload')

    cy.get('#file-upload').selectFile('cypress/fixtures/products.json')

    // After selection (before submission), the input reflects the filename.
    cy.get('#file-upload').then(($input) => {
      expect($input[0].files[0].name).to.eq('products.json')
    })
  })
})

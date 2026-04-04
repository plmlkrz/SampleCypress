// ─── Module 3 | Lesson 9: API Testing ────────────────────────────────────────
// Cypress can make HTTP requests directly using cy.request() — no browser needed.
// This is great for:
//   • Setting up test data before a UI test (faster than navigating the UI)
//   • Verifying your backend independently of the frontend
//   • Testing REST API contracts
//
// Target: https://jsonplaceholder.typicode.com — a free, public fake REST API.
// Configured as Cypress.env('api_url') in cypress.config.js.
//
// Key commands covered:
//   cy.request(method, url)      — make an HTTP request
//   cy.request({ ...options })   — full options form
//   response.status              — HTTP status code
//   response.body                — parsed JSON body
//   response.headers             — response headers

describe('Module 3 | API Testing with cy.request()', () => {
  const apiUrl = () => Cypress.env('api_url')

  // ── GET Requests ────────────────────────────────────────────────────────────
  it('GETs a single post and asserts the response', () => {
    cy.request('GET', `${apiUrl()}/posts/1`).then((response) => {
      // response.status is the HTTP status code (number, not string).
      expect(response.status).to.eq(200)

      // response.body is automatically parsed as JSON when Content-Type is application/json.
      expect(response.body).to.have.property('id', 1)
      expect(response.body).to.have.property('userId', 1)
      expect(response.body.title).to.be.a('string').and.not.be.empty
    })
  })

  it('GETs a list of posts and asserts the count', () => {
    cy.request('GET', `${apiUrl()}/posts`).then((response) => {
      expect(response.status).to.eq(200)
      // JSONPlaceholder returns 100 posts.
      expect(response.body).to.be.an('array').with.length(100)
    })
  })

  it('filters posts by userId using query params', () => {
    cy.request({
      method: 'GET',
      url: `${apiUrl()}/posts`,
      qs: { userId: 1 }, // qs = query string: ?userId=1
    }).then((response) => {
      expect(response.status).to.eq(200)
      // All returned posts should belong to userId 1.
      response.body.forEach((post) => {
        expect(post.userId).to.eq(1)
      })
    })
  })

  // ── POST Requests ───────────────────────────────────────────────────────────
  it('POSTs a new resource and asserts the created response', () => {
    cy.fixture('api_responses').then((data) => {
      cy.request({
        method: 'POST',
        url: `${apiUrl()}/posts`,
        body: data.newPost,
        headers: { 'Content-Type': 'application/json' },
      }).then((response) => {
        // 201 Created is the correct HTTP status for resource creation.
        expect(response.status).to.eq(201)
        expect(response.body.title).to.eq(data.newPost.title)
        // JSONPlaceholder assigns id 101 to new posts (it's a fake API).
        expect(response.body).to.have.property('id')
      })
    })
  })

  // ── PUT / PATCH Requests ────────────────────────────────────────────────────
  it('PUTs (full update) an existing resource', () => {
    cy.request({
      method: 'PUT',
      url: `${apiUrl()}/posts/1`,
      body: { id: 1, title: 'Updated Title', body: 'Updated body', userId: 1 },
    }).then((response) => {
      expect(response.status).to.eq(200)
      expect(response.body.title).to.eq('Updated Title')
    })
  })

  it('DELETEs a resource and asserts 200 status', () => {
    cy.request({
      method: 'DELETE',
      url: `${apiUrl()}/posts/1`,
    }).then((response) => {
      // JSONPlaceholder returns 200 with an empty body for DELETE.
      expect(response.status).to.eq(200)
    })
  })

  // ── Error Status Codes ──────────────────────────────────────────────────────
  it('handles a 404 Not Found response', () => {
    // failOnStatusCode: false prevents Cypress from throwing on non-2xx codes.
    cy.request({
      method: 'GET',
      url: `${apiUrl()}/posts/9999`,
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.eq(404)
    })
  })

  // ── Using cy.request() to set up UI test state ──────────────────────────────
  // Pro tip: Use cy.request() to log in via API (set a cookie/token) instead of
  // navigating the login UI for every test. This makes your suite significantly faster.
  //
  // Example pattern (pseudocode — adjust to your app's auth mechanism):
  //
  //   cy.request('POST', '/api/login', { user, pass }).then((res) => {
  //     window.localStorage.setItem('token', res.body.token)
  //   })
})

/// <reference types="cypress" />

/**
 * SMOKE TESTS
 * 
 * Quick tests to verify the application is running and basic functionality works.
 * These tests should run fast and catch major broken functionality.
 */

describe('Application Smoke Tests', () => {
  
  /**
   * BASIC CHECK: App loads without crashing
   * 
   * WHAT THIS TESTS:
   * - Application starts up correctly
   * - Main navigation is visible
   * - No JavaScript errors prevent basic loading
   * 
   * SUCCESS CRITERIA:
   * - Page loads within reasonable time
   * - Header and navigation are visible
   * - No console errors that break functionality
   */
  it('should load the application homepage without errors', () => {
    cy.visit('/')
    
    // Check basic page structure loads
    cy.get('[data-testid="app-header"]', { timeout: 15000 }).should('be.visible')
    cy.get('[data-testid="app-sidebar"]').should('be.visible')
    cy.get('[data-testid="main-content"]').should('be.visible')
    
    // Check navigation menu exists
    cy.get('[data-testid="nav-dashboard"]').should('be.visible')
    cy.get('[data-testid="nav-quotas"]').should('be.visible')
    cy.get('[data-testid="nav-call-offs"]').should('be.visible')
    
    // Check page title
    cy.title().should('contain', 'Supply Chain')
  })

  /**
   * BASIC CHECK: Quotas page loads and shows data
   * 
   * WHAT THIS TESTS:
   * - Quotas page is accessible
   * - Data table loads (even if empty)
   * - Basic page functionality works
   */
  it('should load the quotas page and display the data table', () => {
    cy.visit('/quotas')
    
    // Check page loaded
    cy.contains('Quotas').should('be.visible')
    cy.get('[data-testid="quotas-table"]', { timeout: 10000 }).should('be.visible')
    
    // Check search functionality exists
    cy.get('[placeholder*="Search"]').should('be.visible')
    
    // Check create button exists
    cy.contains('New Quota').should('be.visible')
  })

  /**
   * BASIC CHECK: Call-offs page loads and shows data
   * 
   * WHAT THIS TESTS:
   * - Call-offs page is accessible  
   * - Data table loads (even if empty)
   * - Create functionality is available
   */
  it('should load the call-offs page and display the data table', () => {
    cy.visit('/call-offs')
    
    // Check page loaded
    cy.contains('Call-Offs').should('be.visible')
    cy.get('[data-testid="call-offs-table"]', { timeout: 10000 }).should('be.visible')
    
    // Check create button exists and is clickable
    cy.get('[data-testid="create-call-off-button"]').should('be.visible').should('not.be.disabled')
  })

  /**
   * BASIC CHECK: Create call-off wizard opens
   * 
   * WHAT THIS TESTS:
   * - Dialog opens when create button clicked
   * - First step of wizard displays
   * - Cancel functionality works
   */
  it('should open the create call-off wizard when button is clicked', () => {
    cy.visit('/call-offs')
    
    // Click create button
    cy.get('[data-testid="create-call-off-button"]').click()
    
    // Check wizard opened
    cy.get('[role="dialog"]').should('be.visible')
    cy.contains('Create New Call-Off').should('be.visible')
    cy.contains('Select Counterparty').should('be.visible')
    
    // Check cancel works
    cy.contains('Cancel').click()
    cy.get('[role="dialog"]').should('not.exist')
  })

  /**
   * BASIC CHECK: App handles navigation correctly
   * 
   * WHAT THIS TESTS:
   * - URL routing works
   * - Browser back/forward works
   * - Links update URL correctly
   */
  it('should handle navigation and URL changes correctly', () => {
    // Start at home
    cy.visit('/')
    cy.url().should('match', /\/$/)
    
    // Navigate to quotas
    cy.get('[data-testid="nav-quotas"]').click()
    cy.url().should('include', '/quotas')
    
    // Navigate to call-offs
    cy.get('[data-testid="nav-call-offs"]').click()
    cy.url().should('include', '/call-offs')
    
    // Use browser back
    cy.go('back')
    cy.url().should('include', '/quotas')
    
    // Use browser forward
    cy.go('forward')
    cy.url().should('include', '/call-offs')
  })
})
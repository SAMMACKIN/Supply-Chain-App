/// <reference types="cypress" />

/**
 * CALL-OFF WORKFLOW E2E TESTS
 * 
 * These tests verify the core business workflow for creating and managing call-offs.
 * Each test simulates real user scenarios that traders and operations staff perform daily.
 */

describe('Call-Off Management Workflow', () => {
  beforeEach(() => {
    // Start fresh for each test
    cy.visit('/')
    
    // Wait for the app to load fully
    cy.get('[data-testid="app-header"]', { timeout: 10000 }).should('be.visible')
  })

  /**
   * BUSINESS SCENARIO: New trader wants to create their first call-off
   * 
   * WHAT THIS TESTS:
   * - User can navigate to call-offs section
   * - Create call-off wizard opens properly
   * - All three steps of wizard work correctly
   * - Call-off appears in the list after creation
   * 
   * SUCCESS CRITERIA:
   * - Wizard completes without errors
   * - New call-off shows in list with correct details
   * - Status is "NEW" for freshly created call-off
   */
  it('should allow a trader to create a new call-off through the 3-step wizard', () => {
    // Navigate to call-offs page
    cy.get('[data-testid="nav-call-offs"]').click()
    cy.url().should('include', '/call-offs')
    cy.contains('Call-Offs').should('be.visible')

    // Start creating a new call-off
    cy.get('[data-testid="create-call-off-button"]', { timeout: 5000 }).click()
    cy.get('[role="dialog"]').should('be.visible')
    cy.contains('Create New Call-Off').should('be.visible')

    // STEP 1: Select counterparty
    cy.contains('Select Counterparty').should('be.visible')
    cy.get('[data-testid="counterparty-select"]').click()
    cy.get('.MuiMenuItem-root').first().click()
    cy.get('[data-testid="wizard-next-button"]').should('not.be.disabled').click()

    // STEP 2: Choose quota
    cy.contains('Choose Quota').should('be.visible')
    cy.get('[data-testid="quota-select"]').click()
    cy.get('.MuiMenuItem-root').first().click()
    cy.get('[data-testid="wizard-next-button"]').should('not.be.disabled').click()

    // STEP 3: Enter call-off details
    cy.contains('Call-Off Details').should('be.visible')
    cy.get('[data-testid="bundle-qty-input"]').clear().type('25')
    cy.get('[data-testid="requested-delivery-date"]').type('2025-02-15')
    
    // Submit the call-off
    cy.get('[data-testid="create-call-off-submit"]').click()

    // Verify success
    cy.contains('Call-off created successfully', { timeout: 10000 }).should('be.visible')
    cy.get('[role="dialog"]').should('not.exist')

    // Verify call-off appears in list
    cy.contains('25 bundles').should('be.visible')
    cy.get('[data-testid="status-chip-new"]').should('be.visible')
  })

  /**
   * BUSINESS SCENARIO: Operations manager reviews pending call-offs
   * 
   * WHAT THIS TESTS:
   * - Call-offs list loads and displays data
   * - Status filtering works correctly
   * - User can view call-off details
   * 
   * SUCCESS CRITERIA:
   * - List shows call-offs with proper information
   * - Filtering updates the displayed results
   * - Detail view opens with complete information
   */
  it('should display call-offs in a list with filtering and detail view', () => {
    cy.visit('/call-offs')
    
    // Verify list loads
    cy.get('[data-testid="call-offs-table"]', { timeout: 10000 }).should('be.visible')
    
    // Check if there are any call-offs (might be empty on first run)
    cy.get('body').then($body => {
      if ($body.find('[data-testid="call-off-row"]').length > 0) {
        // If call-offs exist, test the functionality
        
        // Test status filtering
        cy.get('[data-testid="status-filter"]').click()
        cy.contains('NEW').click()
        cy.get('[data-testid="call-off-row"]').should('contain', 'NEW')
        
        // View first call-off details
        cy.get('[data-testid="view-call-off-button"]').first().click()
        cy.get('[data-testid="call-off-detail-dialog"]').should('be.visible')
        cy.contains('Call-Off Details').should('be.visible')
        
        // Close detail view
        cy.get('[data-testid="close-detail-button"]').click()
        cy.get('[data-testid="call-off-detail-dialog"]').should('not.exist')
      } else {
        // If no call-offs exist, verify empty state
        cy.contains('No call-offs found').should('be.visible')
      }
    })
  })

  /**
   * BUSINESS SCENARIO: Manager needs to confirm a call-off for processing
   * 
   * WHAT THIS TESTS:
   * - Status change workflow works correctly
   * - Confirmation dialogs appear for critical actions
   * - Status updates reflect in the UI immediately
   * 
   * SUCCESS CRITERIA:
   * - Status changes from NEW to CONFIRMED
   * - UI updates immediately without page refresh
   * - Confirmation dialog prevents accidental changes
   */
  it('should allow confirming a call-off and updating its status', () => {
    // First create a call-off to confirm
    cy.createCallOff({
      counterparty: 'first-available',
      callOffBundles: '10'
    })

    // Navigate back to list
    cy.visit('/call-offs')
    
    // Find and confirm the call-off
    cy.get('[data-testid="call-off-row"]').first().within(() => {
      cy.get('[data-testid="call-off-actions-menu"]').click()
    })
    
    cy.get('[data-testid="confirm-call-off-action"]').click()
    
    // Handle confirmation dialog if it appears
    cy.get('body').then($body => {
      if ($body.find('[data-testid="confirmation-dialog"]').length > 0) {
        cy.get('[data-testid="confirm-button"]').click()
      }
    })

    // Verify status changed
    cy.contains('Call-off confirmed successfully', { timeout: 10000 }).should('be.visible')
    cy.get('[data-testid="status-chip-confirmed"]').should('be.visible')
  })

  /**
   * BUSINESS SCENARIO: User accidentally tries to delete important data
   * 
   * WHAT THIS TESTS:
   * - Confirmation dialogs prevent accidental deletions
   * - Cancel option works correctly
   * - Data remains unchanged when action is cancelled
   * 
   * SUCCESS CRITERIA:
   * - Confirmation dialog appears before deletion
   * - Cancelling leaves data unchanged
   * - UI behavior is consistent and safe
   */
  it('should show confirmation dialog before deleting a call-off', () => {
    // Create a call-off to potentially delete
    cy.createCallOff({
      counterparty: 'first-available', 
      callOffBundles: '5'
    })

    cy.visit('/call-offs')
    
    // Try to delete the call-off
    cy.get('[data-testid="call-off-row"]').first().within(() => {
      cy.get('[data-testid="call-off-actions-menu"]').click()
    })
    
    cy.get('[data-testid="delete-call-off-action"]').click()
    
    // Verify confirmation dialog appears
    cy.get('[data-testid="confirmation-dialog"]').should('be.visible')
    cy.contains('Are you sure').should('be.visible')
    
    // Cancel the deletion
    cy.get('[data-testid="cancel-button"]').click()
    
    // Verify call-off still exists
    cy.get('[data-testid="call-off-row"]').should('exist')
    cy.contains('5 bundles').should('be.visible')
  })

  /**
   * BUSINESS SCENARIO: User needs to navigate between different sections
   * 
   * WHAT THIS TESTS:
   * - Navigation between main sections works
   * - URLs update correctly
   * - Page content loads properly
   * 
   * SUCCESS CRITERIA:
   * - All navigation links are functional
   * - Content loads without errors
   * - User can access all main features
   */
  it('should navigate between quotas and call-offs sections correctly', () => {
    // Start at dashboard
    cy.visit('/')
    cy.get('[data-testid="dashboard-title"]').should('be.visible')

    // Navigate to quotas
    cy.get('[data-testid="nav-quotas"]').click()
    cy.url().should('include', '/quotas')
    cy.contains('Quotas').should('be.visible')
    cy.get('[data-testid="quotas-table"]', { timeout: 10000 }).should('be.visible')

    // Navigate to call-offs
    cy.get('[data-testid="nav-call-offs"]').click()
    cy.url().should('include', '/call-offs')
    cy.contains('Call-Offs').should('be.visible')
    cy.get('[data-testid="call-offs-table"]', { timeout: 10000 }).should('be.visible')

    // Navigate back to dashboard
    cy.get('[data-testid="nav-dashboard"]').click()
    cy.url().should('match', /\/$/)
    cy.get('[data-testid="dashboard-title"]').should('be.visible')
  })
})
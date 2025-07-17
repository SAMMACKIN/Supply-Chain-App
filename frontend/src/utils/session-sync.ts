// Session synchronization utilities for handling multiple tabs/instances

interface SessionSyncMessage {
  type: 'SESSION_UPDATED' | 'SESSION_CLEARED' | 'TAB_CLOSED'
  timestamp: number
  tabId: string
}

export class SessionSync {
  private tabId: string
  private channel: BroadcastChannel | null = null
  private onSessionClear?: () => void

  constructor() {
    this.tabId = `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    // Try to use BroadcastChannel API if available
    if ('BroadcastChannel' in window) {
      this.channel = new BroadcastChannel('supabase-session-sync')
    }
  }

  init(onSessionClear: () => void) {
    this.onSessionClear = onSessionClear

    if (this.channel) {
      this.channel.onmessage = (event: MessageEvent<SessionSyncMessage>) => {
        const { type, tabId } = event.data
        
        // Ignore messages from self
        if (tabId === this.tabId) return

        switch (type) {
          case 'SESSION_CLEARED':
            console.log('Session cleared in another tab, syncing...')
            if (this.onSessionClear) {
              this.onSessionClear()
            }
            break
          case 'SESSION_UPDATED':
            console.log('Session updated in another tab')
            // Supabase auth state change will handle this
            break
        }
      }
    }

    // Listen for tab close
    window.addEventListener('beforeunload', this.cleanup)
  }

  notifySessionCleared() {
    if (this.channel) {
      this.channel.postMessage({
        type: 'SESSION_CLEARED',
        timestamp: Date.now(),
        tabId: this.tabId
      })
    }
  }

  notifySessionUpdated() {
    if (this.channel) {
      this.channel.postMessage({
        type: 'SESSION_UPDATED',
        timestamp: Date.now(),
        tabId: this.tabId
      })
    }
  }

  cleanup = () => {
    if (this.channel) {
      this.channel.postMessage({
        type: 'TAB_CLOSED',
        timestamp: Date.now(),
        tabId: this.tabId
      })
      this.channel.close()
    }
    window.removeEventListener('beforeunload', this.cleanup)
  }
}

// Singleton instance
export const sessionSync = new SessionSync()
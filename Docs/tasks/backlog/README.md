# Backlog Tasks

This folder contains tasks that are deferred for later implementation. These tasks are important but not required for the initial MVP/core functionality.

## 🔄 Deferred Tasks

### Integration Tasks
- **[Task 008: Titan Integration](task-008-quota-import-edge-function.md)** 
  - Kafka CDC consumer for quota data
  - Real-time synchronization with Titan
  - **Deferred because**: Core backend/frontend should work independently first
  - **Priority**: Add after MVP is functional

### Future Enhancement Tasks
*Additional tasks will be added here as the project evolves*

## 📋 Moving Tasks from Backlog

When ready to work on a backlog task:

1. **Review and update** the task specification
2. **Check dependencies** - ensure prerequisites are met
3. **Move to active tasks** folder
4. **Update task numbering** to fit current sequence
5. **Update main TODO.md** to reflect new priority

## 🎯 Current Focus

**Active Development**: Core backend + frontend functionality
- Database schema and business logic
- CRUD operations for call-offs
- Basic React UI for call-off management
- Authentication and security
- End-to-end testing

**Later Integration**: External system connections
- Titan quota import (Kafka CDC)
- Transporeon transport booking
- 3PL WMS integrations
- EDI supplier connections

---

*This approach allows rapid development of core features without external integration blockers.*
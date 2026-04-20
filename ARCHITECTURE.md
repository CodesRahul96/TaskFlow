# taskflow | Architectural Manifest

This document details the technical infrastructure and design principles of the **taskflow** workspace. It serves as a blueprint for understanding the industrial-grade synchronization and security layers.

---

## 🏛️ 1. Core Paradigm: The "Shield-in-Depth" Architecture

taskflow is built on the principle of layered security, ensuring that no single point of failure can compromise the workspace node.

### A. Protective Middlewares
- **Rate Limiting**: Implementation of distinct tiers for authentication (`authLimiter`) and neural processing (`aiLimiter`). This prevents brute-force identity theft and AI resource exhaustion.
- **Sanitization Layer**: Automated cleansing of incoming request bodies using `mongoSanitize` and `hpp`. This neutralizes NoSQL injection and HTTP Parameter Pollution (HPP) in real-time.
- **Header Hardening**: `Helmet` is configured with a strict Content Security Policy (CSP), explicitly permitting `ws:`/`wss:` protocols to enable secure real-time sync while mitigating XSS risks.

### B. Identity Management
- **Magic Link Protocol**: Stateless, time-bounded security tokens are used for one-click authentication, reducing the surface area for password-based attacks.
- **JWT Orchestration**: Secure JSON Web Tokens manage persistent sessions, stored in secure HTTP-only cookies to prevent client-side script access.

---

## 🛰️ 2. Synchronization Physics: "Multi-Node Sync"

The workspace achieves <50ms latency for collaborative operations through an event-driven WebSocket architecture.

### A. Real-Time Broadcast Logic
1. **Event Initiation**: An operator modifies a task attribute (e.g., status change).
2. **REST Validation**: The change is validated and persisted via a RESTful PUT request.
3. **Optimized Broadcast**: The backend emits a `task-updated` signal to the relevant "Task Room."
4. **State Reconciliation**: Collaborator nodes receive the payload and perform an ID-based merge into their local `zustand` store, ensuring zero-duplicate rendering.

### B. Collaborative Collision Avoidance
taskflow implements a "Last-In-First-Sync" strategy. While WebSockets handle concurrency, the system utilizes Mongoose-based atomic updates to ensure that simultaneous edits to subtasks or comments do not result in data corruption.

---

## 🤖 3. Neural Integration: The Knowledge Matrix

The AI Companion operates via a dual-layered strategy to ensure high availability even in offline or gateway-limited environments.

- **Primary Layer (Gemini 1.5 Flash)**: Handles deep contextual reasoning, task prioritization, and natural language coaching.
- **Secondary Layer (Neural Matrix)**: A high-precision local Knowledge Base (KB) that intercepts system-specific queries (collaboration rules, security logic) to provide instant, zero-latency responses.

---

## 📂 4. Data Lifecycle & Portability

- **Local-to-Cloud Migration**: Guest Mode utilizing `localStorage` allows immediate productivity. We facilitate a "Neural Lift" where this data is automatically migrated to the MongoDB cloud vault upon user registration.
- **Permanent Audit Ledger**: Every footprint in the system is recorded in the `AuditLog` collection, ensuring accountability for collaborative project nodes.

---

*This architecture represents a commitment to secure, human-engineered software design.* 🚀

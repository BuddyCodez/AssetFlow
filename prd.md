# AssetFlow — Product Requirements Document
**Enterprise Asset & Resource Management ERP**
Stack: TanStack Start · Elysia · Better Auth · Prisma (PostgreSQL)

---

## 1. Vision

AssetFlow replaces spreadsheet/paper-based asset tracking with a single ERP module covering the
full asset lifecycle, shared-resource booking, maintenance approval, and audit cycles — scoped per
organization (multi-tenant via Better Auth's `Organization`/`Member`), with role-driven access via
the existing `Employee.role` (`ADMIN`, `EMPLOYEE`, `DEPARTMENT_HEAD`, `ASSET_MANAGER`).

No self-elevation: signup only ever creates an `EMPLOYEE`. Roles are promoted by `ADMIN` from the
Employee Directory. This document is organized **by role first, feature second**, then maps each
feature to the Prisma models and Elysia/oRPC routers it needs.

---

## 2. Role Model (recap + guard pattern)

| Role | Scope |
|---|---|
| **ADMIN** | Org-wide. Departments, categories, employee directory, role promotion, all analytics, audit cycle creation/closing. |
| **ASSET_MANAGER** | Org-wide on assets. Registers/allocates assets, approves transfers & maintenance, approves returns. |
| **DEPARTMENT_HEAD** | Scoped to own department. Views/approves allocations & transfers within department, books resources on department's behalf. |
| **EMPLOYEE** | Scoped to self. Views own assets, books resources, raises maintenance, initiates return/transfer requests. |

All procedures run through a `requireRole(...)` guard reading `Employee.role` (not `Member.role`,
which stays Better Auth's own `owner`/`member`). Every query is additionally scoped by
`organizationId` (via `session.activeOrganizationId`) and, for `DEPARTMENT_HEAD`, by
`Employee.department`.

```ts
// server/middleware/rbac.ts
export const requireRole = (...roles: EmployeeRole[]) =>
  middleware(async ({ context, next }) => {
    const employee = await getEmployeeForSession(context.session);
    if (!employee || !roles.includes(employee.role) || !employee.isActive) {
      throw new ORPCError("FORBIDDEN");
    }
    return next({ context: { ...context, employee } });
  });
```

---

## 3. Schema Additions (on top of the existing schema you shared)

```prisma
enum AssetStatus {
  AVAILABLE
  ALLOCATED
  RESERVED
  UNDER_MAINTENANCE
  LOST
  RETIRED
  DISPOSED
}

enum AllocationStatus {
  ACTIVE
  RETURNED
  OVERDUE
}

enum TransferStatus {
  REQUESTED
  APPROVED
  REJECTED
  COMPLETED
}

enum BookingStatus {
  UPCOMING
  ONGOING
  COMPLETED
  CANCELLED
}

enum MaintenanceStatus {
  PENDING
  APPROVED
  REJECTED
  TECHNICIAN_ASSIGNED
  IN_PROGRESS
  RESOLVED
}

enum MaintenancePriority {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

enum AuditCycleStatus {
  OPEN
  CLOSED
}

enum AuditItemResult {
  PENDING
  VERIFIED
  MISSING
  DAMAGED
}

model Department {
  id                 String       @id @default(cuid())
  organizationId     String
  name               String
  parentDepartmentId String?
  parentDepartment   Department?  @relation("DeptHierarchy", fields: [parentDepartmentId], references: [id])
  children           Department[] @relation("DeptHierarchy")
  headEmployeeId     String?
  isActive           Boolean      @default(true)
  createdAt          DateTime     @default(now())
  updatedAt          DateTime     @updatedAt
  employees          Employee[]
  assets             Asset[]
  @@index([organizationId])
  @@map("department")
}

model AssetCategory {
  id             String   @id @default(cuid())
  organizationId String
  name           String
  customFields   Json?    // e.g. { "warrantyMonths": 24 }
  createdAt      DateTime @default(now())
  assets         Asset[]
  @@index([organizationId])
  @@map("asset_category")
}

model Asset {
  id                String       @id @default(cuid())
  organizationId    String
  assetTag          String       // auto-generated AF-0001
  name              String
  categoryId        String
  category          AssetCategory @relation(fields: [categoryId], references: [id])
  serialNumber      String?
  acquisitionDate   DateTime?
  acquisitionCost   Decimal?     // reporting only, no accounting linkage
  condition         String?
  location          String?
  photoUrl          String?
  isBookable        Boolean      @default(false)
  status            AssetStatus  @default(AVAILABLE)
  departmentId      String?
  department        Department?  @relation(fields: [departmentId], references: [id])
  currentHolderId   String?      // Employee.id, null if unallocated/bookable pool
  createdAt         DateTime     @default(now())
  updatedAt         DateTime     @updatedAt
  allocations       Allocation[]
  bookings          Booking[]
  maintenanceReqs   MaintenanceRequest[]
  auditItems        AuditItem[]
  @@unique([organizationId, assetTag])
  @@index([organizationId, status])
  @@map("asset")
}

model Allocation {
  id                 String            @id @default(cuid())
  assetId            String
  asset              Asset             @relation(fields: [assetId], references: [id])
  employeeId         String?
  departmentId       String?
  allocatedAt        DateTime          @default(now())
  expectedReturnDate DateTime?
  returnedAt         DateTime?
  checkinNotes       String?
  status             AllocationStatus  @default(ACTIVE)
  allocatedBy        String            // Employee.id
  @@index([assetId, status])
  @@index([employeeId])
  @@map("allocation")
}

model TransferRequest {
  id             String         @id @default(cuid())
  assetId        String
  fromEmployeeId String?
  toEmployeeId   String
  requestedBy    String
  status         TransferStatus @default(REQUESTED)
  approvedBy     String?
  createdAt      DateTime       @default(now())
  resolvedAt     DateTime?
  @@index([assetId, status])
  @@map("transfer_request")
}

model Booking {
  id           String        @id @default(cuid())
  assetId      String
  asset        Asset         @relation(fields: [assetId], references: [id])
  bookedById   String        // Employee.id
  departmentId String?
  startTime    DateTime
  endTime      DateTime
  status       BookingStatus @default(UPCOMING)
  createdAt    DateTime      @default(now())
  @@index([assetId, startTime, endTime])
  @@map("booking")
}

model MaintenanceRequest {
  id              String              @id @default(cuid())
  assetId         String
  asset           Asset               @relation(fields: [assetId], references: [id])
  raisedById      String
  issueDescription String
  priority        MaintenancePriority @default(MEDIUM)
  photoUrl        String?
  status          MaintenanceStatus   @default(PENDING)
  approvedBy      String?
  technicianName  String?
  createdAt       DateTime            @default(now())
  resolvedAt      DateTime?
  @@index([assetId, status])
  @@map("maintenance_request")
}

model AuditCycle {
  id                 String            @id @default(cuid())
  organizationId     String
  scopeDepartmentId  String?
  scopeLocation      String?
  startDate          DateTime
  endDate            DateTime
  status             AuditCycleStatus  @default(OPEN)
  createdBy          String
  auditors           AuditCycleAuditor[]
  items              AuditItem[]
  @@index([organizationId, status])
  @@map("audit_cycle")
}

model AuditCycleAuditor {
  auditCycleId String
  auditCycle   AuditCycle @relation(fields: [auditCycleId], references: [id])
  employeeId   String
  @@id([auditCycleId, employeeId])
  @@map("audit_cycle_auditor")
}

model AuditItem {
  id           String          @id @default(cuid())
  auditCycleId String
  auditCycle   AuditCycle      @relation(fields: [auditCycleId], references: [id])
  assetId      String
  asset        Asset           @relation(fields: [assetId], references: [id])
  result       AuditItemResult @default(PENDING)
  notes        String?
  checkedBy    String?
  checkedAt    DateTime?
  @@unique([auditCycleId, assetId])
  @@map("audit_item")
}

model Notification {
  id         String   @id @default(cuid())
  employeeId String
  type       String   // e.g. "ASSET_ASSIGNED", "MAINTENANCE_APPROVED", "BOOKING_REMINDER"
  message    String
  entityType String?
  entityId   String?
  isRead     Boolean  @default(false)
  createdAt  DateTime @default(now())
  @@index([employeeId, isRead])
  @@map("notification")
}

model ActivityLog {
  id             String   @id @default(cuid())
  organizationId String
  employeeId     String
  action         String   // e.g. "ASSET_REGISTERED", "TRANSFER_APPROVED"
  entityType     String
  entityId       String
  metadata       Json?
  createdAt      DateTime @default(now())
  @@index([organizationId, createdAt])
  @@map("activity_log")
}
```

Add relations back on `Employee` (`department Department? @relation(fields: [departmentId], references: [id])`,
plus a `departmentId` FK replacing the current free-text `department String?`) and on `Department`
(`headEmployeeId` → resolved via a lookup, not a hard FK, to avoid a circular required relation).

---

## 4. Feature Breakdown by Role

### 4.1 ADMIN

Everything Admin owns lives under Organization Setup (Screen 3) plus org-wide reporting.

| Feature | What Admin does | Router / procedures |
|---|---|---|
| Department management | Create/edit/deactivate departments, assign head, set parent (hierarchy) | `department.router.ts`: `create`, `update`, `deactivate`, `list`, `getTree` |
| Category management | Create/edit categories, define custom fields (e.g. warranty) | `category.router.ts`: `create`, `update`, `list`, `delete` |
| Employee directory | View all employees, edit status, **promote to DEPARTMENT_HEAD / ASSET_MANAGER** (only place roles change) | `employee.router.ts`: `list`, `updateStatus`, `promote` (guarded `requireRole(ADMIN)`, writes `Employee.role`) |
| Audit cycle admin | Create audit cycle (scope + date range), assign auditors, close cycle | `audit.router.ts`: `createCycle`, `assignAuditors`, `closeCycle` |
| Org-wide analytics | All Reports & Analytics widgets, unscoped | `report.router.ts`: `utilizationTrends`, `maintenanceFrequency`, `departmentAllocationSummary`, `bookingHeatmap` (no department filter applied) |
| Activity log | Full log across the org | `activityLog.router.ts`: `list` (org-wide) |

Guard: every mutating procedure above is `requireRole(ADMIN)`. `promote` additionally validates the
target employee belongs to the same `organizationId` and is currently `EMPLOYEE`/active before
allowing a role change — it never lets a user set their own role.

### 4.2 ASSET_MANAGER

Owns the asset lifecycle end-to-end and approvals that affect asset state.

| Feature | What Asset Manager does | Router / procedures |
|---|---|---|
| Asset registration | Register asset (auto Asset Tag `AF-000N`), edit, mark bookable, upload photo | `asset.router.ts`: `register`, `update`, `search`, `getById`, `getHistory` |
| Allocation | Allocate to employee/department; blocked with "currently held by X" + transfer button if already allocated | `allocation.router.ts`: `allocate` (throws `CONFLICT` w/ current holder if `Asset.status === ALLOCATED`), `markReturned` |
| Transfer approval | Approve/reject transfer requests, re-allocation updates history automatically | `transfer.router.ts`: `approve`, `reject` (on approve: closes old `Allocation`, opens new one, updates `Asset.currentHolderId`) |
| Maintenance approval | Approve/reject requests, assign technician, mark resolved | `maintenance.router.ts`: `approve`, `reject`, `assignTechnician`, `resolve` (approve flips `Asset.status → UNDER_MAINTENANCE`; resolve flips back to `AVAILABLE`) |
| Return check-in | Approve returns, capture condition notes | `allocation.router.ts`: `approveReturn` |
| Audit participation | Act as auditor if assigned | `audit.router.ts`: `markAssetResult` |

Guard: `requireRole(ASSET_MANAGER, ADMIN)` on all of the above (Admin can act as a superset, but
UI only surfaces these under the Asset Manager's own allocated queue plus org-wide view).

### 4.3 DEPARTMENT_HEAD

Scoped strictly to `Employee.departmentId === self.departmentId`.

| Feature | What Department Head does | Router / procedures |
|---|---|---|
| Department asset view | View all assets currently allocated to their department | `asset.router.ts`: `listByDepartment` (guard checks `input.departmentId === context.employee.departmentId`) |
| Allocation/transfer approval (dept-scoped) | Approve allocation/transfer requests *within* their department | `transfer.router.ts`: `approve` (extra check: both `fromEmployee`/`toEmployee` are in own department) |
| Resource booking on behalf of dept | Book shared resources for the department | `booking.router.ts`: `create` (with `departmentId` set) |
| Department reports | Allocation summary, maintenance frequency — filtered to own department | `report.router.ts`: same procedures as Admin's, but middleware injects `departmentId` filter automatically for this role |

Guard: `requireRole(DEPARTMENT_HEAD)` + a `scopeToOwnDepartment` middleware that rewrites/validates
every `departmentId` argument against `context.employee.departmentId`.

### 4.4 EMPLOYEE

Self-scoped only.

| Feature | What Employee does | Router / procedures |
|---|---|---|
| My assets | View assets currently allocated to them, per-asset history | `asset.router.ts`: `listMine`, `getHistory` |
| Resource booking | Browse a resource's calendar, book a time slot, cancel/reschedule | `booking.router.ts`: `checkAvailability`, `create` (overlap check server-side), `cancel`, `reschedule` |
| Maintenance requests | Raise a request against an asset they hold, attach photo, track status | `maintenance.router.ts`: `create`, `listMine` |
| Return / transfer initiation | Request to return an asset, or request transfer to a colleague | `allocation.router.ts`: `requestReturn`; `transfer.router.ts`: `create` (status `REQUESTED`, routed to Asset Manager/Dept Head) |
| Notifications | Read/mark-read own notifications | `notification.router.ts`: `listMine`, `markRead` |

Guard: `requireRole(EMPLOYEE, DEPARTMENT_HEAD, ASSET_MANAGER, ADMIN)` — i.e. every role can do the
baseline Employee actions on their own records; queries always filter `employeeId = context.employee.id`
unless the caller's role permits a broader scope (checked per-procedure, not assumed from role name).

---

## 5. Cross-Cutting Workflows (state machines)

**Asset lifecycle**
`AVAILABLE ⇄ ALLOCATED` (via allocate / return) · `AVAILABLE ⇄ UNDER_MAINTENANCE` (via maintenance
approve / resolve) · `AVAILABLE → RESERVED` (booking of a bookable, non-allocated asset) ·
`ALLOCATED/AVAILABLE → LOST` (audit cycle close, confirmed-missing) · `→ RETIRED → DISPOSED` (manual,
Asset Manager/Admin only, terminal states).

**Allocation conflict rule**
`allocation.allocate` first checks for an existing `Allocation` with `status = ACTIVE` on the asset;
if found, returns a `CONFLICT` error payload `{ currentHolder }` so the UI can render "currently held
by Priya" and surface the Transfer Request CTA instead of a raw error.

**Transfer workflow**
`REQUESTED` (Employee/Asset Manager creates) → `APPROVED` (Asset Manager or scoped Department Head)
→ on approve, server closes the old `Allocation` (`RETURNED`), opens a new one, updates
`Asset.currentHolderId`, and writes both an `ActivityLog` row and a `Notification` to both parties →
`COMPLETED`. Rejection just flips status, no asset mutation.

**Booking overlap validation**
`booking.create` runs `WHERE assetId = ? AND status IN (UPCOMING, ONGOING) AND startTime < :end AND endTime > :start` —
any row returned rejects the request with the conflicting slot.

**Maintenance workflow**
`PENDING → APPROVED/REJECTED → TECHNICIAN_ASSIGNED → IN_PROGRESS → RESOLVED`. `APPROVED` sets
`Asset.status = UNDER_MAINTENANCE`; `RESOLVED` sets it back to `AVAILABLE` (or `ALLOCATED` if it had
an active allocation before maintenance — track via a `preMaintenanceStatus` snapshot on the request).

**Audit cycle**
Admin creates cycle + assigns auditors → auditors call `markAssetResult` per asset (`VERIFIED` /
`MISSING` / `DAMAGED`) → Admin `closeCycle`: locks further edits, and for every `MISSING` item sets
`Asset.status = LOST`; discrepancy report is just the filtered `AuditItem` list where result ≠ `VERIFIED`.

**Overdue detection**
A scheduled job (cron via Bun or a queue tick) flags `Allocation.status = ACTIVE AND expectedReturnDate < now()`
as `OVERDUE`, and `Booking`/`MaintenanceRequest` similarly feed the dashboard's overdue counters — this
is a background job, not a role-gated procedure, but it writes `Notification` rows to the relevant employee.

---

## 6. Router Map (Elysia + oRPC, grouped by module)

```
/api
  /auth/*                → Better Auth handler (unchanged)
  /organization/*         → Better Auth org plugin (unchanged)
  /employee
    .list                 ADMIN
    .promote              ADMIN
    .updateStatus         ADMIN
    .listMine             * (self)
  /department
    .create / .update     ADMIN
    .deactivate           ADMIN
    .list / .getTree       *
  /category
    .create / .update / .delete   ADMIN
    .list                  *
  /asset
    .register / .update    ASSET_MANAGER, ADMIN
    .search / .getById      *
    .listByDepartment      DEPARTMENT_HEAD (scoped), ADMIN, ASSET_MANAGER
    .listMine               EMPLOYEE (self as holder)
    .getHistory              *
  /allocation
    .allocate               ASSET_MANAGER, ADMIN
    .requestReturn           EMPLOYEE
    .approveReturn           ASSET_MANAGER, ADMIN
  /transfer
    .create                  EMPLOYEE, ASSET_MANAGER
    .approve / .reject       ASSET_MANAGER, DEPARTMENT_HEAD (dept-scoped), ADMIN
  /booking
    .checkAvailability       *
    .create                   *
    .cancel / .reschedule     owner or DEPARTMENT_HEAD/ASSET_MANAGER/ADMIN
  /maintenance
    .create                   EMPLOYEE (asset holder)
    .approve / .reject        ASSET_MANAGER, ADMIN
    .assignTechnician         ASSET_MANAGER, ADMIN
    .resolve                  ASSET_MANAGER, ADMIN
    .listMine                 *
  /audit
    .createCycle              ADMIN
    .assignAuditors           ADMIN
    .markAssetResult          assigned auditor
    .closeCycle               ADMIN
  /report
    .utilizationTrends
    .maintenanceFrequency
    .departmentAllocationSummary
    .bookingHeatmap            ADMIN (unscoped), DEPARTMENT_HEAD (auto dept-scoped)
  /notification
    .listMine / .markRead      *
  /activityLog
    .list                      ADMIN (org-wide)
```

`*` = any authenticated Employee of the organization; scoping is enforced inside the procedure, not
by hiding the route.

---

## 7. Notes for Implementation Order

1. Auth/org/employee-role plumbing first (signup → Employee-only, Admin promote flow) since every
   other guard depends on `Employee.role` + `departmentId` resolving correctly.
2. Department + Category (master data) before Asset, since `Asset.categoryId`/`departmentId` are FKs.
3. Asset registration + allocation before Booking/Maintenance, since those reference `Asset.status`.
4. Transfer + Maintenance workflows (state machines) before Audit, since Audit's `closeCycle` mutates
   `Asset.status` and should be tested against an asset base that already has realistic states.
5. Notifications + ActivityLog can be wired incrementally — attach a write to each mutating procedure
   above rather than building it as a separate pass.
6. Reports/dashboard last, since every KPI is a read aggregation over the above tables.
# RentalAi Backend API Endpoints Documentation

## Overview
This document lists all 49 API endpoints built for the RentalAi property management system, organized by category. The API provides comprehensive functionality for accounting operations and HUD compliance management.

## Base URL
```
/api/v1
```

## Authentication
All endpoints require authentication via JWT tokens. Include the token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

---

## 📊 ACCOUNTING ENDPOINTS (25 endpoints)

### Accounts Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/accounting/accounts` | List all accounts with optional filters |
| `POST` | `/accounting/accounts` | Create new account |
| `GET` | `/accounting/transactions` | List transactions with filters |

### Budget Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/accounting/budgets` | List budgets with filters (property_id, year, month) |
| `POST` | `/accounting/budgets` | Create new budget |
| `PUT` | `/accounting/budgets/{budget_id}` | Update existing budget |
| `GET` | `/accounting/budgets/vs-actual` | Get budget vs actual comparison report |

### Vendor Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/accounting/vendors` | List vendors with optional active filter |
| `GET` | `/accounting/vendors/{vendor_id}` | Get single vendor by ID |
| `POST` | `/accounting/vendors` | Create new vendor |
| `PUT` | `/accounting/vendors/{vendor_id}` | Update existing vendor |
| `GET` | `/accounting/vendors/{vendor_id}/1099` | Get vendor 1099 data for specific year |

### Invoice Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/accounting/invoices` | List invoices with filters (vendor_id, property_id, status) |
| `GET` | `/accounting/invoices/{invoice_id}` | Get invoice with line items |
| `POST` | `/accounting/invoices` | Create invoice with line_items array |
| `PUT` | `/accounting/invoices/{invoice_id}` | Update existing invoice |
| `POST` | `/accounting/invoices/{invoice_id}/pay` | Mark invoice as paid with payment data |

### Bank Account Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/accounting/bank-accounts` | List bank accounts with optional active filter |
| `POST` | `/accounting/bank-accounts` | Create new bank account |
| `PUT` | `/accounting/bank-accounts/{bank_account_id}/balance` | Update bank account balance |

### Financial Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/accounting/reports/profit-loss` | Generate profit and loss statement |
| `GET` | `/accounting/reports/balance-sheet` | Generate balance sheet |
| `GET` | `/accounting/reports/cash-flow` | Generate cash flow statement |

### Report Exports
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/accounting/reports/profit-loss/pdf` | Export P&L statement as PDF |
| `GET` | `/accounting/reports/profit-loss/excel` | Export P&L statement as Excel |
| `GET` | `/accounting/reports/balance-sheet/pdf` | Export balance sheet as PDF |
| `GET` | `/accounting/reports/balance-sheet/excel` | Export balance sheet as Excel |
| `GET` | `/accounting/reports/cash-flow/pdf` | Export cash flow statement as PDF |
| `GET` | `/accounting/reports/cash-flow/excel` | Export cash flow statement as Excel |

---

## 🏢 HUD COMPLIANCE ENDPOINTS (24 endpoints)

### Tenant Income Certifications
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/hud/certifications` | List certifications with filters (property_id, tenant_id, status, cert_type) |
| `POST` | `/hud/certifications` | Create new income certification |
| `GET` | `/hud/certifications/{cert_id}` | Get single certification with household members |
| `PUT` | `/hud/certifications/{cert_id}` | Update certification details |
| `POST` | `/hud/certifications/{cert_id}/submit` | Submit HUD 50059 form |
| `GET` | `/hud/certifications/expiring` | Get certifications expiring within specified days |

### Household Members
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/hud/certifications/{cert_id}/members` | Add household member to certification |
| `PUT` | `/hud/members/{member_id}` | Update household member information |
| `DELETE` | `/hud/members/{member_id}` | Remove household member |

### Income Sources
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/hud/members/{member_id}/income` | Add income source to household member |
| `PUT` | `/hud/income/{source_id}` | Update income source details |
| `DELETE` | `/hud/income/{source_id}` | Remove income source |

### Utility Allowances
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/hud/utility-allowances` | List allowances with optional property filter |
| `POST` | `/hud/utility-allowances` | Create utility allowance schedule |
| `GET` | `/hud/utility-allowances/current` | Get current allowance for bedroom count |

### REAC Inspections
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/hud/inspections` | List inspection history with optional property filter |
| `POST` | `/hud/inspections` | Create new inspection record |
| `PUT` | `/hud/inspections/{inspection_id}` | Update inspection details |
| `GET` | `/hud/inspections/upcoming` | Get upcoming inspections within specified days |

### Rent Calculations
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/hud/calculate-rent` | Calculate tenant rent using HUD guidelines |

---

## 🔧 SYSTEM ENDPOINTS (1 endpoint)

### Health Check
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | API health check endpoint |

---

## 📋 Query Parameters Reference

### Common Filters
- `property_id` (UUID) - Filter by specific property
- `org_id` (UUID) - Organization ID (auto-injected from JWT)
- `is_active` (Boolean) - Filter by active status
- `status` (String) - Filter by status field

### Date Filters
- `start_date` (Date) - Start date for date ranges
- `end_date` (Date) - End date for date ranges
- `as_of_date` (Date) - Specific date for reports

### Pagination
- `limit` (Integer) - Number of records to return
- `offset` (Integer) - Number of records to skip

### HUD-Specific Parameters
- `bedroom_count` (Integer) - Number of bedrooms for utility allowances
- `days` (Integer) - Number of days for expiring/upcoming queries
- `cert_type` (String) - Type of certification (initial, annual, interim, other)
- `inspection_type` (String) - Type of inspection (initial, annual, complaint, follow_up)

---

## 📄 Response Format

All endpoints return data in the following format:

### Success Response
```json
{
  "data": {
    // Response data here
  }
}
```

### List Response
```json
{
  "data": [
    {
      // Array of items
    }
  ]
}
```

### Error Response
```json
{
  "detail": "Error message"
}
```

---

## 🔐 Authentication & Authorization

### Required Headers
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### Multi-Tenant Security
- All endpoints automatically filter by `org_id` from JWT token
- Data isolation between organizations
- User permissions validated on each request

---

## 📊 Status Codes

| Code | Description |
|------|-------------|
| `200` | Success |
| `201` | Created |
| `204` | No Content (for DELETE operations) |
| `400` | Bad Request |
| `401` | Unauthorized |
| `404` | Not Found |
| `500` | Internal Server Error |

---

## 🚀 Usage Examples

### Create Income Certification
```bash
POST /api/v1/hud/certifications
{
  "tenant_id": "123e4567-e89b-12d3-a456-426614174000",
  "property_id": "987fcdeb-51a2-43d1-b456-426614174000",
  "certification_date": "2025-01-15",
  "effective_date": "2025-01-15",
  "cert_type": "initial",
  "household_size": 3,
  "annual_income": "45000.00",
  "adjusted_income": "42000.00",
  "tenant_rent_portion": "1050.00",
  "utility_allowance": "150.00",
  "subsidy_amount": "800.00"
}
```

### Calculate Tenant Rent
```bash
POST /api/v1/hud/calculate-rent
{
  "household_income": "45000.00",
  "household_size": 3,
  "utility_allowance": "150.00",
  "contract_rent": "2000.00"
}
```

### Export Financial Report
```bash
GET /api/v1/accounting/reports/profit-loss/pdf?start_date=2025-01-01&end_date=2025-12-31
```

---

## 📈 Total Endpoint Count: 49

- **Accounting**: 25 endpoints
- **HUD Compliance**: 24 endpoints
- **System**: 1 endpoint

This comprehensive API provides complete functionality for property management accounting operations and HUD PRAC compliance management for subsidized housing units.

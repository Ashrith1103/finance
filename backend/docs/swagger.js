const swaggerUi = require("swagger-ui-express");
const serverUrl = process.env.APP_URL || `http://localhost:${process.env.PORT || 5000}`;

const doc = {
  openapi: "3.0.0",
  info: {
    title: "Finance Dashboard Backend API",
    version: "1.0.0",
    description:
      "Backend for finance records, role-based access control, user management, and dashboard analytics."
  },
  servers: [
    {
      url: serverUrl
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT"
      }
    },
    schemas: {
      LoginRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", example: "admin@example.com" },
          password: { type: "string", example: "Pass1234" }
        }
      },
      RegisterRequest: {
        type: "object",
        required: ["name", "email", "password"],
        properties: {
          name: { type: "string", example: "Admin User" },
          email: { type: "string", example: "admin@example.com" },
          password: { type: "string", example: "Pass1234" }
        }
      },
      User: {
        type: "object",
        properties: {
          id: { type: "integer" },
          name: { type: "string" },
          email: { type: "string" },
          role: { type: "string", enum: ["VIEWER", "ANALYST", "ADMIN"] },
          status: { type: "string", enum: ["ACTIVE", "INACTIVE"] }
        }
      },
      Record: {
        type: "object",
        properties: {
          id: { type: "integer" },
          amount: { type: "number", example: 1500.5 },
          type: { type: "string", enum: ["INCOME", "EXPENSE"] },
          category: { type: "string", example: "Salary" },
          date: { type: "string", example: "2026-04-01" },
          notes: { type: "string", example: "Monthly salary" }
        }
      }
    }
  },
  paths: {
    "/health": {
      get: {
        summary: "Health check",
        responses: {
          200: {
            description: "Server is healthy"
          }
        }
      }
    },
    "/auth/register": {
      post: {
        summary: "Register a user",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/RegisterRequest"
              }
            }
          }
        },
        responses: {
          201: { description: "User created" }
        }
      }
    },
    "/auth/login": {
      post: {
        summary: "Login and get a token",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/LoginRequest"
              }
            }
          }
        },
        responses: {
          200: { description: "Login successful" }
        }
      }
    },
    "/users": {
      get: {
        summary: "List users",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Users returned" }
        }
      },
      post: {
        summary: "Create a user",
        security: [{ bearerAuth: [] }],
        responses: {
          201: { description: "User created" }
        }
      }
    },
    "/users/me": {
      get: {
        summary: "Get current user",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Current user returned" }
        }
      }
    },
    "/records": {
      get: {
        summary: "List financial records with filters",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Records returned" }
        }
      },
      post: {
        summary: "Create a financial record",
        security: [{ bearerAuth: [] }],
        responses: {
          201: { description: "Record created" }
        }
      }
    },
    "/records/{id}": {
      get: {
        summary: "Get one record",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "id",
            required: true,
            schema: { type: "integer" }
          }
        ],
        responses: {
          200: { description: "Record returned" }
        }
      },
      put: {
        summary: "Update a record",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "id",
            required: true,
            schema: { type: "integer" }
          }
        ],
        responses: {
          200: { description: "Record updated" }
        }
      },
      delete: {
        summary: "Soft delete a record",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "id",
            required: true,
            schema: { type: "integer" }
          }
        ],
        responses: {
          200: { description: "Record deleted" }
        }
      }
    },
    "/dashboard/summary": {
      get: {
        summary: "Get dashboard analytics",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Dashboard data returned"
          }
        }
      }
    }
  }
};

module.exports = (app) => {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(doc));
};

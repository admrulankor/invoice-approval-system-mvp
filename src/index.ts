import { serve } from "bun";
import index from "./index.html";
import {
  initializeDatabase,
  createInvoice,
  getInvoiceById,
  getAllInvoices,
  updateInvoiceStatus,
  updateInvoiceData,
  getInvoicesByRole,
} from "@/server/database";
import { Invoice, InvoiceStatus, UserRole } from "@/types/invoice";
import { validateInvoice } from "@/utils/invoiceValidation";

// Initialize database on startup
initializeDatabase();

const server = serve({
  routes: {
    // Serve index.html for all unmatched routes.
    "/*": index,

    "/api/hello": {
      async GET(req) {
        return Response.json({
          message: "Hello, world!",
          method: "GET",
        });
      },
      async PUT(req) {
        return Response.json({
          message: "Hello, world!",
          method: "PUT",
        });
      },
    },

    "/api/hello/:name": async req => {
      const name = req.params.name;
      return Response.json({
        message: `Hello, ${name}!`,
      });
    },

    // Invoice API endpoints
    "/api/invoices": {
      async GET(req) {
        try {
          const invoices = getAllInvoices();
          return Response.json({ invoices });
        } catch (error) {
          return Response.json({ error: String(error) }, { status: 500 });
        }
      },

      async POST(req) {
        try {
          const body = await req.json();
          const validation = validateInvoice(body);

          if (!validation.valid) {
            return Response.json({ error: validation.errors }, { status: 400 });
          }

          const invoice = createInvoice({
            invoiceNumber: body.invoiceNumber,
            amount: body.amount,
            description: body.description,
            vendor: body.vendor,
            date: body.date,
            status: InvoiceStatus.DRAFT,
            maker: body.maker || "MAKER",
            currentRole: UserRole.CHECKER_1,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            history: [],
          });

          return Response.json({ invoice }, { status: 201 });
        } catch (error) {
          return Response.json({ error: String(error) }, { status: 500 });
        }
      },
    },

    "/api/invoices/:id": {
      async GET(req) {
        try {
          const id = req.params.id;
          const invoice = getInvoiceById(id);

          if (!invoice) {
            return Response.json({ error: "Invoice not found" }, { status: 404 });
          }

          return Response.json({ invoice });
        } catch (error) {
          return Response.json({ error: String(error) }, { status: 500 });
        }
      },

      async PUT(req) {
        try {
          const id = req.params.id;
          const body = await req.json();
          const validation = validateInvoice(body);

          if (!validation.valid) {
            return Response.json({ error: validation.errors }, { status: 400 });
          }

          const invoice = updateInvoiceData(id, {
            invoiceNumber: body.invoiceNumber,
            amount: body.amount,
            description: body.description,
            vendor: body.vendor,
            date: body.date,
          });

          if (!invoice) {
            return Response.json({ error: "Invoice not found" }, { status: 404 });
          }

          return Response.json({ invoice });
        } catch (error) {
          return Response.json({ error: String(error) }, { status: 500 });
        }
      },
    },

    "/api/invoices/:id/status": {
      async PUT(req) {
        try {
          const id = req.params.id;
          const body = await req.json();
          const { status, role, action, comment } = body;

          const invoice = updateInvoiceStatus(id, status, role, action, comment);

          if (!invoice) {
            return Response.json({ error: "Invoice not found" }, { status: 404 });
          }

          return Response.json({ invoice });
        } catch (error) {
          return Response.json({ error: String(error) }, { status: 500 });
        }
      },
    },

    "/api/invoices/role/:role": {
      async GET(req) {
        try {
          const role = req.params.role as UserRole;
          const invoices = getInvoicesByRole(role);
          return Response.json({ invoices });
        } catch (error) {
          return Response.json({ error: String(error) }, { status: 500 });
        }
      },
    },
  },

  development: process.env.NODE_ENV !== "production" && {
    // Enable browser hot reloading in development
    hmr: true,

    // Echo console logs from the browser to the server
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);

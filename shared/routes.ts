import { z } from 'zod';
import { 
  insertClientSchema, 
  insertLicenseSchema, 
  insertFornecedorSchema,
  insertProdutoSchema,
  insertClientDocumentSchema,
  clients, 
  licenses, 
  fornecedores,
  produtos,
  clientDocuments,
  type ClientResponse
} from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  // Clients
  clients: {
    list: {
      method: 'GET' as const,
      path: '/api/clients',
      responses: {
        200: z.array(z.custom<ClientResponse>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/clients/:id',
      responses: {
        200: z.custom<typeof clients.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/clients',
      input: insertClientSchema,
      responses: {
        201: z.custom<typeof clients.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/clients/:id',
      input: insertClientSchema.partial(),
      responses: {
        200: z.custom<typeof clients.$inferSelect>(),
        404: errorSchemas.notFound,
        400: errorSchemas.validation,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/clients/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  // Licenses
  licenses: {
    list: {
      method: 'GET' as const,
      path: '/api/licenses',
      input: z.object({
        clientId: z.string().optional(),
        status: z.string().optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof licenses.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/licenses/:id',
      responses: {
        200: z.custom<typeof licenses.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/licenses',
      input: insertLicenseSchema,
      responses: {
        201: z.custom<typeof licenses.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/licenses/:id',
      input: insertLicenseSchema.partial(),
      responses: {
        200: z.custom<typeof licenses.$inferSelect>(),
        404: errorSchemas.notFound,
        400: errorSchemas.validation,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/licenses/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  // Dashboard
  dashboard: {
    stats: {
      method: 'GET' as const,
      path: '/api/dashboard/stats',
      responses: {
        200: z.object({
          totalClients: z.number(),
          totalLicenses: z.number(),
          activeLicenses: z.number(),
          expiringLicenses: z.number(),
          perpetualLicenses: z.number(),
          totalCredentials: z.number(),
          activeCredentials: z.number(),
          inactiveCredentials: z.number(),
          recentAuditEvents: z.number(),
        }),
      },
    },
  },
  // Fornecedores
  fornecedores: {
    list: {
      method: 'GET' as const,
      path: '/api/fornecedores',
      responses: {
        200: z.array(z.custom<typeof fornecedores.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/fornecedores/:id',
      responses: {
        200: z.custom<typeof fornecedores.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/fornecedores',
      input: insertFornecedorSchema,
      responses: {
        201: z.custom<typeof fornecedores.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/fornecedores/:id',
      input: insertFornecedorSchema.partial(),
      responses: {
        200: z.custom<typeof fornecedores.$inferSelect>(),
        404: errorSchemas.notFound,
        400: errorSchemas.validation,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/fornecedores/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  // Produtos
  produtos: {
    list: {
      method: 'GET' as const,
      path: '/api/produtos',
      responses: {
        200: z.array(z.custom<typeof produtos.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/produtos/:id',
      responses: {
        200: z.custom<typeof produtos.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/produtos',
      input: insertProdutoSchema,
      responses: {
        201: z.custom<typeof produtos.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/produtos/:id',
      input: insertProdutoSchema.partial(),
      responses: {
        200: z.custom<typeof produtos.$inferSelect>(),
        404: errorSchemas.notFound,
        400: errorSchemas.validation,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/produtos/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  // Client Documents
  clientDocuments: {
    list: {
      method: 'GET' as const,
      path: '/api/clients/:clientId/documents',
      responses: {
        200: z.array(z.custom<typeof clientDocuments.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/clients/:clientId/documents',
      input: insertClientDocumentSchema,
      responses: {
        201: z.custom<typeof clientDocuments.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/clients/:clientId/documents/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
};

export type CreateClientRequest = z.infer<typeof insertClientSchema>;
export type UpdateClientRequest = Partial<CreateClientRequest>;

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

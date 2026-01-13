import { z } from 'zod';
import { insertClientSchema, insertLicenseSchema, insertHardwareSchema, clients, licenses, hardware } from './schema';

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
        200: z.array(z.custom<typeof clients.$inferSelect>()),
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
  // Hardware
  hardware: {
    list: {
      method: 'GET' as const,
      path: '/api/hardware',
      input: z.object({
        clientId: z.string().optional(),
        status: z.string().optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof hardware.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/hardware/:id',
      responses: {
        200: z.custom<typeof hardware.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/hardware',
      input: insertHardwareSchema,
      responses: {
        201: z.custom<typeof hardware.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/hardware/:id',
      input: insertHardwareSchema.partial(),
      responses: {
        200: z.custom<typeof hardware.$inferSelect>(),
        404: errorSchemas.notFound,
        400: errorSchemas.validation,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/hardware/:id',
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
          totalHardware: z.number(),
          hardwareValue: z.number(),
        }),
      },
    },
  },
};

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

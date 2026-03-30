import swaggerJsdoc from "swagger-jsdoc";
import { APP_CONFIG } from "./constants";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Smart Health Global API",
      version: "1.0.0",
      description: "REST API for Smart Health Global System",
    },
    servers: [
      {
        url: `http://localhost:${APP_CONFIG.PORT}${APP_CONFIG.API_PREFIX}`,
        description: "Development server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ["./src/routes/*.ts", "./src/controllers/*.ts"],
};

export const swaggerSpec = swaggerJsdoc(options);

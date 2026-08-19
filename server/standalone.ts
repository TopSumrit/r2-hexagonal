import { app } from './app';

// Standalone server for development/testing
const server = app.listen(process.env.PORT ? Number(process.env.PORT) : 3000);

console.log(`🦊 Elysia API is running at http://localhost:${server?.server?.port}`);
console.log(`📚 OpenAPI documentation: http://localhost:${server?.server?.port}/api/openapi`);

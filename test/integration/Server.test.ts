import { App, AppRunner, joinFilePath } from '@solid/community-server';

/**
 * Integration tests for the Moderation Server
 * 
 * These tests start a real CSS instance with the moderation handler
 * and verify that it handles requests correctly.
 */
describe('Moderation Server Integration', (): void => {
  let app: App;
  const port = 3456;
  const baseUrl = `http://localhost:${port}`;

  beforeAll(async (): Promise<void> => {
    // Create an App using AppRunner
    app = await new AppRunner().create({
      // Use our test configuration that runs in memory
      config: joinFilePath(__dirname, '../config/moderation-memory.json'),
      loaderProperties: {
        // Tell Components.js where to start looking for component configurations.
        // This needs to point to the root directory of our project.
        mainModulePath: joinFilePath(__dirname, '../../'),
        // We don't want Components.js to create an error dump in case something goes wrong.
        dumpErrorState: false,
      },
      // Use CLI options to set the port and disable logging
      shorthand: {
        port,
        loggingLevel: 'off',
      },
      variableBindings: {},
    });

    // Start the server
    await app.start();
  });

  afterAll(async (): Promise<void> => {
    // Make sure to stop the server after all tests
    await app.stop();
  });

  describe('server startup', (): void => {
    it('responds to requests on the root path.', async (): Promise<void> => {
      const response = await fetch(baseUrl);
      expect(response.status).toBe(200);
    });

    it('returns proper content type for root.', async (): Promise<void> => {
      const response = await fetch(baseUrl);
      const contentType = response.headers.get('content-type');
      // CSS returns text/turtle for the root container by default
      expect(contentType).toContain('text/turtle');
    });
  });

  describe('text uploads', (): void => {
    it('accepts safe text content.', async (): Promise<void> => {
      // Without API credentials, moderation is skipped (fail-open)
      const response = await fetch(`${baseUrl}/test-file.txt`, {
        method: 'PUT',
        headers: { 'Content-Type': 'text/plain' },
        body: 'Hello, this is a safe test message.',
      });
      // Should succeed (201 Created or 205 Reset Content for updates)
      expect([201, 205]).toContain(response.status);
    });

    it('can read back uploaded text.', async (): Promise<void> => {
      // First upload
      await fetch(`${baseUrl}/read-test.txt`, {
        method: 'PUT',
        headers: { 'Content-Type': 'text/plain' },
        body: 'Content to read back',
      });

      // Then read
      const response = await fetch(`${baseUrl}/read-test.txt`);
      expect(response.status).toBe(200);
      const body = await response.text();
      expect(body).toBe('Content to read back');
    });
  });

  describe('resource operations', (): void => {
    it('supports DELETE operations.', async (): Promise<void> => {
      // Create a resource
      await fetch(`${baseUrl}/delete-me.txt`, {
        method: 'PUT',
        headers: { 'Content-Type': 'text/plain' },
        body: 'To be deleted',
      });

      // Delete it
      const deleteResponse = await fetch(`${baseUrl}/delete-me.txt`, {
        method: 'DELETE',
      });
      expect([200, 205]).toContain(deleteResponse.status);

      // Verify it's gone
      const getResponse = await fetch(`${baseUrl}/delete-me.txt`);
      expect(getResponse.status).toBe(404);
    });

    it('supports HEAD requests.', async (): Promise<void> => {
      // Create a resource
      await fetch(`${baseUrl}/head-test.txt`, {
        method: 'PUT',
        headers: { 'Content-Type': 'text/plain' },
        body: 'Head test content',
      });

      // HEAD request
      const response = await fetch(`${baseUrl}/head-test.txt`, {
        method: 'HEAD',
      });
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('text/plain');
    });
  });

  describe('content type handling', (): void => {
    it('handles JSON content.', async (): Promise<void> => {
      const response = await fetch(`${baseUrl}/test.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Hello world' }),
      });
      expect([201, 205]).toContain(response.status);
    });

    it('handles HTML content.', async (): Promise<void> => {
      const response = await fetch(`${baseUrl}/test.html`, {
        method: 'PUT',
        headers: { 'Content-Type': 'text/html' },
        body: '<html><body><p>Hello world</p></body></html>',
      });
      expect([201, 205]).toContain(response.status);
    });
  });
});

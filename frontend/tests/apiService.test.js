/**
 * @jest-environment node
 * Frontend API Service Tests
 * QA-007: Tests Frontend (Jest + React Testing Library)
 */

const { api } = require('../src/services/api');

// Mock fetch globally
beforeEach(() => {
  global.fetch = jest.fn();
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('API Service', () => {
  describe('GET requests', () => {
    it('should make GET request with correct URL', async () => {
      const mockResponse = { data: 'test' };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await api.get('/test');
      expect(global.fetch).toHaveBeenCalledWith('/api/v1/test', {
        method: 'GET',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      });
      expect(result.data).toEqual(mockResponse);
    });

    it('should include auth token when available', async () => {
      const mockResponse = { data: 'test' };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      // Set a mock token
      localStorage.setItem('token', 'test-token');

      await api.get('/test');
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/v1/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token',
          }),
        })
      );

      localStorage.removeItem('token');
    });

    it('should handle 401 errors by clearing token', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ detail: 'Unauthorized' }),
      });

      localStorage.setItem('token', 'test-token');

      await expect(api.get('/test')).rejects.toThrow('Unauthorized');
      expect(localStorage.getItem('token')).toBeNull();
    });
  });

  describe('POST requests', () => {
    it('should make POST request with body', async () => {
      const mockResponse = { data: 'created' };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const testData = { name: 'test' };
      const result = await api.post('/test', testData);
      expect(global.fetch).toHaveBeenCalledWith('/api/v1/test', {
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify(testData),
      });
      expect(result.data).toEqual(mockResponse);
    });
  });

  describe('PUT requests', () => {
    it('should make PUT request with body', async () => {
      const mockResponse = { data: 'updated' };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const testData = { name: 'updated' };
      const result = await api.put('/test/1', testData);
      expect(global.fetch).toHaveBeenCalledWith('/api/v1/test/1', {
        method: 'PUT',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify(testData),
      });
      expect(result.data).toEqual(mockResponse);
    });
  });

  describe('DELETE requests', () => {
    it('should make DELETE request', async () => {
      const mockResponse = { data: 'deleted' };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await api.delete('/test/1');
      expect(global.fetch).toHaveBeenCalledWith('/api/v1/test/1', {
        method: 'DELETE',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      });
      expect(result.data).toEqual(mockResponse);
    });
  });

  describe('Error handling', () => {
    it('should throw error on non-OK response', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ detail: 'Server error' }),
      });

      await expect(api.get('/test')).rejects.toThrow('Request failed with status 500');
    });

    it('should handle network errors', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(api.get('/test')).rejects.toThrow('Network error');
    });
  });
});

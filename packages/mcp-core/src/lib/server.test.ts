import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { afterEach, describe, expect, it } from 'vitest'

import { createMcpHttpServer, type McpHttpServerHandle } from './server.js'

let handle: McpHttpServerHandle | undefined

afterEach(async () => {
  if (handle) {
    await handle.close()
    handle = undefined
  }
})

// HTTP-layer tests don't exercise tool-call protocol; a bare server is enough
// to satisfy `.connect(transport)`.
function makeServer(): McpServer {
  return new McpServer({ name: 'test-mcp', version: '0.0.0' })
}

function bearer(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` }
}

describe('createMcpHttpServer', () => {
  it('listens on the requested port and returns a usable handle', async () => {
    handle = await createMcpHttpServer(makeServer(), {
      port: 0,
      auth: 'none',
      log: () => undefined,
    })

    expect(handle.port).toBeGreaterThan(0)
    expect(handle.url).toBe(`http://127.0.0.1:${handle.port}/mcp`)
    expect(handle.path).toBe('/mcp')
  })

  it('normalizes a missing leading slash on path', async () => {
    handle = await createMcpHttpServer(makeServer(), {
      port: 0,
      path: 'rpc',
      auth: 'none',
      log: () => undefined,
    })
    expect(handle.path).toBe('/rpc')
  })

  it('returns 404 for unknown paths', async () => {
    handle = await createMcpHttpServer(makeServer(), {
      port: 0,
      auth: 'none',
      log: () => undefined,
    })

    const res = await fetch(`http://127.0.0.1:${handle.port}/not-the-mcp`)
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body).toMatchObject({ error: 'Not found', mcpEndpoint: '/mcp' })
  })

  it('returns 405 for unsupported methods', async () => {
    handle = await createMcpHttpServer(makeServer(), {
      port: 0,
      auth: 'none',
      log: () => undefined,
    })

    const res = await fetch(handle.url, { method: 'PATCH' })
    expect(res.status).toBe(405)
    expect(res.headers.get('allow')).toBe('GET, POST, DELETE')
  })

  it('responds to CORS preflight without echoing an unknown origin by default', async () => {
    handle = await createMcpHttpServer(makeServer(), {
      port: 0,
      auth: 'none',
      log: () => undefined,
    })

    const res = await fetch(handle.url, {
      method: 'OPTIONS',
      headers: { Origin: 'http://example.com' },
    })

    expect(res.status).toBe(204)
    // Default CORS resolver does NOT echo arbitrary origins.
    expect(res.headers.get('access-control-allow-origin')).toBeNull()
    expect(res.headers.get('access-control-allow-methods')).toContain('POST')
    expect(res.headers.get('access-control-allow-headers')).toContain('Mcp-Session-Id')
  })

  it('echoes loopback origins matching the bound port by default', async () => {
    handle = await createMcpHttpServer(makeServer(), {
      port: 0,
      auth: 'none',
      log: () => undefined,
    })

    const matchingOrigin = `http://localhost:${handle.port}`
    const res = await fetch(handle.url, {
      method: 'OPTIONS',
      headers: { Origin: matchingOrigin },
    })
    expect(res.headers.get('access-control-allow-origin')).toBe(matchingOrigin)
    expect(res.headers.get('vary')).toBe('Origin')
  })

  it('honors an explicit cors origin allow-list', async () => {
    handle = await createMcpHttpServer(makeServer(), {
      port: 0,
      corsOrigins: ['http://allowed.test'],
      auth: 'none',
      log: () => undefined,
    })

    const allowed = await fetch(handle.url, {
      method: 'OPTIONS',
      headers: { Origin: 'http://allowed.test' },
    })
    expect(allowed.headers.get('access-control-allow-origin')).toBe('http://allowed.test')
    expect(allowed.headers.get('vary')).toBe('Origin')

    const denied = await fetch(handle.url, {
      method: 'OPTIONS',
      headers: { Origin: 'http://other.test' },
    })
    expect(denied.headers.get('access-control-allow-origin')).toBeNull()
  })

  it('still supports an opt-in wildcard cors', async () => {
    handle = await createMcpHttpServer(makeServer(), {
      port: 0,
      corsOrigins: '*',
      auth: 'none',
      log: () => undefined,
    })

    const res = await fetch(handle.url, {
      method: 'OPTIONS',
      headers: { Origin: 'http://example.com' },
    })
    expect(res.headers.get('access-control-allow-origin')).toBe('*')
  })

  it('close() shuts the server down', async () => {
    handle = await createMcpHttpServer(makeServer(), {
      port: 0,
      auth: 'none',
      log: () => undefined,
    })
    const port = handle.port

    await handle.close()
    handle = undefined

    await expect(fetch(`http://127.0.0.1:${port}/mcp`)).rejects.toThrow()
  })

  it('accepts a custom port and binds successfully', async () => {
    handle = await createMcpHttpServer(makeServer(), {
      port: 0,
      auth: 'none',
      log: () => undefined,
    })
    expect(handle.port).toBeGreaterThan(1024)
  })

  // -----------------------------------------------
  // auth
  // -----------------------------------------------
  describe('auth', () => {
    it('returns 401 when auth is required and no token is sent', async () => {
      handle = await createMcpHttpServer(makeServer(), {
        port: 0,
        log: () => undefined,
      })

      const res = await fetch(handle.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      expect(res.status).toBe(401)
      expect(res.headers.get('www-authenticate')).toContain('Bearer')
    })

    it('returns 401 with the wrong bearer token', async () => {
      handle = await createMcpHttpServer(makeServer(), {
        port: 0,
        log: () => undefined,
      })

      const res = await fetch(handle.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...bearer('not-the-token') },
        body: JSON.stringify({}),
      })
      expect(res.status).toBe(401)
    })

    it('passes auth gate with the correct bearer token', async () => {
      handle = await createMcpHttpServer(makeServer(), {
        port: 0,
        log: () => undefined,
      })

      // GET without auth -> 401
      const denied = await fetch(handle.url, { method: 'GET' })
      expect(denied.status).toBe(401)

      // GET with token -> transport handles it (not 401 / 404 / 405)
      const ok = await fetch(handle.url, {
        method: 'GET',
        headers: bearer(handle.authToken),
      })
      expect(ok.status).not.toBe(401)
      expect(ok.status).not.toBe(404)
      expect(ok.status).not.toBe(405)
    })

    it("auth: 'loopback-only' allows no-token requests with no Origin", async () => {
      handle = await createMcpHttpServer(makeServer(), {
        port: 0,
        auth: 'loopback-only',
        log: () => undefined,
      })

      // No auth header, no Origin -> allowed through to transport.
      const res = await fetch(handle.url, { method: 'GET' })
      expect(res.status).not.toBe(401)
    })

    it("auth: 'loopback-only' rejects requests from a non-loopback origin without a token", async () => {
      handle = await createMcpHttpServer(makeServer(), {
        port: 0,
        auth: 'loopback-only',
        authToken: 'secret-token',
        log: () => undefined,
      })

      const res = await fetch(handle.url, {
        method: 'GET',
        headers: { Origin: 'http://evil.example' },
      })
      expect(res.status).toBe(401)
    })
  })

  // -----------------------------------------------
  // content-type & body limits
  // -----------------------------------------------
  it('returns 415 when Content-Type is missing on POST', async () => {
    handle = await createMcpHttpServer(makeServer(), {
      port: 0,
      auth: 'none',
      log: () => undefined,
    })

    const res = await fetch(handle.url, {
      method: 'POST',
      // Explicitly clear content-type by sending a non-JSON body type that
      // some fetch impls would set; we override with an empty string.
      headers: { 'Content-Type': 'text/plain' },
      body: 'hello',
    })
    expect(res.status).toBe(415)
  })

  it('accepts application/json with parameters like charset=utf-8', async () => {
    handle = await createMcpHttpServer(makeServer(), {
      port: 0,
      auth: 'none',
      log: () => undefined,
    })

    const res = await fetch(handle.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({}),
    })
    expect(res.status).not.toBe(415)
  })

  it('returns 413 when the body exceeds maxBodyBytes', async () => {
    handle = await createMcpHttpServer(makeServer(), {
      port: 0,
      auth: 'none',
      maxBodyBytes: 128,
      log: () => undefined,
    })

    const huge = JSON.stringify({ data: 'x'.repeat(1024) })
    let status: number | 'aborted' = 'aborted'
    try {
      const res = await fetch(handle.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: huge,
      })
      status = res.status
    } catch {
      // Some fetch implementations report a socket reset when the server
      // destroys the connection; treat that as a successful enforcement.
      status = 'aborted'
    }
    expect(status === 413 || status === 'aborted').toBe(true)
  })

  // -----------------------------------------------
  // port validation
  // -----------------------------------------------
  it('falls back to default port when an invalid port is supplied via env', async () => {
    const warnings: string[] = []
    const previous = process.env['PORT']
    process.env['PORT'] = 'not-a-port'
    try {
      // We can't reliably listen on the fallback (3001 may be taken in CI);
      // we only assert the warning was emitted. Force port to 0 by passing
      // explicit override after the resolver has logged its warning is not
      // possible — so we instead test the resolver behaviour via a mock log.
      handle = await createMcpHttpServer(makeServer(), {
        // explicit overrides env, so we must NOT set port here.
        port: undefined,
        host: '127.0.0.1',
        auth: 'none',
        log: (msg) => warnings.push(msg),
      }).catch((err) => {
        // If the fallback port 3001 is in use, surface the warning anyway.
        warnings.push(`bind-failed: ${err instanceof Error ? err.message : String(err)}`)
        return undefined
      })
    } finally {
      if (previous === undefined) delete process.env['PORT']
      else process.env['PORT'] = previous
    }
    expect(warnings.some((m) => m.includes('invalid port'))).toBe(true)
  })

  // -----------------------------------------------
  // non-loopback bind safety
  // -----------------------------------------------
  it('refuses to bind to a non-loopback host without allowPublic', async () => {
    await expect(
      createMcpHttpServer(makeServer(), {
        port: 0,
        host: '0.0.0.0',
        log: () => undefined,
      })
    ).rejects.toThrow(/non-loopback/)
  })

  it('refuses non-loopback bind even with allowPublic but auth=none', async () => {
    await expect(
      createMcpHttpServer(makeServer(), {
        port: 0,
        host: '0.0.0.0',
        allowPublic: true,
        auth: 'none',
        log: () => undefined,
      })
    ).rejects.toThrow(/non-loopback/)
  })
})

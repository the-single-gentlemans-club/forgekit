import { randomUUID } from 'node:crypto'
import { createServer as createNodeHttpServer } from 'node:http'
import type { IncomingMessage, Server as NodeHttpServer, ServerResponse } from 'node:http'

import { Server as LowLevelMcpServer } from '@modelcontextprotocol/sdk/server/index.js'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'

/**
 * Anything we can call `.connect(transport)` on.
 * Both `McpServer` (high-level) and `Server` (low-level) qualify.
 */
export type ConnectableMcpServer = McpServer | LowLevelMcpServer

const DEFAULT_PORT = 3001
const DEFAULT_MAX_BODY_BYTES = 10 * 1024 * 1024 // 10 MB
const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1'])

/**
 * Resolver function for the `Access-Control-Allow-Origin` header.
 * Receives the request origin (if any) and the bound port; returns the
 * value to echo back, or `null` to omit the header entirely.
 */
export type CorsOriginResolver = (origin: string | undefined, port: number) => string | null

/**
 * Auth strategy for the HTTP transport.
 *
 * - `'required'` (default): every request must carry `Authorization: Bearer <token>`
 *   matching the token printed to stderr at startup.
 * - `'loopback-only'`: skip the auth check when the server is bound to a
 *   loopback host, the request `Origin` is loopback (or absent — direct
 *   subprocess call), and we're not bound to a public interface.
 *   Non-loopback requests still require the bearer token.
 * - `'none'`: no authentication. Only safe for stdio-style subprocess use
 *   where the port is never exposed.
 */
export type McpHttpAuthMode = 'required' | 'loopback-only' | 'none'

// -----------------------------------------------
// createMcpHttpServer
// Boots an HTTP server that hosts a given McpServer instance via
// the streamable HTTP transport. Lets agents (Claude Desktop, Cursor)
// connect by URL instead of subprocess + stdio.
// -----------------------------------------------
export interface McpHttpServerOptions {
  /** TCP port to listen on. Defaults to PORT env or 3001. */
  port?: number
  /** Hostname to bind to. Defaults to '127.0.0.1' for local-only safety. */
  host?: string
  /** URL path the MCP endpoint is served from. Defaults to '/mcp'. */
  path?: string
  /** Override the session ID generator. Defaults to crypto.randomUUID. */
  sessionIdGenerator?: () => string
  /**
   * Allow-list of origins for CORS.
   *
   * - Omitted (default): only `http://localhost:<port>` and `http://127.0.0.1:<port>`
   *   for the actual listening port are allowed. This is the safe default and
   *   defends against drive-by attacks from arbitrary webpages.
   * - `string[]`: explicit allow-list of origin strings.
   * - `(origin, port) => string | null`: dynamic resolver.
   * - `'*'`: wildcard. Only use this when the server is fronted by an
   *   authenticated tunnel and you understand the DNS-rebinding risk.
   */
  corsOrigins?: string[] | '*' | CorsOriginResolver
  /** Custom logger; defaults to process.stderr so it doesn't collide with stdio output. */
  log?: (message: string) => void
  /**
   * Authentication mode. Defaults to `'required'`.
   *
   * When `'required'`, a random UUID is generated at startup, printed to
   * stderr, and required as `Authorization: Bearer <token>` on every request.
   * Override `authToken` to supply your own.
   */
  auth?: McpHttpAuthMode
  /**
   * Explicit bearer token. If omitted and `auth === 'required'`, a fresh
   * `crypto.randomUUID()` is generated and printed to stderr.
   */
  authToken?: string
  /**
   * Permit binding to a non-loopback host (e.g. `0.0.0.0`). Defaults to `false`.
   * When `true`, `auth` must be `'required'` — we refuse to listen on a public
   * interface without authentication. Pair with a real reverse proxy.
   */
  allowPublic?: boolean
  /**
   * Maximum body size accepted on POST in bytes. Defaults to 10 MB. Requests
   * larger than this are rejected with HTTP 413 and the socket is destroyed.
   */
  maxBodyBytes?: number
}

export interface McpHttpServerHandle {
  /** The underlying Node http.Server. */
  server: NodeHttpServer
  /** Fully-qualified URL clients should connect to. */
  url: string
  /** Resolved port (after listening). */
  port: number
  /** Resolved bind host. */
  host: string
  /** Endpoint path (e.g. '/mcp'). */
  path: string
  /** The bearer token clients must present (empty when `auth === 'none'`). */
  authToken: string
  /** Resolved auth mode. */
  auth: McpHttpAuthMode
  /** Stop the server. Resolves when fully closed. */
  close: () => Promise<void>
}

export async function createMcpHttpServer(
  mcp: ConnectableMcpServer,
  options: McpHttpServerOptions = {}
): Promise<McpHttpServerHandle> {
  const log = options.log ?? ((msg: string) => process.stderr.write(`[mcp-http] ${msg}\n`))
  const port = resolvePort(options.port, log)
  const host = options.host ?? '127.0.0.1'
  const path = normalizePath(options.path ?? '/mcp')
  const sessionIdGenerator = options.sessionIdGenerator ?? (() => randomUUID())
  const auth: McpHttpAuthMode = options.auth ?? 'required'
  const allowPublic = options.allowPublic ?? false
  const maxBodyBytes = options.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES
  const isLoopback = LOOPBACK_HOSTS.has(host)

  if (!isLoopback && !(allowPublic && auth === 'required')) {
    throw new Error(
      `[mcp-http] refusing to bind to non-loopback host '${host}' without auth. ` +
        `Pass { allowPublic: true, auth: 'required' } to opt in.`
    )
  }

  const authToken = auth === 'required' ? options.authToken ?? randomUUID() : options.authToken ?? ''

  const corsResolver = buildCorsResolver(options.corsOrigins)

  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator })
  await mcp.connect(transport)

  const httpServer = createNodeHttpServer(async (req, res) => {
    // Resolve allow-origin once per request; we need the bound port, which we
    // capture below after the listen() resolves. We pass it via closure.
    applyCorsHeaders(req, res, corsResolver, resolvedPortRef.value)

    if (req.method === 'OPTIONS') {
      res.writeHead(204)
      res.end()
      return
    }

    if (!matchesPath(req.url, path)) {
      res.writeHead(404, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Not found', mcpEndpoint: path }))
      return
    }

    // Auth gate — runs before any body parsing or transport dispatch.
    if (!isAuthorized(req, { auth, authToken, isLoopback, corsResolver, port: resolvedPortRef.value })) {
      res.writeHead(401, {
        'Content-Type': 'application/json',
        'WWW-Authenticate': 'Bearer realm="mcp"',
      })
      res.end(JSON.stringify({ error: 'Unauthorized' }))
      return
    }

    try {
      if (req.method === 'POST') {
        if (!hasJsonContentType(req)) {
          res.writeHead(415, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Unsupported Media Type; expected application/json' }))
          return
        }
        let body: unknown
        try {
          body = await readJsonBody(req, res, maxBodyBytes)
        } catch (err) {
          if (err instanceof PayloadTooLargeError) {
            // readJsonBody already wrote the 413 response before tearing the
            // socket down; nothing more to do here.
            return
          }
          throw err
        }
        await transport.handleRequest(req, res, body)
      } else if (req.method === 'GET' || req.method === 'DELETE') {
        await transport.handleRequest(req, res)
      } else {
        res.writeHead(405, { 'Content-Type': 'application/json', Allow: 'GET, POST, DELETE' })
        res.end(JSON.stringify({ error: 'Method not allowed' }))
      }
    } catch (err) {
      log(`request error: ${err instanceof Error ? err.message : String(err)}`)
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(
          JSON.stringify({
            error: err instanceof Error ? err.message : 'Internal error',
          })
        )
      }
    }
  })

  // Mutable ref so the handler closure sees the actual listening port (port: 0
  // gets assigned by the kernel during listen()).
  const resolvedPortRef = { value: port }

  await new Promise<void>((resolve, reject) => {
    const onError = (err: NodeJS.ErrnoException) => {
      httpServer.off('listening', onListening)
      reject(err)
    }
    const onListening = () => {
      httpServer.off('error', onError)
      resolve()
    }
    httpServer.once('error', onError)
    httpServer.once('listening', onListening)
    httpServer.listen(port, host)
  })

  const address = httpServer.address()
  const resolvedPort = typeof address === 'object' && address !== null ? address.port : port
  resolvedPortRef.value = resolvedPort
  const url = `http://${host}:${resolvedPort}${path}`

  if (!isLoopback) {
    log(`WARNING: bound to non-loopback host '${host}'. Ensure your firewall/reverse-proxy is configured.`)
  }
  log(`listening at ${url}`)
  if (auth === 'required' && !options.authToken) {
    log('========================================')
    log(`AUTH_TOKEN=${authToken}`)
    log('Send as: Authorization: Bearer <token>')
    log('========================================')
  } else if (auth === 'none') {
    log('WARNING: auth disabled (auth: "none"). Only safe for trusted subprocess use.')
  }

  return {
    server: httpServer,
    url,
    port: resolvedPort,
    host,
    path,
    authToken,
    auth,
    close: () =>
      new Promise<void>((resolve, reject) => {
        httpServer.close((err) => (err ? reject(err) : resolve()))
      }),
  }
}

// -----------------------------------------------
// helpers
// -----------------------------------------------
function normalizePath(input: string): string {
  if (!input.startsWith('/')) return `/${input}`
  return input.replace(/\/+$/, '') || '/'
}

function matchesPath(reqUrl: string | undefined, mcpPath: string): boolean {
  if (!reqUrl) return false
  const pathname = reqUrl.split('?')[0]
  return pathname === mcpPath
}

function resolvePort(explicit: number | undefined, log: (msg: string) => void): number {
  const candidate = explicit ?? process.env['PORT']
  if (candidate === undefined || candidate === '') return DEFAULT_PORT
  const parsed = typeof candidate === 'number' ? candidate : Number(candidate)
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 65535) {
    log(`WARNING: invalid port '${String(candidate)}'; falling back to ${DEFAULT_PORT}`)
    return DEFAULT_PORT
  }
  return parsed
}

function buildCorsResolver(
  input: McpHttpServerOptions['corsOrigins']
): CorsOriginResolver {
  if (input === undefined) {
    // Safe default: only loopback origins matching our bound port.
    return (origin, port) => {
      if (!origin) return null
      const allowed = [`http://localhost:${port}`, `http://127.0.0.1:${port}`]
      return allowed.includes(origin) ? origin : null
    }
  }
  if (input === '*') {
    return () => '*'
  }
  if (typeof input === 'function') {
    return input
  }
  const list = input
  return (origin) => (origin && list.includes(origin) ? origin : null)
}

function applyCorsHeaders(
  req: IncomingMessage,
  res: ServerResponse,
  resolver: CorsOriginResolver,
  port: number
): void {
  const origin = req.headers.origin
  const allowValue = resolver(origin, port)
  if (allowValue === '*') {
    res.setHeader('Access-Control-Allow-Origin', '*')
  } else if (allowValue) {
    res.setHeader('Access-Control-Allow-Origin', allowValue)
    res.setHeader('Vary', 'Origin')
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Mcp-Session-Id, Authorization')
  res.setHeader('Access-Control-Expose-Headers', 'Mcp-Session-Id')
}

interface AuthorizeContext {
  auth: McpHttpAuthMode
  authToken: string
  isLoopback: boolean
  corsResolver: CorsOriginResolver
  port: number
}

function isAuthorized(req: IncomingMessage, ctx: AuthorizeContext): boolean {
  if (ctx.auth === 'none') return true

  const header = req.headers['authorization']
  const presented = typeof header === 'string' ? extractBearer(header) : undefined

  if (ctx.auth === 'loopback-only') {
    // Skip auth entirely when bound to loopback AND the origin is loopback (or absent).
    const origin = req.headers.origin
    const originAllowed = origin === undefined || ctx.corsResolver(origin, ctx.port) !== null
    if (ctx.isLoopback && originAllowed) return true
    // Otherwise fall through to bearer check (if a token was configured).
    if (!ctx.authToken) return false
    return presented === ctx.authToken
  }

  // auth === 'required'
  if (!ctx.authToken) return false
  return presented === ctx.authToken
}

function extractBearer(header: string): string | undefined {
  const match = header.match(/^\s*Bearer\s+(.+?)\s*$/i)
  return match ? match[1] : undefined
}

function hasJsonContentType(req: IncomingMessage): boolean {
  const raw = req.headers['content-type']
  if (!raw) return false
  // Strip parameters like `; charset=utf-8` and compare case-insensitively.
  const main = raw.split(';')[0]?.trim().toLowerCase()
  return main === 'application/json'
}

class PayloadTooLargeError extends Error {
  constructor() {
    super('Payload Too Large')
    this.name = 'PayloadTooLargeError'
  }
}

async function readJsonBody(
  req: IncomingMessage,
  res: ServerResponse,
  maxBytes: number
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let total = 0
    let aborted = false
    req.on('data', (chunk: Buffer) => {
      if (aborted) return
      total += chunk.length
      if (total > maxBytes) {
        aborted = true
        // Write the 413 BEFORE tearing the socket down so the client sees it.
        if (!res.headersSent) {
          try {
            res.writeHead(413, { 'Content-Type': 'application/json', Connection: 'close' })
            res.end(JSON.stringify({ error: 'Payload Too Large' }))
          } catch {
            // socket might already be gone — ignore
          }
        }
        req.destroy()
        reject(new PayloadTooLargeError())
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      if (aborted) return
      const raw = Buffer.concat(chunks).toString('utf8')
      if (!raw) return resolve(undefined)
      try {
        resolve(JSON.parse(raw))
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)))
      }
    })
    req.on('error', (err) => {
      if (aborted) return
      reject(err)
    })
  })
}

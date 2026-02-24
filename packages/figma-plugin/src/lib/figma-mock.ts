/**
 * figma-mock.ts — Minimal Figma global mock for unit tests.
 *
 * Provides enough of the Figma API to exercise the builders without a live
 * Figma environment. Import and call `setupFigmaMock()` in a beforeEach.
 */
import { vi } from 'vitest'

/** Minimal VariableCollection stub */
function makeCollection(name: string) {
  const modeId = 'mode-1'
  const variables: Map<string, ReturnType<typeof makeVariable>> = new Map()
  return {
    id: `coll-${name}`,
    name,
    modes: [{ modeId, name: 'Default' }],
    renameMode: vi.fn(),
    remove: vi.fn(),
    _variables: variables,
  }
}

/** Minimal Variable stub */
function makeVariable(name: string, collectionId: string, resolvedType: string) {
  const values: Record<string, unknown> = {}
  return {
    id: `var-${collectionId}-${name}`,
    name,
    variableCollectionId: collectionId,
    resolvedType,
    scopes: [] as string[],
    setValueForMode: vi.fn((modeId: string, value: unknown) => {
      values[modeId] = value
    }),
    _values: values,
    setPluginData: vi.fn(),
    getPluginData: vi.fn(() => ''),
  }
}

/** Minimal SceneNode / container stub */
function makeNode(type: string, name = type) {
  return {
    type,
    name,
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    fills: [] as unknown[],
    strokes: [] as unknown[],
    strokeWeight: 0,
    cornerRadius: 0,
    opacity: 1,
    clipsContent: false,
    effects: [] as unknown[],
    layoutMode: 'NONE',
    primaryAxisSizingMode: 'FIXED',
    counterAxisSizingMode: 'FIXED',
    primaryAxisAlignItems: 'MIN',
    counterAxisAlignItems: 'MIN',
    itemSpacing: 0,
    paddingTop: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    paddingRight: 0,
    characters: '',
    fontSize: 12,
    fontName: { family: 'Inter', style: 'Regular' },
    lineHeight: { value: 100, unit: 'PERCENT' },
    children: [] as unknown[],
    appendChild: vi.fn(function (this: { children: unknown[] }, child: unknown) {
      this.children.push(child)
    }),
    resize: vi.fn(function (this: { width: number; height: number }, w: number, h: number) {
      this.width = w
      this.height = h
    }),
    remove: vi.fn(),
    setPluginData: vi.fn(),
    getPluginData: vi.fn(() => ''),
  }
}

/** Install the Figma mock as a global. Call in beforeEach. */
export function setupFigmaMock() {
  const collections: Map<string, ReturnType<typeof makeCollection>> = new Map()
  const allVariables: ReturnType<typeof makeVariable>[] = []
  const pages: ReturnType<typeof makeNode>[] = []

  const rootPage = makeNode('PAGE', 'Page 1')
  const rootNode = {
    children: [rootPage],
  }

  const ui = {
    postMessage: vi.fn(),
    onmessage: undefined as ((msg: { type: string }) => Promise<void>) | undefined,
  }

  const mock = {
    ui,
    root: rootNode,
    variables: {
      getLocalVariableCollections: vi.fn(() => [...collections.values()]),
      createVariableCollection: vi.fn((name: string) => {
        const coll = makeCollection(name)
        collections.set(name, coll)
        return coll
      }),
      getLocalVariables: vi.fn((type?: string) =>
        allVariables.filter((v) => !type || v.resolvedType === type),
      ),
      createVariable: vi.fn((name: string, collection: ReturnType<typeof makeCollection>, type: string) => {
        const v = makeVariable(name, collection.id, type)
        allVariables.push(v)
        return v
      }),
    },
    createPage: vi.fn(() => {
      const page = makeNode('PAGE')
      pages.push(page)
      return page
    }),
    setCurrentPageAsync: vi.fn(() => Promise.resolve()),
    loadFontAsync: vi.fn(() => Promise.resolve()),
    createRectangle: vi.fn(() => makeNode('RECTANGLE')),
    createEllipse: vi.fn(() => makeNode('ELLIPSE')),
    createFrame: vi.fn(() => makeNode('FRAME')),
    createText: vi.fn(() => makeNode('TEXT')),
    createLine: vi.fn(() => makeNode('LINE')),
    _pages: pages,
    _collections: collections,
    _variables: allVariables,
  }

  // Expose as global `figma`
  vi.stubGlobal('figma', mock)

  return mock
}

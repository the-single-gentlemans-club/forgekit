/**
 * builders/components.ts
 *
 * Builds the 🧱 Components page.
 * This file ships with tidy-app's reference implementation.
 * Fork and replace the component definitions for your own project.
 */
import type { PluginTokens } from '../types.js'
import {
  getOrResetPage,
  hexToRgba,
  linearGradient,
  loadInterFonts,
  makeFrame,
  makeText,
  solidPaint,
  solidPaintFromRgba,
} from '../utils.js'

export async function buildComponentsPage(tokens: PluginTokens): Promise<void> {
  const page = getOrResetPage('🧱 Components')
  await figma.setCurrentPageAsync(page)
  await loadInterFonts()

  const c = {
    white: hexToRgba('#ffffff'),
    stone50: hexToRgba('#fafaf9'),
    stone200: hexToRgba('#e7e5e4'),
    stone400: hexToRgba('#a8a29e'),
    stone600: hexToRgba('#57534e'),
    stone900: hexToRgba('#1c1917'),
    teal600: hexToRgba('#0d9488'),
  }

  let xCursor = 0

  function sectionLabel(text: string, x: number, y: number): void {
    const node = makeText(text, 11, c.teal600, 'Semi Bold')
    node.x = x
    node.y = y
    page.appendChild(node)
  }

  // ---------------------------------------------------------------------------
  // 1. GradientButton — 3 variants × 3 sizes + disabled
  // ---------------------------------------------------------------------------
  sectionLabel('GradientButton', xCursor, -32)

  const btnVariants: Array<{
    name: string
    gradient: string[]
    textColor: RGBA
    label: string
  }> = [
    {
      name: 'primary',
      gradient: tokens.gradients.primary as string[],
      textColor: c.white,
      label: 'Get Started',
    },
    {
      name: 'success',
      gradient: tokens.gradients.success as string[],
      textColor: c.white,
      label: 'Mark Done',
    },
    {
      name: 'gold',
      gradient: tokens.gradients.gold as string[],
      textColor: hexToRgba('#422006'),
      label: 'Save Progress',
    },
  ]

  const btnSizes = [
    { name: 'sm', w: 120, h: 36, fs: 14, r: 8, pV: 10, pH: 16 },
    { name: 'md', w: 160, h: 44, fs: 16, r: 12, pV: 14, pH: 24 },
    { name: 'lg', w: 200, h: 52, fs: 18, r: 16, pV: 18, pH: 32 },
  ]

  let btnY = 0

  for (const size of btnSizes) {
    let btnX = xCursor

    for (const variant of btnVariants) {
      const btn = figma.createFrame()
      btn.name = `GradientButton/${variant.name}/${size.name}`
      btn.resize(size.w, size.h)
      btn.fills = [linearGradient(variant.gradient)]
      btn.cornerRadius = size.r
      btn.layoutMode = 'HORIZONTAL'
      btn.primaryAxisSizingMode = 'FIXED'
      btn.counterAxisSizingMode = 'FIXED'
      btn.primaryAxisAlignItems = 'CENTER'
      btn.counterAxisAlignItems = 'CENTER'
      btn.paddingTop = size.pV
      btn.paddingBottom = size.pV
      btn.paddingLeft = size.pH
      btn.paddingRight = size.pH
      btn.x = btnX
      btn.y = btnY
      btn.effects = [
        {
          type: 'DROP_SHADOW',
          color: { r: 0, g: 0, b: 0, a: 0.1 },
          offset: { x: 0, y: 4 },
          radius: 12,
          spread: 0,
          visible: true,
          blendMode: 'NORMAL',
        },
      ]
      const label = makeText(variant.label, size.fs, variant.textColor, 'Bold')
      btn.appendChild(label)
      page.appendChild(btn)

      const disBtn = figma.createFrame()
      disBtn.name = `GradientButton/${variant.name}/${size.name}/disabled`
      disBtn.resize(size.w, size.h)
      disBtn.fills = [linearGradient(tokens.gradients.disabled as string[])]
      disBtn.cornerRadius = size.r
      disBtn.layoutMode = 'HORIZONTAL'
      disBtn.primaryAxisSizingMode = 'FIXED'
      disBtn.counterAxisSizingMode = 'FIXED'
      disBtn.primaryAxisAlignItems = 'CENTER'
      disBtn.counterAxisAlignItems = 'CENTER'
      disBtn.paddingTop = size.pV
      disBtn.paddingBottom = size.pV
      disBtn.paddingLeft = size.pH
      disBtn.paddingRight = size.pH
      disBtn.opacity = 0.5
      disBtn.x = btnX
      disBtn.y = btnY + size.h + 12
      const disLabel = makeText(variant.label, size.fs, c.white, 'Bold')
      disBtn.appendChild(disLabel)
      page.appendChild(disBtn)

      btnX += size.w + 16
    }

    btnY += size.h + 12 + size.h + 32
  }

  xCursor = btnSizes[2].w * 3 + 16 * 2 + 64

  // ---------------------------------------------------------------------------
  // 2. Skeleton
  // ---------------------------------------------------------------------------
  sectionLabel('Skeleton', xCursor, -32)

  const skeletonBg = hexToRgba('#e7e5e4')
  let skelY = 0

  const skelLine = figma.createRectangle()
  skelLine.name = 'Skeleton/line'
  skelLine.resize(240, 16)
  skelLine.x = xCursor
  skelLine.y = skelY
  skelLine.fills = [solidPaintFromRgba(skeletonBg)]
  skelLine.cornerRadius = 8
  page.appendChild(skelLine)
  skelY += 32

  const skelShort = figma.createRectangle()
  skelShort.name = 'Skeleton/line/short'
  skelShort.resize(160, 12)
  skelShort.x = xCursor
  skelShort.y = skelY
  skelShort.fills = [solidPaintFromRgba(skeletonBg)]
  skelShort.cornerRadius = 6
  page.appendChild(skelShort)
  skelY += 40

  const skelCard = makeFrame({
    name: 'Skeleton/card',
    width: 300,
    height: 88,
    direction: 'HORIZONTAL',
    gap: 12,
    padding: [16, 16],
    fills: [solidPaintFromRgba(c.white)],
    radius: 16,
    strokeColor: c.stone200,
  })
  skelCard.counterAxisAlignItems = 'CENTER'
  skelCard.x = xCursor
  skelCard.y = skelY

  const avatarCircle = figma.createEllipse()
  avatarCircle.resize(44, 44)
  avatarCircle.fills = [solidPaintFromRgba(skeletonBg)]

  const textLines = makeFrame({
    name: 'lines',
    width: 200,
    height: 44,
    direction: 'VERTICAL',
    gap: 10,
    fills: [],
  })
  const line1 = figma.createRectangle()
  line1.resize(180, 14)
  line1.fills = [solidPaintFromRgba(skeletonBg)]
  line1.cornerRadius = 7
  const line2 = figma.createRectangle()
  line2.resize(120, 12)
  line2.fills = [solidPaintFromRgba(skeletonBg)]
  line2.cornerRadius = 6
  textLines.appendChild(line1)
  textLines.appendChild(line2)

  skelCard.appendChild(avatarCircle)
  skelCard.appendChild(textLines)
  page.appendChild(skelCard)
  skelY += 88 + 40

  const skelTask = makeFrame({
    name: 'Skeleton/taskItem',
    width: 300,
    height: 64,
    direction: 'HORIZONTAL',
    gap: 12,
    padding: [12, 16],
    fills: [solidPaintFromRgba(c.white)],
    radius: 12,
    strokeColor: c.stone200,
  })
  skelTask.counterAxisAlignItems = 'CENTER'
  skelTask.x = xCursor
  skelTask.y = skelY

  const checkbox = figma.createRectangle()
  checkbox.resize(24, 24)
  checkbox.fills = [solidPaintFromRgba(skeletonBg)]
  checkbox.cornerRadius = 6

  const taskText = makeFrame({
    name: 'text',
    width: 200,
    height: 40,
    direction: 'VERTICAL',
    gap: 8,
    fills: [],
  })
  const t1 = figma.createRectangle()
  t1.resize(160, 14)
  t1.fills = [solidPaintFromRgba(skeletonBg)]
  t1.cornerRadius = 7
  const t2 = figma.createRectangle()
  t2.resize(100, 10)
  t2.fills = [solidPaintFromRgba(skeletonBg)]
  t2.cornerRadius = 5
  taskText.appendChild(t1)
  taskText.appendChild(t2)

  skelTask.appendChild(checkbox)
  skelTask.appendChild(taskText)
  page.appendChild(skelTask)

  xCursor += 340

  // ---------------------------------------------------------------------------
  // 3. OfflineIndicator — 3 states
  // ---------------------------------------------------------------------------
  sectionLabel('OfflineIndicator', xCursor, -32)

  const offlineStates = [
    {
      name: 'offline',
      bg: hexToRgba('#292524'),
      text: "You're offline",
      sub: 'Changes will sync when back online',
    },
    {
      name: 'syncing',
      bg: hexToRgba('#0d9488'),
      text: 'Syncing…',
      sub: '3 changes remaining',
    },
    {
      name: 'sync-pending',
      bg: hexToRgba('#ca8a04'),
      text: 'Sync pending',
      sub: '2 changes waiting',
    },
  ]

  let offY = 0
  for (const state of offlineStates) {
    const banner = makeFrame({
      name: `OfflineIndicator/${state.name}`,
      width: 390,
      height: 56,
      direction: 'VERTICAL',
      gap: 2,
      padding: [8, 16],
      fills: [solidPaintFromRgba(state.bg)],
    })
    banner.primaryAxisAlignItems = 'CENTER'
    banner.x = xCursor
    banner.y = offY

    const titleNode = makeText(state.text, 14, c.white, 'Semi Bold')
    const subNode = makeText(state.sub, 12, { r: 1, g: 1, b: 1, a: 0.7 })
    banner.appendChild(titleNode)
    banner.appendChild(subNode)
    page.appendChild(banner)

    offY += 56 + 16
  }

  xCursor += 430

  // ---------------------------------------------------------------------------
  // 4. BuddyCard — 3 states
  // ---------------------------------------------------------------------------
  sectionLabel('BuddyCard', xCursor, -32)

  const buddyStates = [
    {
      name: 'get-buddy',
      bg: hexToRgba('#f0fdfa'),
      border: hexToRgba('#99f6e4'),
      emoji: '👯',
      title: 'Get a Buddy',
      sub: 'Pair up for accountability',
      titleColor: hexToRgba('#115e59'),
      subColor: hexToRgba('#0f766e'),
    },
    {
      name: 'pending-invite',
      bg: hexToRgba('#fefce8'),
      border: hexToRgba('#fef08a'),
      emoji: '📬',
      title: 'Buddy Invite!',
      sub: 'Tap to accept or decline',
      titleColor: hexToRgba('#713f12'),
      subColor: hexToRgba('#a16207'),
    },
    {
      name: 'active',
      bg: c.white,
      border: c.stone200,
      emoji: '👤',
      title: 'Alex Johnson',
      sub: 'Streak: 7 🔥  ·  You: 12 🔥',
      titleColor: c.stone900,
      subColor: c.stone400,
    },
  ]

  let buddyY = 0
  for (const state of buddyStates) {
    const card = makeFrame({
      name: `BuddyCard/${state.name}`,
      width: 340,
      height: 72,
      direction: 'HORIZONTAL',
      gap: 12,
      padding: [14, 14],
      fills: [solidPaintFromRgba(state.bg)],
      radius: 16,
      strokeColor: state.border,
    })
    card.counterAxisAlignItems = 'CENTER'
    card.x = xCursor
    card.y = buddyY

    const avatar = figma.createEllipse()
    avatar.resize(40, 40)
    avatar.fills = [solidPaint('#ccfbf1')]

    const emojiNode = makeText(state.emoji, 20, c.stone900)

    const textBlock = makeFrame({
      name: 'text',
      width: 240,
      height: 44,
      direction: 'VERTICAL',
      gap: 4,
      fills: [],
    })
    const titleNode = makeText(state.title, 15, state.titleColor, 'Semi Bold')
    const subNode = makeText(state.sub, 12, state.subColor)
    textBlock.appendChild(titleNode)
    textBlock.appendChild(subNode)

    card.appendChild(avatar)
    card.appendChild(emojiNode)
    card.appendChild(textBlock)
    page.appendChild(card)
    buddyY += 72 + 16
  }

  xCursor += 380

  // ---------------------------------------------------------------------------
  // 5. AnimatedPressable — 3 states
  // ---------------------------------------------------------------------------
  sectionLabel('AnimatedPressable', xCursor, -32)

  const pressStates = [
    { name: 'default', label: 'scale: 1.0', opacity: 1, borderColor: c.stone200 },
    { name: 'pressed', label: 'scale: 0.97', opacity: 0.97, borderColor: c.teal600 },
    { name: 'disabled', label: 'opacity: 0.45', opacity: 0.45, borderColor: c.stone200 },
  ]

  let pressY = 0
  for (const state of pressStates) {
    const wrapper = makeFrame({
      name: `AnimatedPressable/${state.name}`,
      width: 200,
      height: 64,
      direction: 'HORIZONTAL',
      padding: [12, 16],
      fills: [solidPaintFromRgba(c.stone50)],
      radius: 12,
      strokeColor: state.borderColor,
    })
    wrapper.primaryAxisAlignItems = 'CENTER'
    wrapper.counterAxisAlignItems = 'CENTER'
    wrapper.opacity = state.opacity
    wrapper.x = xCursor
    wrapper.y = pressY

    const content = makeFrame({
      name: 'content',
      width: 160,
      height: 40,
      direction: 'VERTICAL',
      gap: 4,
      fills: [],
    })
    content.counterAxisAlignItems = 'CENTER'
    content.primaryAxisAlignItems = 'CENTER'
    const stateLabel = makeText(state.name, 13, c.stone900, 'Semi Bold')
    const scaleLabel = makeText(state.label, 11, c.stone400)
    content.appendChild(stateLabel)
    content.appendChild(scaleLabel)

    wrapper.appendChild(content)
    page.appendChild(wrapper)

    pressY += 64 + 16
  }
}

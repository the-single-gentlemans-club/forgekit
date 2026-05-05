/**
 * builders/screens.ts
 *
 * Builds the 📱 Screens page with iPhone 14 (390×844) frames for each
 * major app view. Ships with tidy-app's reference screens.
 * Fork and replace the screen definitions for your own project.
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

// iPhone 14 viewport
const W = 390
const H = 844
const STATUS_BAR = 44
const TAB_BAR_H = 83
const HEADER_H = 56
const SAFE_CONTENT_TOP = STATUS_BAR + HEADER_H
const SCREEN_GAP = 48

// Shared color constants
const bg = solidPaint('#fafaf9')
const white = solidPaint('#ffffff')
const teal600 = '#0d9488'
const stone50 = '#fafaf9'
const stone100 = '#f5f5f4'
const stone200 = '#e7e5e4'
const stone300 = '#d6d3d1'
const stone400 = '#a8a29e'
const stone600 = '#57534e'
const stone900 = '#1c1917'

export async function buildScreensPage(tokens: PluginTokens): Promise<void> {
  const page = getOrResetPage('📱 Screens')
  await figma.setCurrentPageAsync(page)
  await loadInterFonts()

  let xCursor = 0

  function makeScreen(name: string): FrameNode {
    const screen = figma.createFrame()
    screen.name = name
    screen.resize(W, H)
    screen.x = xCursor
    screen.y = 0
    screen.fills = [bg]
    screen.clipsContent = true
    xCursor += W + SCREEN_GAP
    return screen
  }

  function addStatusBar(screen: FrameNode) {
    const bar = figma.createRectangle()
    bar.resize(W, STATUS_BAR)
    bar.fills = []
    bar.name = 'StatusBar'
    screen.appendChild(bar)

    const time = makeText('9:41', 15, hexToRgba(stone900), 'Semi Bold')
    time.x = 20
    time.y = 14
    screen.appendChild(time)

    const icons = makeText('●●●', 12, hexToRgba(stone600))
    icons.x = W - 60
    icons.y = 16
    screen.appendChild(icons)
  }

  function addHeader(screen: FrameNode, title: string, showBack = false, titleColor = stone900) {
    const header = figma.createFrame()
    header.resize(W, HEADER_H)
    header.y = STATUS_BAR
    header.name = 'Header'
    header.fills = [solidPaintFromRgba(hexToRgba(stone50))]
    screen.appendChild(header)

    if (showBack) {
      const back = makeText('←', 20, hexToRgba(teal600))
      back.x = 16
      back.y = 16
      header.appendChild(back)
    }

    const titleNode = makeText(title, 18, hexToRgba(titleColor), 'Semi Bold')
    titleNode.x = showBack ? 48 : 20
    titleNode.y = 16
    header.appendChild(titleNode)
  }

  function addGradientHeader(screen: FrameNode, title: string, subtitle?: string) {
    const header = figma.createFrame()
    header.resize(W, HEADER_H + 20)
    header.y = STATUS_BAR
    header.name = 'GradientHeader'
    header.fills = [
      linearGradient([
        tokens.gradients.primary[0],
        tokens.gradients.primary[1],
        tokens.gradients.primary[2],
      ] as string[]),
    ]
    screen.appendChild(header)

    const titleNode = makeText(title, 20, hexToRgba('#ffffff'), 'Bold')
    titleNode.x = 20
    titleNode.y = 12
    header.appendChild(titleNode)

    if (subtitle) {
      const subNode = makeText(subtitle, 13, { r: 1, g: 1, b: 1, a: 0.75 })
      subNode.x = 20
      subNode.y = 36
      header.appendChild(subNode)
    }
  }

  function addTabBar(screen: FrameNode, activeTab: 'home' | 'rooms' | 'profile') {
    const tabs = [
      { key: 'home', label: 'Home', icon: '⌂' },
      { key: 'rooms', label: 'Rooms', icon: '⊞' },
      { key: 'profile', label: 'Profile', icon: '◉' },
    ]

    const bar = figma.createFrame()
    bar.resize(W, TAB_BAR_H)
    bar.y = H - TAB_BAR_H
    bar.name = 'TabBar'
    bar.fills = [white]
    bar.strokeWeight = 1
    bar.strokes = [solidPaintFromRgba(hexToRgba(stone200))]
    screen.appendChild(bar)

    const tabW = W / tabs.length
    tabs.forEach((tab, i) => {
      const isActive = tab.key === activeTab
      const color = isActive ? teal600 : stone400

      const iconNode = makeText(tab.icon, 20, hexToRgba(color))
      iconNode.x = i * tabW + (tabW - 20) / 2
      iconNode.y = 10
      bar.appendChild(iconNode)

      const labelNode = makeText(
        tab.label,
        10,
        hexToRgba(color),
        isActive ? 'Semi Bold' : 'Regular'
      )
      labelNode.x = i * tabW + (tabW - 30) / 2
      labelNode.y = 34
      bar.appendChild(labelNode)
    })
  }

  function makeCard(name: string, w: number, h: number): FrameNode {
    const card = figma.createFrame()
    card.name = name
    card.resize(w, h)
    card.fills = [white]
    card.cornerRadius = 16
    card.strokeWeight = 1
    card.strokes = [solidPaintFromRgba(hexToRgba(stone200))]
    card.effects = [
      {
        type: 'DROP_SHADOW',
        color: { r: 0, g: 0, b: 0, a: 0.06 },
        offset: { x: 0, y: 2 },
        radius: 8,
        spread: 0,
        visible: true,
        blendMode: 'NORMAL',
      },
    ]
    return card
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SCREEN 1: Login
  // ─────────────────────────────────────────────────────────────────────────
  {
    const s = makeScreen('Auth / Login')
    s.fills = [solidPaintFromRgba(hexToRgba(stone50))]

    const logoCircle = figma.createEllipse()
    logoCircle.resize(72, 72)
    logoCircle.x = (W - 72) / 2
    logoCircle.y = STATUS_BAR + 60
    logoCircle.fills = [linearGradient(tokens.gradients.primary as string[])]
    s.appendChild(logoCircle)

    const logoText = makeText('T', 36, hexToRgba('#ffffff'), 'Bold')
    logoText.x = (W - 20) / 2
    logoText.y = STATUS_BAR + 78
    s.appendChild(logoText)

    const appName = makeText('Tidy', 28, hexToRgba(stone900), 'Bold')
    appName.x = (W - 48) / 2
    appName.y = STATUS_BAR + 148
    s.appendChild(appName)

    const tagline = makeText('Your calm home companion', 14, hexToRgba(stone400))
    tagline.x = (W - 200) / 2
    tagline.y = STATUS_BAR + 184
    s.appendChild(tagline)

    const card = makeCard('LoginCard', W - 48, 300)
    card.x = 24
    card.y = STATUS_BAR + 224

    const emailBg = figma.createRectangle()
    emailBg.resize(W - 48 - 32, 48)
    emailBg.x = 16
    emailBg.y = 24
    emailBg.fills = [solidPaintFromRgba(hexToRgba(stone100))]
    emailBg.cornerRadius = 12
    emailBg.strokeWeight = 1
    emailBg.strokes = [solidPaintFromRgba(hexToRgba(stone200))]
    card.appendChild(emailBg)

    const emailLabel = makeText('Email address', 14, hexToRgba(stone400))
    emailLabel.x = 32
    emailLabel.y = 38
    card.appendChild(emailLabel)

    const mlBtn = figma.createFrame()
    mlBtn.resize(W - 48 - 32, 48)
    mlBtn.x = 16
    mlBtn.y = 84
    mlBtn.cornerRadius = 12
    mlBtn.fills = [linearGradient(tokens.gradients.primary as string[])]
    mlBtn.layoutMode = 'HORIZONTAL'
    mlBtn.primaryAxisSizingMode = 'FIXED'
    mlBtn.counterAxisSizingMode = 'FIXED'
    mlBtn.primaryAxisAlignItems = 'CENTER'
    mlBtn.counterAxisAlignItems = 'CENTER'
    card.appendChild(mlBtn)

    const mlLabel = makeText('Send Magic Link', 15, hexToRgba('#ffffff'), 'Semi Bold')
    mlBtn.appendChild(mlLabel)

    const divText = makeText('or continue with', 12, hexToRgba(stone400))
    divText.x = (W - 48 - 140) / 2
    divText.y = 148
    card.appendChild(divText)

    const gBtn = figma.createFrame()
    gBtn.resize(W - 48 - 32, 48)
    gBtn.x = 16
    gBtn.y = 172
    gBtn.cornerRadius = 12
    gBtn.fills = [white]
    gBtn.strokeWeight = 1
    gBtn.strokes = [solidPaintFromRgba(hexToRgba(stone200))]
    gBtn.layoutMode = 'HORIZONTAL'
    gBtn.primaryAxisSizingMode = 'FIXED'
    gBtn.counterAxisSizingMode = 'FIXED'
    gBtn.primaryAxisAlignItems = 'CENTER'
    gBtn.counterAxisAlignItems = 'CENTER'
    card.appendChild(gBtn)

    const gLabel = makeText('Continue with Google', 15, hexToRgba(stone900), 'Semi Bold')
    gBtn.appendChild(gLabel)

    s.appendChild(card)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SCREEN 2: Home / Dashboard
  // ─────────────────────────────────────────────────────────────────────────
  {
    const s = makeScreen('Tabs / Home')
    addStatusBar(s)
    addGradientHeader(s, 'Good morning, Alex ☀️', '3 tasks due today')

    const CONTENT_Y = STATUS_BAR + HEADER_H + 20 + 16

    const streakCard = makeCard('StreakCard', W - 32, 80)
    streakCard.x = 16
    streakCard.y = CONTENT_Y

    const streakEmoji = makeText('🔥', 28, hexToRgba(stone900))
    streakEmoji.x = 16
    streakEmoji.y = 20
    streakCard.appendChild(streakEmoji)

    const streakNum = makeText('12', 28, hexToRgba(stone900), 'Bold')
    streakNum.x = 56
    streakNum.y = 20
    streakCard.appendChild(streakNum)

    const streakLabel = makeText('day streak', 13, hexToRgba(stone400))
    streakLabel.x = 56
    streakLabel.y = 50
    streakCard.appendChild(streakLabel)

    const streakCta = makeText('Keep it going →', 13, hexToRgba(teal600), 'Semi Bold')
    streakCta.x = W - 32 - 120
    streakCta.y = 32
    streakCard.appendChild(streakCta)
    s.appendChild(streakCard)

    const todayLabel = makeText("Today's Tasks", 16, hexToRgba(stone900), 'Semi Bold')
    todayLabel.x = 16
    todayLabel.y = CONTENT_Y + 96
    s.appendChild(todayLabel)

    const tasks = [
      { label: 'Vacuum living room', room: 'Living Room', done: true },
      { label: 'Empty dishwasher', room: 'Kitchen', done: false },
      { label: 'Wipe bathroom sink', room: 'Bathroom', done: false },
    ]

    tasks.forEach((task, i) => {
      const taskCard = makeCard(`Task/${i}`, W - 32, 64)
      taskCard.x = 16
      taskCard.y = CONTENT_Y + 128 + i * 76

      const cb = figma.createFrame()
      cb.resize(24, 24)
      cb.x = 16
      cb.y = 20
      cb.cornerRadius = 6
      cb.fills = [solidPaintFromRgba(hexToRgba(task.done ? teal600 : stone100))]
      cb.strokeWeight = task.done ? 0 : 1
      cb.strokes = task.done ? [] : [solidPaintFromRgba(hexToRgba(stone300))]

      if (task.done) {
        const check = makeText('✓', 12, hexToRgba('#ffffff'), 'Bold')
        check.x = 5
        check.y = 4
        cb.appendChild(check)
      }
      taskCard.appendChild(cb)

      const taskLabel = makeText(
        task.label,
        14,
        hexToRgba(task.done ? stone400 : stone900),
        task.done ? 'Regular' : 'Semi Bold'
      )
      taskLabel.x = 52
      taskLabel.y = 14
      taskCard.appendChild(taskLabel)

      const roomLabel = makeText(task.room, 12, hexToRgba(stone400))
      roomLabel.x = 52
      roomLabel.y = 34
      taskCard.appendChild(roomLabel)

      s.appendChild(taskCard)
    })

    const buddyCard = makeCard('BuddyCard', W - 32, 68)
    buddyCard.x = 16
    buddyCard.y = CONTENT_Y + 128 + tasks.length * 76 + 16

    const avatar = figma.createEllipse()
    avatar.resize(40, 40)
    avatar.x = 14
    avatar.y = 14
    avatar.fills = [solidPaintFromRgba(hexToRgba('#ccfbf1'))]
    buddyCard.appendChild(avatar)

    const buddyName = makeText('Sam (Buddy)', 14, hexToRgba(stone900), 'Semi Bold')
    buddyName.x = 66
    buddyName.y = 14
    buddyCard.appendChild(buddyName)

    const buddyStreak = makeText('🔥 8 day streak', 12, hexToRgba(stone400))
    buddyStreak.x = 66
    buddyStreak.y = 36
    buddyCard.appendChild(buddyStreak)

    s.appendChild(buddyCard)
    addTabBar(s, 'home')
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SCREEN 3: Rooms list
  // ─────────────────────────────────────────────────────────────────────────
  {
    const s = makeScreen('Tabs / Rooms')
    addStatusBar(s)
    addHeader(s, 'Rooms')

    const rooms = [
      { name: 'Kitchen', icon: '🍳', tasks: 4, color: '#84cc16' },
      { name: 'Living Room', icon: '🛋️', tasks: 2, color: '#0d9488' },
      { name: 'Bathroom', icon: '🚿', tasks: 6, color: '#0ea5e9' },
      { name: 'Bedroom', icon: '🛏️', tasks: 1, color: '#eab308' },
      { name: 'Office', icon: '💻', tasks: 3, color: '#f97316' },
    ]

    let roomY = SAFE_CONTENT_TOP + 16

    rooms.forEach((room) => {
      const card = makeCard(`Room/${room.name}`, W - 32, 72)
      card.x = 16
      card.y = roomY

      const iconBg = figma.createFrame()
      iconBg.resize(48, 48)
      iconBg.x = 12
      iconBg.y = 12
      iconBg.cornerRadius = 12
      iconBg.fills = [solidPaintFromRgba({ ...hexToRgba(room.color), a: 0.15 })]

      const iconNode = makeText(room.icon, 24, hexToRgba(stone900))
      iconNode.x = 12
      iconNode.y = 12
      iconBg.appendChild(iconNode)
      card.appendChild(iconBg)

      const nameNode = makeText(room.name, 15, hexToRgba(stone900), 'Semi Bold')
      nameNode.x = 72
      nameNode.y = 16
      card.appendChild(nameNode)

      const taskCount = makeText(
        `${room.tasks} task${room.tasks > 1 ? 's' : ''}`,
        13,
        hexToRgba(stone400)
      )
      taskCount.x = 72
      taskCount.y = 38
      card.appendChild(taskCount)

      const chevron = makeText('›', 20, hexToRgba(stone300))
      chevron.x = W - 32 - 20
      chevron.y = 24
      card.appendChild(chevron)

      s.appendChild(card)
      roomY += 88
    })

    const fab = figma.createEllipse()
    fab.resize(56, 56)
    fab.x = W - 56 - 16
    fab.y = H - TAB_BAR_H - 56 - 16
    fab.fills = [linearGradient(tokens.gradients.primary as string[])]
    fab.effects = [
      {
        type: 'DROP_SHADOW',
        color: { r: 0.08, g: 0.58, b: 0.53, a: 0.4 },
        offset: { x: 0, y: 4 },
        radius: 16,
        spread: 0,
        visible: true,
        blendMode: 'NORMAL',
      },
    ]
    s.appendChild(fab)

    const fabIcon = makeText('+', 28, hexToRgba('#ffffff'), 'Bold')
    fabIcon.x = W - 56 - 16 + 16
    fabIcon.y = H - TAB_BAR_H - 56 - 16 + 12
    s.appendChild(fabIcon)

    addTabBar(s, 'rooms')
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SCREEN 4: Room detail
  // ─────────────────────────────────────────────────────────────────────────
  {
    const s = makeScreen('Room / Detail')
    addStatusBar(s)
    addHeader(s, 'Kitchen', true)

    const hero = figma.createFrame()
    hero.resize(W, 100)
    hero.y = STATUS_BAR + HEADER_H
    hero.name = 'RoomHero'
    hero.fills = [solidPaintFromRgba({ ...hexToRgba('#84cc16'), a: 0.08 })]

    const heroIcon = makeText('🍳', 48, hexToRgba(stone900))
    heroIcon.x = 20
    heroIcon.y = 26
    hero.appendChild(heroIcon)

    const heroName = makeText('Kitchen', 22, hexToRgba(stone900), 'Bold')
    heroName.x = 84
    heroName.y = 28
    hero.appendChild(heroName)

    const heroSub = makeText('4 tasks · 2 completed', 13, hexToRgba(stone400))
    heroSub.x = 84
    heroSub.y = 56
    hero.appendChild(heroSub)

    s.appendChild(hero)

    const progressBg = figma.createRectangle()
    progressBg.resize(W - 32, 6)
    progressBg.x = 16
    progressBg.y = STATUS_BAR + HEADER_H + 116
    progressBg.cornerRadius = 3
    progressBg.fills = [solidPaintFromRgba(hexToRgba(stone200))]
    s.appendChild(progressBg)

    const progressFill = figma.createRectangle()
    progressFill.resize((W - 32) * 0.5, 6)
    progressFill.x = 16
    progressFill.y = STATUS_BAR + HEADER_H + 116
    progressFill.cornerRadius = 3
    progressFill.fills = [linearGradient(tokens.gradients.primary as string[])]
    s.appendChild(progressFill)

    const progressLabel = makeText('50% complete', 12, hexToRgba(teal600))
    progressLabel.x = 16
    progressLabel.y = STATUS_BAR + HEADER_H + 128
    s.appendChild(progressLabel)

    const roomTasks = [
      { label: 'Wipe counters', done: true },
      { label: 'Clean stovetop', done: true },
      { label: 'Mop floor', done: false },
      { label: 'Empty trash', done: false },
    ]

    let taskY = STATUS_BAR + HEADER_H + 160

    roomTasks.forEach((task) => {
      const card = makeCard('RoomTask', W - 32, 56)
      card.x = 16
      card.y = taskY

      const cb = figma.createFrame()
      cb.resize(22, 22)
      cb.x = 14
      cb.y = 17
      cb.cornerRadius = 11
      cb.fills = [solidPaintFromRgba(hexToRgba(task.done ? teal600 : stone100))]
      cb.strokeWeight = task.done ? 0 : 1.5
      cb.strokes = task.done ? [] : [solidPaintFromRgba(hexToRgba(stone300))]
      card.appendChild(cb)

      if (task.done) {
        const check = makeText('✓', 11, hexToRgba('#ffffff'), 'Bold')
        check.x = 5
        check.y = 4
        cb.appendChild(check)
      }

      const lbl = makeText(
        task.label,
        14,
        hexToRgba(task.done ? stone300 : stone900),
        task.done ? 'Regular' : 'Semi Bold'
      )
      lbl.x = 50
      lbl.y = 18
      card.appendChild(lbl)

      s.appendChild(card)
      taskY += 68
    })
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SCREEN 5: Profile
  // ─────────────────────────────────────────────────────────────────────────
  {
    const s = makeScreen('Tabs / Profile')
    addStatusBar(s)
    addHeader(s, 'Profile')

    const avatarBig = figma.createEllipse()
    avatarBig.resize(80, 80)
    avatarBig.x = (W - 80) / 2
    avatarBig.y = SAFE_CONTENT_TOP + 24
    avatarBig.fills = [linearGradient(tokens.gradients.primary as string[])]
    s.appendChild(avatarBig)

    const initials = makeText('AJ', 28, hexToRgba('#ffffff'), 'Bold')
    initials.x = (W - 80) / 2 + 20
    initials.y = SAFE_CONTENT_TOP + 46
    s.appendChild(initials)

    const profileName = makeText('Alex Johnson', 20, hexToRgba(stone900), 'Bold')
    profileName.x = (W - 140) / 2
    profileName.y = SAFE_CONTENT_TOP + 116
    s.appendChild(profileName)

    const household = makeText('Johnson Household', 14, hexToRgba(stone400))
    household.x = (W - 160) / 2
    household.y = SAFE_CONTENT_TOP + 142
    s.appendChild(household)

    const statsY = SAFE_CONTENT_TOP + 180
    const statsW = (W - 48) / 3
    const stats = [
      { label: 'Streak', value: '12 🔥' },
      { label: 'Tasks Done', value: '247' },
      { label: 'This Week', value: '18' },
    ]

    stats.forEach((stat, i) => {
      const statCard = makeCard(`Stat/${i}`, statsW, 72)
      statCard.x = 16 + i * (statsW + 8)
      statCard.y = statsY

      const val = makeText(stat.value, 18, hexToRgba(stone900), 'Bold')
      val.x = 12
      val.y = 14
      statCard.appendChild(val)

      const lbl = makeText(stat.label, 11, hexToRgba(stone400))
      lbl.x = 12
      lbl.y = 42
      statCard.appendChild(lbl)

      s.appendChild(statCard)
    })

    const settingsItems = [
      { icon: '🔔', label: 'Notifications' },
      { icon: '🏠', label: 'Household Settings' },
      { icon: '💳', label: 'Subscription' },
      { icon: '🚪', label: 'Sign Out' },
    ]

    let settY = statsY + 90
    settingsItems.forEach((item, i) => {
      const row = makeCard(`Setting/${i}`, W - 32, 52)
      row.x = 16
      row.y = settY

      const icon = makeText(item.icon, 18, hexToRgba(stone900))
      icon.x = 14
      icon.y = 14
      row.appendChild(icon)

      const lbl = makeText(
        item.label,
        15,
        hexToRgba(item.label === 'Sign Out' ? '#dc2626' : stone900)
      )
      lbl.x = 48
      lbl.y = 16
      row.appendChild(lbl)

      const chev = makeText('›', 18, hexToRgba(stone300))
      chev.x = W - 32 - 18
      chev.y = 14
      row.appendChild(chev)

      s.appendChild(row)
      settY += 60
    })

    addTabBar(s, 'profile')
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SCREEN 6: Onboarding
  // ─────────────────────────────────────────────────────────────────────────
  {
    const s = makeScreen('Onboarding')
    addStatusBar(s)

    const heroArea = figma.createFrame()
    heroArea.resize(W, 260)
    heroArea.y = STATUS_BAR + 40
    heroArea.fills = []

    const emoji = makeText('🏡', 72, hexToRgba(stone900))
    emoji.x = (W - 72) / 2
    emoji.y = 0
    heroArea.appendChild(emoji)

    const title = makeText('Set up your household', 24, hexToRgba(stone900), 'Bold')
    title.x = (W - 260) / 2
    title.y = 92
    heroArea.appendChild(title)

    const sub = makeText(
      'Create or join a household to\nstart organizing your home.',
      15,
      hexToRgba(stone400)
    )
    sub.x = 40
    sub.y = 130
    heroArea.appendChild(sub)

    s.appendChild(heroArea)

    const createCard = makeCard('CreateHousehold', W - 32, 96)
    createCard.x = 16
    createCard.y = STATUS_BAR + 340

    const createTitle = makeText('Create a household', 16, hexToRgba(stone900), 'Semi Bold')
    createTitle.x = 16
    createTitle.y = 16
    createCard.appendChild(createTitle)

    const createSub = makeText('Start fresh with your own space', 13, hexToRgba(stone400))
    createSub.x = 16
    createSub.y = 38
    createCard.appendChild(createSub)

    const createBtn = figma.createFrame()
    createBtn.resize(W - 32 - 32, 40)
    createBtn.x = 16
    createBtn.y = 48
    createBtn.cornerRadius = 10
    createBtn.fills = [linearGradient(tokens.gradients.primary as string[])]
    createBtn.layoutMode = 'HORIZONTAL'
    createBtn.primaryAxisSizingMode = 'FIXED'
    createBtn.counterAxisSizingMode = 'FIXED'
    createBtn.primaryAxisAlignItems = 'CENTER'
    createBtn.counterAxisAlignItems = 'CENTER'
    createCard.appendChild(createBtn)

    const createLabel = makeText('Create Household', 14, hexToRgba('#ffffff'), 'Semi Bold')
    createBtn.appendChild(createLabel)

    s.appendChild(createCard)

    const divider = makeText('— or —', 13, hexToRgba(stone400))
    divider.x = (W - 60) / 2
    divider.y = STATUS_BAR + 452
    s.appendChild(divider)

    const joinCard = makeCard('JoinHousehold', W - 32, 96)
    joinCard.x = 16
    joinCard.y = STATUS_BAR + 472

    const joinTitle = makeText('Join with an invite code', 16, hexToRgba(stone900), 'Semi Bold')
    joinTitle.x = 16
    joinTitle.y = 16
    joinCard.appendChild(joinTitle)

    const codeField = figma.createRectangle()
    codeField.resize(W - 32 - 32, 44)
    codeField.x = 16
    codeField.y = 40
    codeField.cornerRadius = 10
    codeField.fills = [solidPaintFromRgba(hexToRgba(stone100))]
    codeField.strokeWeight = 1
    codeField.strokes = [solidPaintFromRgba(hexToRgba(stone200))]
    joinCard.appendChild(codeField)

    const codePlaceholder = makeText('Enter 6-character code…', 14, hexToRgba(stone300))
    codePlaceholder.x = 32
    codePlaceholder.y = STATUS_BAR + 452 + 54
    s.appendChild(codePlaceholder)

    s.appendChild(joinCard)
  }
}

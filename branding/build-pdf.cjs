/**
 * ForgeKit Brand Brief — PDFKit generator
 *
 * Run from this directory:
 *   npm i --no-save pdfkit
 *   node build-pdf.cjs
 *
 * Outputs: ./ForgeKit-Brand-Brief.pdf
 */
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

// ---------- Theme ----------
const COLOR_TEXT = '#1A1A1A';
const COLOR_MUTED = '#5C5C5C';
const COLOR_BRAND = '#B8642A';
const COLOR_RULE = '#E5E0DA';

const FONT_BODY = 'Helvetica';
const FONT_BOLD = 'Helvetica-Bold';
const FONT_ITALIC = 'Helvetica-Oblique';

const PAGE_MARGIN = 72;

const doc = new PDFDocument({
  size: 'LETTER',
  margins: { top: PAGE_MARGIN, bottom: PAGE_MARGIN + 24, left: PAGE_MARGIN, right: PAGE_MARGIN },
  info: {
    Title: 'ForgeKit Brand Brief',
    Author: 'ForgeKit core team',
    Subject: 'Brand brief for agency partner discovery',
    Keywords: 'forgekit, brand, brief, design system, mcp',
  },
  bufferPages: true,
});

const outPath = path.join(__dirname, 'ForgeKit-Brand-Brief.pdf');
doc.pipe(fs.createWriteStream(outPath));

function ensureSpace(linesNeeded = 4) {
  const lineHeight = 14;
  const remaining = doc.page.height - PAGE_MARGIN - 24 - doc.y;
  if (remaining < linesNeeded * lineHeight) doc.addPage();
}

function h1(text) {
  ensureSpace(6);
  doc.moveDown(0.6);
  doc.font(FONT_BOLD).fontSize(20).fillColor(COLOR_TEXT).text(text);
  const y = doc.y + 2;
  doc.moveTo(PAGE_MARGIN, y).lineTo(PAGE_MARGIN + 56, y).lineWidth(2).strokeColor(COLOR_BRAND).stroke();
  doc.moveDown(0.7);
  doc.fillColor(COLOR_TEXT);
}

function h2(text) {
  ensureSpace(5);
  doc.moveDown(0.5);
  doc.font(FONT_BOLD).fontSize(14).fillColor(COLOR_TEXT).text(text);
  doc.moveDown(0.25);
}

function h3(text) {
  ensureSpace(4);
  doc.moveDown(0.35);
  doc.font(FONT_BOLD).fontSize(11).fillColor(COLOR_TEXT).text(text);
  doc.moveDown(0.2);
}

function p(text) {
  doc.font(FONT_BODY).fontSize(10.5).fillColor(COLOR_TEXT).text(text, { align: 'left', lineGap: 3, paragraphGap: 6 });
}

function pRich(parts) {
  doc.fontSize(10.5).fillColor(COLOR_TEXT);
  parts.forEach((part, i) => {
    doc.font(part.bold ? FONT_BOLD : FONT_BODY);
    const isLast = i === parts.length - 1;
    doc.text(part.text, { continued: !isLast, lineGap: 3 });
  });
  doc.moveDown(0.4);
}

function bullet(text) {
  doc.font(FONT_BODY).fontSize(10.5).fillColor(COLOR_TEXT);
  doc.list([text], { bulletRadius: 1.6, textIndent: 14, bulletIndent: 4, lineGap: 3, paragraphGap: 4 });
}

function bulletRich(parts) {
  const indent = 18;
  const bulletX = PAGE_MARGIN + 2;
  const startY = doc.y;
  doc.fillColor(COLOR_TEXT).font(FONT_BODY).fontSize(10.5);
  doc.circle(bulletX + 2, startY + 6, 1.6).fill(COLOR_TEXT);
  const originalX = doc.x;
  doc.x = PAGE_MARGIN + indent;
  parts.forEach((part, i) => {
    doc.font(part.bold ? FONT_BOLD : FONT_BODY).fillColor(COLOR_TEXT);
    const isLast = i === parts.length - 1;
    doc.text(part.text, { continued: !isLast, lineGap: 3 });
  });
  doc.x = originalX;
  doc.moveDown(0.25);
}

function numbered(list) {
  doc.font(FONT_BODY).fontSize(10.5).fillColor(COLOR_TEXT);
  doc.list(list, { listType: 'numbered', textIndent: 18, bulletIndent: 4, lineGap: 3, paragraphGap: 5 });
  doc.moveDown(0.2);
}

function divider() {
  doc.moveDown(0.5);
  const y = doc.y;
  doc.moveTo(PAGE_MARGIN, y).lineTo(doc.page.width - PAGE_MARGIN, y).lineWidth(0.5).strokeColor(COLOR_RULE).stroke();
  doc.moveDown(0.5);
}

function cover() {
  doc.y = 200;
  doc.font(FONT_BOLD).fontSize(54).fillColor(COLOR_TEXT).text('FORGEKIT', { align: 'center', characterSpacing: 6 });
  doc.moveDown(0.5);
  const ruleY = doc.y + 4;
  const cx = doc.page.width / 2;
  doc.moveTo(cx - 60, ruleY).lineTo(cx + 60, ruleY).lineWidth(2).strokeColor(COLOR_BRAND).stroke();
  doc.moveDown(1.5);
  doc.font(FONT_BODY).fontSize(16).fillColor(COLOR_MUTED).text('Brand Brief — for Agency Partner Discovery', { align: 'center' });
  doc.y = doc.page.height - 240;
  doc.font(FONT_BODY).fontSize(11).fillColor(COLOR_MUTED).text('Prepared for the agency partner', { align: 'center' });
  doc.moveDown(0.3);
  doc.text('Prepared by the ForgeKit core team', { align: 'center' });
  doc.moveDown(0.3);
  doc.text('April 2026', { align: 'center' });
  doc.addPage();
}

doc.on('pageAdded', () => { doc.x = PAGE_MARGIN; doc.y = PAGE_MARGIN; });

function paintChrome() {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    if (i === 0) continue;
    doc.font(FONT_BOLD).fontSize(8.5).fillColor(COLOR_MUTED).text('FORGEKIT', PAGE_MARGIN, 32, { width: 200, align: 'left' });
    doc.font(FONT_BODY).fontSize(8.5).fillColor(COLOR_MUTED).text('Brand Brief — Agency Partner Discovery', 0, 32, { width: doc.page.width - PAGE_MARGIN, align: 'right' });
    doc.moveTo(PAGE_MARGIN, 50).lineTo(doc.page.width - PAGE_MARGIN, 50).lineWidth(0.5).strokeColor(COLOR_RULE).stroke();
    const pageNumText = `Page ${i + 1 - range.start} of ${range.count - range.start}`;
    doc.font(FONT_BODY).fontSize(8.5).fillColor(COLOR_MUTED).text(pageNumText, 0, doc.page.height - 36, { width: doc.page.width, align: 'center' });
  }
}

// ---------- Content ----------
cover();

h1('Executive Summary');
p('ForgeKit is an AI-native developer toolchain for design systems. It ships open-source MCP (Model Context Protocol) servers that connect AI coding agents — Claude, Cursor, Copilot, and any MCP-compatible client — directly into the Storybook and Figma workflow, automating the busywork that has historically slowed component teams down.');
p('This brief gives the branding agency the context needed to design a logo system, color palette, typography, voice, and positioning that match a tool built by senior engineers, for senior engineers, in a moment when AI is reshaping how software gets built.');
p('The name ForgeKit is locked. Everything else — mark, palette, type, voice — is open for the agency to shape.');

h1('About ForgeKit');
p('ForgeKit is a TypeScript monorepo of MCP servers and supporting libraries that let AI agents reason about, modify, and verify design system artifacts. The current product surface includes two complementary, open-source servers published on npm:');
bulletRich([{ text: 'forgekit-storybook-mcp', bold: true }, { text: ' — fifteen tools for story generation (interactive, MSW, router, form, page layouts), component analysis, MDX documentation, Playwright and Vitest test scaffolding, Figma Code Connect file generation, and health checks.' }]);
bulletRich([{ text: 'forgekit-context', bold: true }, { text: ' — seven tools that orchestrate Figma and Storybook context together: gap analysis (components in Figma without code, and vice versa), drift detection (hardcoded values vs. design tokens), and Code-to-Canvas (Storybook renders pushed back into Figma as editable frames).' }]);
p('Both packages run locally on a developer’s machine and integrate with any AI agent that speaks MCP. The roadmap extends into deeper agentic workflows: automated component intake, token migrations, and multi-repo design system governance.');

h1('Mission');
p('To give every design system team an AI-native forge — a place where Figma intent, Storybook reality, and shipped code stay in lockstep, automatically.');
h1('Vision');
p('A future where the design system is the source of truth and AI agents do the reconciliation work, closing the gaps between design and code in seconds rather than sprints. ForgeKit aims to be the standard MCP layer that powers that loop — the way a forge sits at the center of a workshop: hot, precise, and indispensable.');
h1('Brand Promise');
p('ForgeKit hands developers and design system teams an AI-grade workshop for their components — opinionated, fast, and built by people who have shipped design systems for a living.');
h1('Positioning Statement');
p('For frontend engineers and design system teams who are tired of reconciling Figma and Storybook by hand, ForgeKit is an open-source MCP toolchain that lets AI agents do it for them — closing drift, generating stories and tests, and keeping design and code in sync. Unlike point plugins or closed-source SaaS, ForgeKit is composable, local-first, and built on the open Model Context Protocol standard, so it plugs into any agent the team already uses.');

h1('Target Audiences');
p('ForgeKit serves four overlapping audiences. The brand should land cleanly with each without watering down the technical edge that earns the first three’s respect.');
h2('Frontend and design system engineers');
p('Senior individual contributors who own Storybook, tokens, and the component library. They write the code that everyone else’s UI is built on.');
bulletRich([{ text: 'Pain: ', bold: true }, { text: 'every new component means a round-trip of stories, MDX, tests, and Figma updates that nobody enjoys writing.' }]);
bulletRich([{ text: 'Win: ', bold: true }, { text: 'ForgeKit hands those rounds to an agent and gives the engineer time back for real architecture work.' }]);
h2('Design system teams and ops');
p('Cross-functional leads bridging design and engineering — the people responsible for adoption, governance, and reducing drift.');
bulletRich([{ text: 'Pain: ', bold: true }, { text: 'hardcoded values creep in, components drift from Figma, and the team spends meetings doing diff archaeology.' }]);
bulletRich([{ text: 'Win: ', bold: true }, { text: 'ForgeKit surfaces drift continuously and turns governance into an automated check rather than a quarterly audit.' }]);
h2('AI-forward product teams');
p('Engineers and PMs already using Claude, Cursor, or Copilot for serious work. They believe agents should do more than autocomplete.');
bulletRich([{ text: 'Pain: ', bold: true }, { text: 'the agent is brilliant in a chat window but blind to the design system.' }]);
bulletRich([{ text: 'Win: ', bold: true }, { text: 'ForgeKit gives the agent eyes and hands inside both Figma and Storybook through MCP.' }]);
h2('Open source and dev-tool buyers');
p('OSS maintainers and dev-tool decision-makers evaluating where to invest in the MCP ecosystem.');
bulletRich([{ text: 'Pain: ', bold: true }, { text: 'the MCP space is full of toy servers; few are production-grade.' }]);
bulletRich([{ text: 'Win: ', bold: true }, { text: 'ForgeKit ships strict TypeScript, scope-enforced module boundaries, real test coverage, and a credible technical foundation to build on.' }]);

h1('Brand Personality');
p('Industrial. Crafted. Confident. Made by makers.');
p('ForgeKit leans hard into the forge metaphor — the anvil, the hammer, the spark, the controlled heat that turns raw material into something useful. This is not a glow-and-gradient AI brand. It is a tool brand. Heavy when it needs to be, fast when it has to be, and unapologetically built for the people who actually do the work.');
h3('Personality dimensions');
bulletRich([{ text: 'Senior, not snobby. ', bold: true }, { text: 'ForgeKit talks to engineers as peers — direct, technical, no fluff, no hand-holding. It assumes competence.' }]);
bulletRich([{ text: 'Crafted, not corporate. ', bold: true }, { text: 'Every detail is considered: type, weight, micro-interactions, error messages. The brand should feel like a well-made tool, not a marketing surface.' }]);
bulletRich([{ text: 'Hot, not loud. ', bold: true }, { text: 'Energy comes from the work, not the volume. Confident restraint over hype.' }]);
bulletRich([{ text: 'Open, not walled. ', bold: true }, { text: 'Open source by default. Standards-first. The brand should signal that ForgeKit composes with the rest of the developer’s stack rather than trying to replace it.' }]);

h1('Voice and Tone');
pRich([{ text: 'Voice: ', bold: true }, { text: 'a senior engineer with a workshop in their garage. Knowledgeable, precise, low ego. Will tell you exactly what a tool does, what it doesn’t do, and why.' }]);
h3('Tone shifts by surface');
bulletRich([{ text: 'Marketing site: ', bold: true }, { text: 'confident, plainspoken, technical without being jargon-heavy.' }]);
bulletRich([{ text: 'Documentation: ', bold: true }, { text: 'dense, accurate, example-first. Show, don’t sell.' }]);
bulletRich([{ text: 'Error messages and CLI output: ', bold: true }, { text: 'terse, helpful, never cute. No emoji.' }]);
bulletRich([{ text: 'Social and community: ', bold: true }, { text: 'conversational, generous, willing to engage with the technical weeds.' }]);
h3('Words and phrases that fit');
p('forge, anvil, temper, weld, shape, hammered out, struck, alloy, set, cooled, cast, build, ship, compose, wire up, scaffold.');
h3('Words and phrases to avoid');
p('revolutionize, magical, effortless, AI-powered (ForgeKit is, but the brand should not lean on that as a feature), transform your workflow, supercharge, unleash.');

h1('Key Messaging Pillars');
p('Four pillars carry the story. The agency should weight them in this order on the marketing site and ancillary surfaces.');
numbered([
  'AI agents that understand your design system. ForgeKit gives Claude, Cursor, and any MCP-compatible agent eyes and hands inside Figma and Storybook. The agent stops guessing.',
  'Drift dies here. Continuous drift detection between design tokens and shipped code. The first toolchain built to keep Figma and Storybook honest with each other.',
  'Open standards, local-first. Built on MCP, open-sourced on npm, runs on the developer’s machine. No SaaS lock-in, no cloud dependency, no data leaves the box.',
  'Built by people who have shipped design systems. TypeScript strict mode, scope-boundary enforced, unit-tested, semantic-released. The kind of foundation a team can actually build on.',
]);

h1('Differentiators');
bulletRich([{ text: 'Composable, not monolithic. ', bold: true }, { text: 'Two complementary MCP servers — pick one or use both. Each is useful standalone.' }]);
bulletRich([{ text: 'MCP-native. ', bold: true }, { text: 'Designed from day one for agentic workflows, not retrofitted from a chat plugin.' }]);
bulletRich([{ text: 'Bidirectional Figma and Storybook. ', bold: true }, { text: 'Code-to-Canvas pushes Storybook renders back into Figma as editable frames — a loop competitors do not close.' }]);
bulletRich([{ text: 'Quality bar. ', bold: true }, { text: 'Strict TypeScript, Nx scope boundaries, unit-tested, semantic-released. The codebase shows the work.' }]);
bulletRich([{ text: 'Open source first. ', bold: true }, { text: 'Published on npm with a permissive license, contributable, inspectable.' }]);

h1('Tagline Directions');
p('The agency should explore taglines in three directions and propose a primary line plus a secondary "what it actually does" line.');
h3('Forge metaphor');
bullet('Where design systems are forged.');
bullet('Strike while the system is hot.');
bullet('An AI forge for your component library.');
h3('Drift and honesty');
bullet('Keep your design system honest.');
bullet('Where Figma and code finally agree.');
bullet('Drift dies here.');
h3('Agentic toolchain');
bullet('An AI-native toolchain for design systems.');
bullet('MCP for the design system.');
bullet('Hand it to the agent.');

h1('Naming Conventions');
bulletRich([{ text: 'Wordmark: ', bold: true }, { text: 'ForgeKit (one word, capital F and K, no space, no hyphen).' }]);
bulletRich([{ text: 'Products: ', bold: true }, { text: 'lowercase, hyphenated. Example: forgekit-storybook-mcp, forgekit-context.' }]);
bulletRich([{ text: 'Never: ', bold: true }, { text: 'Forge Kit, forge-kit, FORGEKIT, Forge-Kit, ForgKit.' }]);

h1('Visual Direction');
p('The agency has full creative latitude on logo, mark, palette, and type. The notes below are direction, not constraint.');
h2('Logomark');
p('Explore symbols rooted in the forge: the anvil silhouette, a struck spark, a hammer mark, a geometric flame, a glowing iron bar. The strongest direction is likely abstract and geometric — a mark that reads as a tool first and a flourish second. Avoid literal flames or cartoon hammers. The mark should hold up at 16px (favicon, MCP server icon in agent UIs) and at large scale (conference banner, t-shirt).');
h2('Wordmark');
p('Bold, slightly condensed, mechanical. Custom letterforms preferred over a stock typeface. The "F" and "K" should be distinctive enough to work as a monogram. Look at the precision of Vercel’s wordmark and the warmth of Linear’s — but with more weight and a hint of tool-shop grit.');
h2('Color');
p('Direction: a primary that reads as hot metal — deep amber, ember orange, or molten copper — anchored by a near-black and a warm off-white. Avoid the dev-tool-default purple gradient. One restrained accent for state and emphasis. The palette should hold up in both light and dark IDE themes, since the brand will live next to code.');
h2('Typography');
p('A geometric or industrial sans for display (something with mechanical character, not generic). A neutral, highly legible sans for body. A monospace for code samples — opinionated, with good ligatures. The system should feel engineered, not editorial.');
h2('Iconography');
p('Stroke-based, geometric, drawn on a strict grid. Slight industrial weight. Should sit naturally next to the logomark.');
h2('Photography and illustration');
p('Macro shots of metal, sparks, tooling, workshops — used sparingly. Avoid stock developer-at-laptop imagery. Where illustration is needed, prefer technical line art over flat character work.');
h2('Motion');
p('Mechanical and decisive. Things snap, click, spark. Avoid gentle fades and gradients-in-motion.');

h1('Brand Do’s and Don’ts');
h3('Do');
bullet('Show the work. Use real code, real output, real screenshots.');
bullet('Talk like an engineer talks: direct, technical, low ceremony.');
bullet('Lean on the forge metaphor in copy and visuals when it earns its place.');
bullet('Treat AI as table stakes, not the headline.');
h3('Don’t');
bullet('Use generic AI iconography (sparkles, brains, robots).');
bullet('Lean on stock photography or character illustration.');
bullet('Soften the language. ForgeKit is a tool, not a platform-as-a-service.');
bullet('Ship anything that wouldn’t look at home next to a Vercel, Linear, or Anthropic surface.');

h1('Competitive Landscape');
p('ForgeKit sits at the intersection of three categories. The brand should make ForgeKit’s place in this map immediately legible.');
bulletRich([{ text: 'Design system tooling: ', bold: true }, { text: 'Storybook, Chromatic, Knapsack, Backlight. Mostly UI-first, agent-blind.' }]);
bulletRich([{ text: 'Figma plugins: ', bold: true }, { text: 'Tokens Studio, Code Connect, Anima. Useful but narrow; not built for agents.' }]);
bulletRich([{ text: 'MCP servers: ', bold: true }, { text: 'a growing field, mostly experimental. ForgeKit aims to be one of the production-grade reference implementations.' }]);
p('ForgeKit is not a plugin, not a cloud platform, and not an experiment. It is a toolchain. The visual and verbal identity should make that obvious within three seconds of landing on any surface.');

h1('What the Agency Will Deliver');
p('The following deliverables are expected from the engagement. Phasing and pricing to be discussed in the SOW.');
numbered([
  'Logomark, wordmark, monogram, and lockup variants in light, dark, and monochrome.',
  'A complete color system with semantic tokens (background, surface, text, brand, accent, success, warning, error) usable across web, IDE, and CLI.',
  'A type system with display, body, and mono pairings, including web-licensed weights.',
  'An iconography starter set of approximately twenty icons on a defined grid.',
  'Brand guidelines document (PDF and Figma) covering logo usage, color, type, voice, and motion principles.',
  'A tagline system: one primary line and one supporting line.',
  'Marketing site visual direction: one hero, one feature page, one docs page.',
  'README and npm card visual treatment, including a 16px favicon-grade mark.',
  'Conference and swag direction: sticker pack, t-shirt, booth backdrop.',
]);

h1('Glossary');
bulletRich([{ text: 'MCP (Model Context Protocol). ', bold: true }, { text: 'An open standard for connecting AI agents to external tools and data sources.' }]);
bulletRich([{ text: 'Storybook. ', bold: true }, { text: 'Open-source workshop for building UI components and pages in isolation.' }]);
bulletRich([{ text: 'Figma Code Connect. ', bold: true }, { text: 'A Figma feature that links design components to their code implementations.' }]);
bulletRich([{ text: 'Design tokens. ', bold: true }, { text: 'Named, technology-agnostic values for color, spacing, type, and other primitives.' }]);
bulletRich([{ text: 'Drift. ', bold: true }, { text: 'Divergence between design intent (Figma) and shipped code (Storybook and the component library).' }]);
bulletRich([{ text: 'Code-to-Canvas. ', bold: true }, { text: 'A ForgeKit feature that pushes rendered Storybook output back into Figma as editable frames.' }]);

divider();
doc.font(FONT_ITALIC).fontSize(9).fillColor(COLOR_MUTED).text('End of brief — questions: ForgeKit core team', { align: 'center' });

paintChrome();
doc.end();

doc.on('end', () => { console.log('Wrote', outPath); });

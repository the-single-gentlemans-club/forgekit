/**
 * ForgeKit Brand Brief — docx-js generator
 *
 * Run from this directory:
 *   npm i --no-save docx
 *   node build-brief.cjs
 *
 * Outputs: ./ForgeKit-Brand-Brief.docx
 */
const fs = require('fs');
const path = require('path');
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Header,
  Footer,
  AlignmentType,
  LevelFormat,
  HeadingLevel,
  PageNumber,
  PageBreak,
  BorderStyle,
  TabStopType,
  TabStopPosition,
} = require('docx');

const FONT = 'Arial';

const p = (text, opts = {}) =>
  new Paragraph({
    spacing: { after: 120, line: 300 },
    ...opts,
    children: [new TextRun({ text, font: FONT })],
  });

const para = (runs, opts = {}) =>
  new Paragraph({ spacing: { after: 120, line: 300 }, ...opts, children: runs });

const r = (text, opts = {}) => new TextRun({ text, font: FONT, ...opts });

const h1 = (text) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 180 },
    children: [new TextRun({ text, font: FONT, bold: true, size: 32 })],
  });

const h2 = (text) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 140 },
    children: [new TextRun({ text, font: FONT, bold: true, size: 26 })],
  });

const h3 = (text) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 100 },
    children: [new TextRun({ text, font: FONT, bold: true, size: 22 })],
  });

const bullet = (text) =>
  new Paragraph({
    numbering: { reference: 'bullets', level: 0 },
    spacing: { after: 80, line: 290 },
    children: [new TextRun({ text, font: FONT })],
  });

const bulletRich = (runs) =>
  new Paragraph({
    numbering: { reference: 'bullets', level: 0 },
    spacing: { after: 80, line: 290 },
    children: runs,
  });

const numbered = (text) =>
  new Paragraph({
    numbering: { reference: 'numbers', level: 0 },
    spacing: { after: 80, line: 290 },
    children: [new TextRun({ text, font: FONT })],
  });

const rule = () =>
  new Paragraph({
    spacing: { before: 120, after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'B8642A', space: 1 } },
    children: [new TextRun({ text: '', font: FONT })],
  });

// ---------- Cover ----------
const cover = [
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 2400, after: 200 },
    children: [new TextRun({ text: 'FORGEKIT', font: FONT, bold: true, size: 72, color: '1A1A1A' })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 600 },
    children: [
      new TextRun({
        text: 'Brand Brief — for Agency Partner Discovery',
        font: FONT,
        size: 28,
        color: '5C5C5C',
      }),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 1800, after: 120 },
    children: [new TextRun({ text: 'Prepared for the agency partner', font: FONT, size: 22, color: '5C5C5C' })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 120 },
    children: [new TextRun({ text: 'Prepared by the ForgeKit core team', font: FONT, size: 22, color: '5C5C5C' })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 0 },
    children: [new TextRun({ text: 'April 2026', font: FONT, size: 22, color: '5C5C5C' })],
  }),
  new Paragraph({ children: [new PageBreak()] }),
];

// ---------- Sections ----------
const execSummary = [
  h1('Executive Summary'),
  p('ForgeKit is an AI-native developer toolchain for design systems. It ships open-source MCP (Model Context Protocol) servers that connect AI coding agents — Claude, Cursor, Copilot, and any MCP-compatible client — directly into the Storybook and Figma workflow, automating the busywork that has historically slowed component teams down.'),
  p('This brief gives the branding agency the context needed to design a logo system, color palette, typography, voice, and positioning that match a tool built by senior engineers, for senior engineers, in a moment when AI is reshaping how software gets built.'),
  p('The name ForgeKit is locked. Everything else — mark, palette, type, voice — is open for the agency to shape.'),
];

const aboutSection = [
  h1('About ForgeKit'),
  p('ForgeKit is a TypeScript monorepo of MCP servers and supporting libraries that let AI agents reason about, modify, and verify design system artifacts. The current product surface includes two complementary, open-source servers published on npm:'),
  bulletRich([r('forgekit-storybook-mcp', { bold: true }), r(' — fifteen tools for story generation (interactive, MSW, router, form, page layouts), component analysis, MDX documentation, Playwright and Vitest test scaffolding, Figma Code Connect file generation, and health checks.')]),
  bulletRich([r('forgekit-context', { bold: true }), r(' — seven tools that orchestrate Figma and Storybook context together: gap analysis (components in Figma without code, and vice versa), drift detection (hardcoded values vs. design tokens), and Code-to-Canvas (Storybook renders pushed back into Figma as editable frames).')]),
  p('Both packages run locally on a developer’s machine and integrate with any AI agent that speaks MCP. The roadmap extends into deeper agentic workflows: automated component intake, token migrations, and multi-repo design system governance.'),
];

const missionSection = [
  h1('Mission'),
  p('To give every design system team an AI-native forge — a place where Figma intent, Storybook reality, and shipped code stay in lockstep, automatically.'),
  h1('Vision'),
  p('A future where the design system is the source of truth and AI agents do the reconciliation work, closing the gaps between design and code in seconds rather than sprints. ForgeKit aims to be the standard MCP layer that powers that loop — the way a forge sits at the center of a workshop: hot, precise, and indispensable.'),
  h1('Brand Promise'),
  p('ForgeKit hands developers and design system teams an AI-grade workshop for their components — opinionated, fast, and built by people who have shipped design systems for a living.'),
  h1('Positioning Statement'),
  p('For frontend engineers and design system teams who are tired of reconciling Figma and Storybook by hand, ForgeKit is an open-source MCP toolchain that lets AI agents do it for them — closing drift, generating stories and tests, and keeping design and code in sync. Unlike point plugins or closed-source SaaS, ForgeKit is composable, local-first, and built on the open Model Context Protocol standard, so it plugs into any agent the team already uses.'),
];

const audiencesSection = [
  h1('Target Audiences'),
  p('ForgeKit serves four overlapping audiences. The brand should land cleanly with each without watering down the technical edge that earns the first three’s respect.'),
  h2('Frontend and design system engineers'),
  p('Senior individual contributors who own Storybook, tokens, and the component library. They write the code that everyone else’s UI is built on.'),
  bulletRich([r('Pain: ', { bold: true }), r('every new component means a round-trip of stories, MDX, tests, and Figma updates that nobody enjoys writing.')]),
  bulletRich([r('Win: ', { bold: true }), r('ForgeKit hands those rounds to an agent and gives the engineer time back for real architecture work.')]),
  h2('Design system teams and ops'),
  p('Cross-functional leads bridging design and engineering — the people responsible for adoption, governance, and reducing drift.'),
  bulletRich([r('Pain: ', { bold: true }), r('hardcoded values creep in, components drift from Figma, and the team spends meetings doing diff archaeology.')]),
  bulletRich([r('Win: ', { bold: true }), r('ForgeKit surfaces drift continuously and turns governance into an automated check rather than a quarterly audit.')]),
  h2('AI-forward product teams'),
  p('Engineers and PMs already using Claude, Cursor, or Copilot for serious work. They believe agents should do more than autocomplete.'),
  bulletRich([r('Pain: ', { bold: true }), r('the agent is brilliant in a chat window but blind to the design system.')]),
  bulletRich([r('Win: ', { bold: true }), r('ForgeKit gives the agent eyes and hands inside both Figma and Storybook through MCP.')]),
  h2('Open source and dev-tool buyers'),
  p('OSS maintainers and dev-tool decision-makers evaluating where to invest in the MCP ecosystem.'),
  bulletRich([r('Pain: ', { bold: true }), r('the MCP space is full of toy servers; few are production-grade.')]),
  bulletRich([r('Win: ', { bold: true }), r('ForgeKit ships strict TypeScript, scope-enforced module boundaries, real test coverage, and a credible technical foundation to build on.')]),
];

const personalitySection = [
  h1('Brand Personality'),
  p('Industrial. Crafted. Confident. Made by makers.'),
  p('ForgeKit leans hard into the forge metaphor — the anvil, the hammer, the spark, the controlled heat that turns raw material into something useful. This is not a glow-and-gradient AI brand. It is a tool brand. Heavy when it needs to be, fast when it has to be, and unapologetically built for the people who actually do the work.'),
  h3('Personality dimensions'),
  bulletRich([r('Senior, not snobby. ', { bold: true }), r('ForgeKit talks to engineers as peers — direct, technical, no fluff, no hand-holding. It assumes competence.')]),
  bulletRich([r('Crafted, not corporate. ', { bold: true }), r('Every detail is considered: type, weight, micro-interactions, error messages. The brand should feel like a well-made tool, not a marketing surface.')]),
  bulletRich([r('Hot, not loud. ', { bold: true }), r('Energy comes from the work, not the volume. Confident restraint over hype.')]),
  bulletRich([r('Open, not walled. ', { bold: true }), r('Open source by default. Standards-first. The brand should signal that ForgeKit composes with the rest of the developer’s stack rather than trying to replace it.')]),
];

const voiceSection = [
  h1('Voice and Tone'),
  para([r('Voice: ', { bold: true }), r('a senior engineer with a workshop in their garage. Knowledgeable, precise, low ego. Will tell you exactly what a tool does, what it doesn’t do, and why.')]),
  h3('Tone shifts by surface'),
  bulletRich([r('Marketing site: ', { bold: true }), r('confident, plainspoken, technical without being jargon-heavy.')]),
  bulletRich([r('Documentation: ', { bold: true }), r('dense, accurate, example-first. Show, don’t sell.')]),
  bulletRich([r('Error messages and CLI output: ', { bold: true }), r('terse, helpful, never cute. No emoji.')]),
  bulletRich([r('Social and community: ', { bold: true }), r('conversational, generous, willing to engage with the technical weeds.')]),
  h3('Words and phrases that fit'),
  p('forge, anvil, temper, weld, shape, hammered out, struck, alloy, set, cooled, cast, build, ship, compose, wire up, scaffold.'),
  h3('Words and phrases to avoid'),
  p('revolutionize, magical, effortless, AI-powered (ForgeKit is, but the brand should not lean on that as a feature), transform your workflow, supercharge, unleash.'),
];

const messagingSection = [
  h1('Key Messaging Pillars'),
  p('Four pillars carry the story. The agency should weight them in this order on the marketing site and ancillary surfaces.'),
  numbered('AI agents that understand your design system. ForgeKit gives Claude, Cursor, and any MCP-compatible agent eyes and hands inside Figma and Storybook. The agent stops guessing.'),
  numbered('Drift dies here. Continuous drift detection between design tokens and shipped code. The first toolchain built to keep Figma and Storybook honest with each other.'),
  numbered('Open standards, local-first. Built on MCP, open-sourced on npm, runs on the developer’s machine. No SaaS lock-in, no cloud dependency, no data leaves the box.'),
  numbered('Built by people who have shipped design systems. TypeScript strict mode, scope-boundary enforced, unit-tested, semantic-released. The kind of foundation a team can actually build on.'),
];

const differentiatorsSection = [
  h1('Differentiators'),
  bulletRich([r('Composable, not monolithic. ', { bold: true }), r('Two complementary MCP servers — pick one or use both. Each is useful standalone.')]),
  bulletRich([r('MCP-native. ', { bold: true }), r('Designed from day one for agentic workflows, not retrofitted from a chat plugin.')]),
  bulletRich([r('Bidirectional Figma and Storybook. ', { bold: true }), r('Code-to-Canvas pushes Storybook renders back into Figma as editable frames — a loop competitors do not close.')]),
  bulletRich([r('Quality bar. ', { bold: true }), r('Strict TypeScript, Nx scope boundaries, unit-tested, semantic-released. The codebase shows the work.')]),
  bulletRich([r('Open source first. ', { bold: true }), r('Published on npm with a permissive license, contributable, inspectable.')]),
];

const taglineSection = [
  h1('Tagline Directions'),
  p('The agency should explore taglines in three directions and propose a primary line plus a secondary "what it actually does" line.'),
  h3('Forge metaphor'),
  bullet('Where design systems are forged.'),
  bullet('Strike while the system is hot.'),
  bullet('An AI forge for your component library.'),
  h3('Drift and honesty'),
  bullet('Keep your design system honest.'),
  bullet('Where Figma and code finally agree.'),
  bullet('Drift dies here.'),
  h3('Agentic toolchain'),
  bullet('An AI-native toolchain for design systems.'),
  bullet('MCP for the design system.'),
  bullet('Hand it to the agent.'),
];

const namingSection = [
  h1('Naming Conventions'),
  bulletRich([r('Wordmark: ', { bold: true }), r('ForgeKit (one word, capital F and K, no space, no hyphen).')]),
  bulletRich([r('Products: ', { bold: true }), r('lowercase, hyphenated. Example: forgekit-storybook-mcp, forgekit-context.')]),
  bulletRich([r('Never: ', { bold: true }), r('Forge Kit, forge-kit, FORGEKIT, Forge-Kit, ForgKit.')]),
];

const visualSection = [
  h1('Visual Direction'),
  p('The agency has full creative latitude on logo, mark, palette, and type. The notes below are direction, not constraint.'),
  h2('Logomark'),
  p('Explore symbols rooted in the forge: the anvil silhouette, a struck spark, a hammer mark, a geometric flame, a glowing iron bar. The strongest direction is likely abstract and geometric — a mark that reads as a tool first and a flourish second. Avoid literal flames or cartoon hammers. The mark should hold up at 16px (favicon, MCP server icon in agent UIs) and at large scale (conference banner, t-shirt).'),
  h2('Wordmark'),
  p('Bold, slightly condensed, mechanical. Custom letterforms preferred over a stock typeface. The "F" and "K" should be distinctive enough to work as a monogram. Look at the precision of Vercel’s wordmark and the warmth of Linear’s — but with more weight and a hint of tool-shop grit.'),
  h2('Color'),
  p('Direction: a primary that reads as hot metal — deep amber, ember orange, or molten copper — anchored by a near-black and a warm off-white. Avoid the dev-tool-default purple gradient. One restrained accent for state and emphasis. The palette should hold up in both light and dark IDE themes, since the brand will live next to code.'),
  h2('Typography'),
  p('A geometric or industrial sans for display (something with mechanical character, not generic). A neutral, highly legible sans for body. A monospace for code samples — opinionated, with good ligatures. The system should feel engineered, not editorial.'),
  h2('Iconography'),
  p('Stroke-based, geometric, drawn on a strict grid. Slight industrial weight. Should sit naturally next to the logomark.'),
  h2('Photography and illustration'),
  p('Macro shots of metal, sparks, tooling, workshops — used sparingly. Avoid stock developer-at-laptop imagery. Where illustration is needed, prefer technical line art over flat character work.'),
  h2('Motion'),
  p('Mechanical and decisive. Things snap, click, spark. Avoid gentle fades and gradients-in-motion.'),
];

const dosDontsSection = [
  h1('Brand Do’s and Don’ts'),
  h3('Do'),
  bullet('Show the work. Use real code, real output, real screenshots.'),
  bullet('Talk like an engineer talks: direct, technical, low ceremony.'),
  bullet('Lean on the forge metaphor in copy and visuals when it earns its place.'),
  bullet('Treat AI as table stakes, not the headline.'),
  h3('Don’t'),
  bullet('Use generic AI iconography (sparkles, brains, robots).'),
  bullet('Lean on stock photography or character illustration.'),
  bullet('Soften the language. ForgeKit is a tool, not a platform-as-a-service.'),
  bullet('Ship anything that wouldn’t look at home next to a Vercel, Linear, or Anthropic surface.'),
];

const competitiveSection = [
  h1('Competitive Landscape'),
  p('ForgeKit sits at the intersection of three categories. The brand should make ForgeKit’s place in this map immediately legible.'),
  bulletRich([r('Design system tooling: ', { bold: true }), r('Storybook, Chromatic, Knapsack, Backlight. Mostly UI-first, agent-blind.')]),
  bulletRich([r('Figma plugins: ', { bold: true }), r('Tokens Studio, Code Connect, Anima. Useful but narrow; not built for agents.')]),
  bulletRich([r('MCP servers: ', { bold: true }), r('a growing field, mostly experimental. ForgeKit aims to be one of the production-grade reference implementations.')]),
  p('ForgeKit is not a plugin, not a cloud platform, and not an experiment. It is a toolchain. The visual and verbal identity should make that obvious within three seconds of landing on any surface.'),
];

const deliverablesSection = [
  h1('What the Agency Will Deliver'),
  p('The following deliverables are expected from the engagement. Phasing and pricing to be discussed in the SOW.'),
  numbered('Logomark, wordmark, monogram, and lockup variants in light, dark, and monochrome.'),
  numbered('A complete color system with semantic tokens (background, surface, text, brand, accent, success, warning, error) usable across web, IDE, and CLI.'),
  numbered('A type system with display, body, and mono pairings, including web-licensed weights.'),
  numbered('An iconography starter set of approximately twenty icons on a defined grid.'),
  numbered('Brand guidelines document (PDF and Figma) covering logo usage, color, type, voice, and motion principles.'),
  numbered('A tagline system: one primary line and one supporting line.'),
  numbered('Marketing site visual direction: one hero, one feature page, one docs page.'),
  numbered('README and npm card visual treatment, including a 16px favicon-grade mark.'),
  numbered('Conference and swag direction: sticker pack, t-shirt, booth backdrop.'),
];

const glossarySection = [
  h1('Glossary'),
  bulletRich([r('MCP (Model Context Protocol). ', { bold: true }), r('An open standard for connecting AI agents to external tools and data sources.')]),
  bulletRich([r('Storybook. ', { bold: true }), r('Open-source workshop for building UI components and pages in isolation.')]),
  bulletRich([r('Figma Code Connect. ', { bold: true }), r('A Figma feature that links design components to their code implementations.')]),
  bulletRich([r('Design tokens. ', { bold: true }), r('Named, technology-agnostic values for color, spacing, type, and other primitives.')]),
  bulletRich([r('Drift. ', { bold: true }), r('Divergence between design intent (Figma) and shipped code (Storybook and the component library).')]),
  bulletRich([r('Code-to-Canvas. ', { bold: true }), r('A ForgeKit feature that pushes rendered Storybook output back into Figma as editable frames.')]),
];

// ---------- Document ----------
const doc = new Document({
  creator: 'ForgeKit core team',
  title: 'ForgeKit Brand Brief',
  description: 'Brand brief for agency partner discovery',
  styles: {
    default: { document: { run: { font: FONT, size: 22 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 32, bold: true, font: FONT, color: '1A1A1A' },
        paragraph: { spacing: { before: 360, after: 180 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 26, bold: true, font: FONT, color: '1A1A1A' },
        paragraph: { spacing: { before: 280, after: 140 }, outlineLevel: 1 } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 22, bold: true, font: FONT, color: '1A1A1A' },
        paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 2 } },
    ],
  },
  numbering: {
    config: [
      { reference: 'bullets',
        levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: 'numbers',
        levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    ],
  },
  sections: [
    {
      properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
              children: [
                new TextRun({ text: 'ForgeKit', font: FONT, bold: true, size: 18, color: '5C5C5C' }),
                new TextRun({ text: '\tBrand Brief — Agency Partner Discovery', font: FONT, size: 18, color: '5C5C5C' }),
              ],
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: 'Page ', font: FONT, size: 18, color: '5C5C5C' }),
                new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 18, color: '5C5C5C' }),
                new TextRun({ text: ' of ', font: FONT, size: 18, color: '5C5C5C' }),
                new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FONT, size: 18, color: '5C5C5C' }),
              ],
            }),
          ],
        }),
      },
      children: [
        ...cover,
        ...execSummary,
        ...aboutSection,
        ...missionSection,
        ...audiencesSection,
        ...personalitySection,
        ...voiceSection,
        ...messagingSection,
        ...differentiatorsSection,
        ...taglineSection,
        ...namingSection,
        ...visualSection,
        ...dosDontsSection,
        ...competitiveSection,
        ...deliverablesSection,
        ...glossarySection,
        rule(),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 200 },
          children: [new TextRun({ text: 'End of brief — questions: ForgeKit core team', font: FONT, italics: true, size: 20, color: '5C5C5C' })],
        }),
      ],
    },
  ],
});

const outPath = path.join(__dirname, 'ForgeKit-Brand-Brief.docx');
Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(outPath, buf);
  console.log('Wrote', outPath, buf.length, 'bytes');
});

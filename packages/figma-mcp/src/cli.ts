#!/usr/bin/env node
import 'dotenv/config'

import fs from 'fs/promises'
import path from 'path'
import prompts from 'prompts'

import { runServer, syncTheme } from './index.js'
import { OutputConfig } from './types.js'
import { detectFramework } from './utils/analyzer.js'
import { fetchFigmaTokens } from './utils/figma.js'

const args = process.argv.slice(2)

// Helper to extract File ID from URL or return as is
function extractFileId(input: string): string {
  if (input.startsWith('http')) {
    // Match /file/FILE_ID/ or /design/FILE_ID/
    const match = input.match(/\/file\/([a-zA-Z0-9]+)|\/design\/([a-zA-Z0-9]+)/)
    if (match) {
      return match[1] || match[2]
    }
  }
  return input
}

async function runInit() {
  console.log('Welcome to ForgeKit Figma MCP!')
  console.log("Let's set up your design system configuration.\n")

  // Check for URL arg
  const initialUrl = args[1] // npx forgekit init [url]
  let detectedFramework: 'shadcn' | 'chakra' | 'unknown' = 'unknown'

  // 1. Get Token first (common to all)
  let token = process.env.FIGMA_ACCESS_TOKEN
  if (!token) {
    const response = await prompts({
      type: 'password',
      name: 'figmaAccessToken',
      message: "What is your Figma Personal Access Token? (We'll save this to .env)",
      validate: (value: string) => (value.length < 5 ? 'Please enter a valid Token' : true),
    })
    token = response.figmaAccessToken
    if (!token) {
      console.log('Cancelled.')
      process.exit(0)
    }
  } else {
    console.log('✅ Found FIGMA_ACCESS_TOKEN in environment.')
  }

  // 1.5 Analyze URL if provided
  if (initialUrl) {
    const fileId = extractFileId(initialUrl)
    if (fileId && fileId.length > 5) {
      console.log(`\n🔍 Analyzing Figma file: ${fileId}...`)
      try {
        const tokens = await fetchFigmaTokens(fileId, token)
        detectedFramework = detectFramework(tokens)
        console.log(`✅ Analysis complete. Detected framework: ${detectedFramework.toUpperCase()}`)
      } catch (e) {
        console.warn(
          '⚠️  Could not analyze file (check permissions or ID). Proceeding with manual setup.'
        )
      }
    }
  }

  // 2. Choose Formats
  // Pre-select based on detection
  const { formats } = await prompts({
    type: 'multiselect',
    name: 'formats',
    message: 'Which formats do you want to generate?',
    choices: [
      { title: 'Chakra UI v3', value: 'chakra-v3', selected: detectedFramework === 'chakra' },
      { title: 'Chakra UI v2', value: 'chakra' },
      {
        title: 'Shadcn/Tailwind (CSS Vars)',
        value: 'shadcn',
        selected: detectedFramework === 'shadcn',
      },
      { title: 'Documentation (Markdown/JSON)', value: 'docs' },
    ],
    min: 1,
    // Note: 'selected' property in choices works better than 'initial' for multiselect in some versions,
    // but 'initial' is safer if we map it.
    // Let's rely on the user seeing the suggestion or just manual selection if prompts doesn't support dynamic defaults easily.
  })

  if (!formats) {
    console.log('Cancelled.')
    process.exit(0)
  }

  const outputs: OutputConfig[] = []
  let globalFileId: string | undefined

  // 3. Ask for File ID strategy
  // If we already have a URL, assume Single File strategy unless user overrides?
  // Actually, let's just pre-fill the global ID if we have it.

  let fileStrategy = 'single'
  if (!initialUrl) {
    const response = await prompts({
      type: 'select',
      name: 'fileStrategy',
      message: 'How do you want to source your tokens?',
      choices: [
        { title: 'Use one Figma file for everything', value: 'single' },
        { title: 'Configure different files for each output', value: 'multiple' },
      ],
    })
    fileStrategy = response.fileStrategy
  } else {
    console.log(`\nUsing provided file for all outputs.`)
  }

  if (fileStrategy === 'single') {
    if (initialUrl) {
      globalFileId = extractFileId(initialUrl)
    } else {
      const { fileId } = await prompts({
        type: 'text',
        name: 'fileId',
        message: 'What is your Figma File ID? (Paste the ID or the full URL)',
        validate: (value: string) =>
          value.length < 5 ? 'Please enter a valid File ID or URL' : true,
      })
      globalFileId = extractFileId(fileId)
    }
  }

  // 4. Configure each output
  for (const format of formats) {
    console.log(`\nConfiguring ${format}...`)

    let fileIdForOutput = undefined
    if (fileStrategy === 'multiple') {
      const { useStarter } = await prompts({
        type: 'select',
        name: 'useStarter',
        message: `Source for ${format}:`,
        choices: [
          { title: 'I have my own file ID', value: 'own' },
          { title: 'Use a Starter Kit (Reference)', value: 'starter' },
        ],
      })

      if (useStarter === 'starter') {
        let link = ''
        if (format.includes('chakra'))
          link = 'https://www.figma.com/community/file/971408436698336262'
        else if (format === 'shadcn')
          link = 'https://www.figma.com/community/file/1203061493325953101'
        else link = 'https://www.figma.com/community/tag/design-system'

        console.log(`\n🔗 Open this link to duplicate the kit: ${link}`)
        console.log('Once duplicated, copy the File ID (or URL) to paste below.\n')
      }

      const { id } = await prompts({
        type: 'text',
        name: 'id',
        message: `Enter Figma File ID for ${format} (or full URL):`,
        validate: (value: string) =>
          value.length < 5 ? 'Please enter a valid File ID or URL' : true,
      })
      fileIdForOutput = extractFileId(id)
    }

    if (format === 'chakra-v3' || format === 'chakra') {
      const { dir } = await prompts({
        type: 'text',
        name: 'dir',
        message: `Output directory for ${format}:`,
        initial: './src/theme',
      })
      outputs.push({ format, dir, figmaFileId: fileIdForOutput })
    } else if (format === 'shadcn') {
      const { dir, cssPath } = await prompts([
        {
          type: 'text',
          name: 'dir',
          message: 'Output directory for Tailwind config:',
          initial: './src/theme',
        },
        {
          type: 'text',
          name: 'cssPath',
          message: 'Path to global CSS file:',
          initial: './src/app/globals.css',
        },
      ])
      outputs.push({ format, dir, cssPath, figmaFileId: fileIdForOutput })
    } else if (format === 'docs') {
      const { dir } = await prompts({
        type: 'text',
        name: 'dir',
        message: 'Output directory for docs:',
        initial: './docs/design-tokens',
      })
      outputs.push({ format, dir, title: 'Design System Tokens', figmaFileId: fileIdForOutput })
    }
  }

  // 5. Save Config
  const config = {
    figmaFileId: globalFileId,
    outputs,
  }

  const configPath = path.resolve(process.cwd(), 'forgekit.json')
  await fs.writeFile(configPath, JSON.stringify(config, null, 2))
  console.log('\n✅ Configuration saved to forgekit.json')

  // 6. Save Token to .env
  const envPath = path.resolve(process.cwd(), '.env')
  let envContent = ''
  try {
    envContent = await fs.readFile(envPath, 'utf-8')
  } catch (e) {
    // File doesn't exist, start fresh
  }

  if (token && !envContent.includes('FIGMA_ACCESS_TOKEN')) {
    const newContent = envContent + `\nFIGMA_ACCESS_TOKEN=${token}\n`
    await fs.writeFile(envPath, newContent.trim())
    console.log('✅ Token saved to .env')
  } else {
    console.log('ℹ️  FIGMA_ACCESS_TOKEN already exists in .env, skipping update.')
  }

  // 7. Update .gitignore
  const gitignorePath = path.resolve(process.cwd(), '.gitignore')
  let gitignoreContent = ''
  try {
    gitignoreContent = await fs.readFile(gitignorePath, 'utf-8')
  } catch (e) {
    // File doesn't exist
  }

  if (!gitignoreContent.includes('.env')) {
    await fs.appendFile(gitignorePath, '\n.env\n')
    console.log('✅ Added .env to .gitignore')
  }

  console.log('\n🎉 Setup complete!')
  console.log('You can now run "npx forgekit sync" to generate your design system.')
}

if (args.includes('init')) {
  runInit().catch((err) => {
    console.error('Error during init:', err)
    process.exit(1)
  })
} else if (args.includes('sync')) {
  const getArg = (flag: string) => {
    const idx = args.indexOf(flag)
    return idx > -1 ? args[idx + 1] : undefined
  }

  let figmaFileId = getArg('--file-id')
  if (figmaFileId) figmaFileId = extractFileId(figmaFileId)

  const figmaAccessToken = getArg('--token')
  const outputDir = getArg('--out')
  const framework = getArg('--framework') as 'chakra' | 'chakra-v3' | undefined

  console.log('Starting theme sync...')

  syncTheme({ figmaFileId, figmaAccessToken, outputDir, framework })
    .then(({ filesWritten, outputDir }) => {
      console.log(`Successfully generated theme`)
      console.log('Files:', filesWritten.join(', '))
      process.exit(0)
    })
    .catch((error) => {
      console.error('Error syncing theme:', error.message)
      process.exit(1)
    })
} else {
  runServer().catch((error) => {
    console.error('Fatal error running server:', error)
    process.exit(1)
  })
}

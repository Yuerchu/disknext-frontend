import { execSync } from 'node:child_process'
import path from 'node:path'

const reserved = new Set([
  'con', 'prn', 'aux', 'nul',
  'com1', 'com2', 'com3', 'com4', 'com5', 'com6', 'com7', 'com8', 'com9',
  'lpt1', 'lpt2', 'lpt3', 'lpt4', 'lpt5', 'lpt6', 'lpt7', 'lpt8', 'lpt9'
])

function getOutput(command) {
  try {
    return execSync(command, { encoding: 'utf8' }).trim()
  } catch {
    return ''
  }
}

const stagedOutput = getOutput('git diff --cached --name-only --diff-filter=ACMR')
const untrackedOutput = getOutput('git ls-files --others --exclude-standard')
const candidates = `${stagedOutput}\n${untrackedOutput}`
  .split(/\r?\n/)
  .map((p) => p.trim())
  .filter(Boolean)

const violations = candidates.filter((filePath) => {
  const fileName = path.basename(filePath).toLowerCase()
  return reserved.has(fileName)
})

if (violations.length > 0) {
  console.error('Blocked reserved Windows filenames:')
  for (const file of violations) console.error(`- ${file}`)
  process.exit(1)
}

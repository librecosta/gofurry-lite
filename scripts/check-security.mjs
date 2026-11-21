import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const security = await readFile(new URL('../out/.well-known/security.txt', import.meta.url), 'utf8')
const entries = security.trimEnd().split(/\r?\n/)
const required = [
  'Contact: mailto:contact@librecosta.com',
  'Canonical: https://go-furry.com/.well-known/security.txt',
  'Preferred-Languages: en, zh-CN',
]
for (const line of required) assert.equal(entries.filter(entry => entry === line).length, 1, line)
const expiry = entries.filter(line => line.startsWith('Expires: '))
assert.equal(expiry.length, 1, 'security.txt must have one Expires field')
const value = expiry[0].slice('Expires: '.length)
assert.match(value, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/)
const date = new Date(value)
assert(Number.isFinite(date.getTime()) && date.toISOString().replace('.000Z', 'Z') === value, 'Invalid security.txt date')
assert(date.getTime() > Date.now(), 'Renew security.txt before building or packaging this release')

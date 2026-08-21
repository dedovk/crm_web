import express from 'express'
import { XMLParser } from 'fast-xml-parser'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const app = express()
app.use(express.json())
const port = Number(process.env.API_PORT || 3001)
const databaseDirectory = path.join(path.dirname(fileURLToPath(import.meta.url)), 'DataBase')
const feedUrl = 'https://ibox-shop.com.ua/products_feed.xml?hash_tag=5c9523b7f0b824b57c3fd42748f3feef&sales_notes=&product_ids=&label_ids=&exclude_fields=&html_description=0&yandex_cpa=&process_presence_sure=&languages=uk&extra_fields=&group_ids=44942218%2C118283821&nested_group_ids=44942218%2C118283821'
const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    isArray: (name) => ['category', 'offer', 'picture', 'param'].includes(name),
})

let cachedGroups = null
let cachedAt = 0
const cacheDuration = 15 * 60 * 1000

function asArray(value) {
    return value === undefined ? [] : Array.isArray(value) ? value : [value]
}

function normalizeGroups(shop) {
    const categories = asArray(shop.categories?.category)
    const offers = asArray(shop.offers?.offer)
    const categoryNames = new Map(categories.map((category) => [String(category['@_id']), category['#text'] || 'Без категории']))
    const groups = new Map()

    for (const offer of offers) {
        const categoryId = String(offer.categoryId || 'uncategorized')
        const group = groups.get(categoryId) || {
            id: categoryId,
            name: categoryNames.get(categoryId) || 'Без категории',
            items: [],
        }
        const pictures = asArray(offer.picture)

        group.items.push({
            id: String(offer['@_id']),
            name: offer.name || 'Без названия',
            image: pictures[0] || '',
            images: pictures,
            price: Number(offer.price || 0),
            oldPrice: offer.oldprice ? Number(offer.oldprice) : null,
            currency: offer.currencyId || 'UAH',
            url: offer.url || '',
            available: offer['@_available'] !== 'false',
            vendor: offer.vendor || '',
        })
        groups.set(categoryId, group)
    }
    console.log(`Loaded ${groups.size} groups from the feed`)
    return [...groups.values()]
}

async function loadGroups() {
    if (cachedGroups && Date.now() - cachedAt < cacheDuration) {
        return cachedGroups
    }

    const response = await fetch(feedUrl)
    if (!response.ok) {
        throw new Error(`Feed request failed with status ${response.status}`)
    }

    const xml = await response.text()
    const document = parser.parse(xml)
    cachedGroups = normalizeGroups(document.yml_catalog.shop)
    cachedAt = Date.now()
    return cachedGroups
}

async function importGroups(name, link) {
    let sourceUrl

    try {
        sourceUrl = new URL(link)
    } catch {
        throw new Error('Link must be a valid URL')
    }

    if (!['http:', 'https:'].includes(sourceUrl.protocol)) {
        throw new Error('Link must use HTTP or HTTPS')
    }

    const response = await fetch(sourceUrl)
    if (!response.ok) {
        throw new Error(`Feed request failed with status ${response.status}`)
    }

    const xml = await response.text()
    const document = parser.parse(xml)
    const shop = document.yml_catalog?.shop

    if (!shop) {
        throw new Error('The link does not contain a valid product feed')
    }

    const sourceGroups = normalizeGroups(shop)
    const group = {
        id: `import-${Date.now()}`,
        name,
        link,
        items: sourceGroups.flatMap((sourceGroup) => sourceGroup.items),
    }
    const fileName = `${slugify(name)}-${Date.now()}.json`
    const filePath = path.join(databaseDirectory, fileName)

    await mkdir(databaseDirectory, { recursive: true })
    await writeFile(filePath, JSON.stringify({ name, link, importedAt: new Date().toISOString(), groups: sourceGroups }, null, 2), 'utf8')

    return { group, fileName }
}

function slugify(value) {
    return value
        .toLowerCase()
        .replace(/[^a-zа-яіїєґ0-9]+/gi, '-')
        .replace(/^-|-$/g, '') || 'group'
}

app.get('/api/groups', async (_request, response) => {
    try {
        response.json({ groups: await loadGroups() })
    } catch (error) {
        console.error(error)
        response.status(502).json({ error: 'Unable to load the product feed' })
    }
})

app.post('/api/groups/import', async (request, response) => {
    const name = typeof request.body?.name === 'string' ? request.body.name.trim() : ''
    const link = typeof request.body?.link === 'string' ? request.body.link.trim() : ''

    if (!name || !link) {
        return response.status(400).json({ error: 'Name and link are required' })
    }

    try {
        const result = await importGroups(name, link)
        return response.status(200).json(result)
    } catch (error) {
        console.error(error)
        return response.status(400).json({ error: error.message || 'Unable to import the product feed' })
    }
})

app.listen(port, () => {
    console.log(`API server listening on http://localhost:${port}`)
})

import express from 'express'
import { XMLParser } from 'fast-xml-parser'
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const app = express()
app.use(express.json())
const port = Number(process.env.API_PORT || 3002)
const databaseDirectory = path.join(path.dirname(fileURLToPath(import.meta.url)), 'DataBase')
const distDirectory = path.join(path.dirname(fileURLToPath(import.meta.url)), 'dist')
const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    isArray: (name) => ['category', 'offer', 'picture', 'param'].includes(name),
})

app.use(express.static(distDirectory))
function asArray(value) {
    return value === undefined ? [] : Array.isArray(value) ? value : [value]
}

function extractOfferXml(xml) {
    const offers = new Map()
    const offerPattern = /<offer\b[^>]*\bid=["']([^"']+)["'][^>]*>[\s\S]*?<\/offer>/gi
    let match

    while ((match = offerPattern.exec(xml)) !== null) {
        offers.set(String(match[1]), match[0])
    }

    return offers
}

function normalizeGroups(shop, offerXmlById = new Map()) {
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
            xml: offerXmlById.get(String(offer['@_id'])) || '',
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

async function loadWorkspaces() {
    await mkdir(databaseDirectory, { recursive: true })
    const files = (await readdir(databaseDirectory)).filter((fileName) => fileName.endsWith('.json'))
    const workspaces = []

    for (const fileName of files) {
        try {
            const storedImport = JSON.parse(await readFile(path.join(databaseDirectory, fileName), 'utf8'))
            workspaces.push({
                id: storedImport.id || `stored-${fileName.replace(/\.json$/i, '')}`,
                name: storedImport.name || fileName.replace(/\.json$/i, ''),
                link: storedImport.link || '',
            })
        } catch (error) {
            console.error(`Skipping invalid database file ${fileName}:`, error)
        }
    }

    return workspaces
}

async function loadWorkspace(workspaceId) {
    const files = (await readdir(databaseDirectory)).filter((fileName) => fileName.endsWith('.json'))

    for (const fileName of files) {
        const storedImport = JSON.parse(await readFile(path.join(databaseDirectory, fileName), 'utf8'))
        const id = storedImport.id || `stored-${fileName.replace(/\.json$/i, '')}`

        if (id === workspaceId) {
            return {
                id,
                name: storedImport.name || fileName.replace(/\.json$/i, ''),
                link: storedImport.link || '',
                groups: asArray(storedImport.groups),
            }
        }
    }

    return null
}

async function loadWorkspaceByName(workspaceName) {
    const files = (await readdir(databaseDirectory)).filter((fileName) => fileName.endsWith('.json'))

    for (const fileName of files) {
        const storedImport = JSON.parse(await readFile(path.join(databaseDirectory, fileName), 'utf8'))

        if (storedImport.name === workspaceName) {
            return storedImport
        }
    }

    return null
}

async function findWorkspaceFileByName(workspaceName) {
    const files = (await readdir(databaseDirectory)).filter((fileName) => fileName.endsWith('.json'))

    for (const fileName of files) {
        const filePath = path.join(databaseDirectory, fileName)
        const workspace = JSON.parse(await readFile(filePath, 'utf8'))

        if (workspace.name === workspaceName) {
            return {
                filePath,
                xmlFilePath: filePath.replace(/\.json$/i, '.xml'),
                workspace,
            }
        }
    }

    return null
}

async function updateWorkspaceGroups(workspaceName, incomingGroups) {
    const storedWorkspace = await findWorkspaceFileByName(workspaceName)

    if (!storedWorkspace) {
        throw new Error('Workspace not found')
    }

    const groups = asArray(storedWorkspace.workspace.groups).map((group) => ({
        ...group,
        items: asArray(group.items),
    }))

    for (const incomingGroup of incomingGroups) {
        const groupId = String(incomingGroup.id || '')
        if (!groupId) continue
        const incomingItems = asArray(incomingGroup.items).filter((item) => item && item.id)
        if (incomingItems.length === 0) continue

        const existingGroup = groups.find((group) => String(group.id) === groupId)
        if (!existingGroup) {
            groups.push({
                ...incomingGroup,
                id: groupId,
                items: incomingItems,
            })
            continue
        }

        const existingItemIds = new Set(existingGroup.items.map((item) => String(item.id)))
        const newItems = incomingItems.filter((item) => {
            const itemId = String(item.id || '')
            return itemId && !existingItemIds.has(itemId)
        })

        existingGroup.items.push(...newItems)
    }

    const updatedWorkspace = {
        ...storedWorkspace.workspace,
        groups,
        updatedAt: new Date().toISOString(),
    }

    await writeFile(storedWorkspace.filePath, JSON.stringify(updatedWorkspace, null, 2), 'utf8')
    return updatedWorkspace
}

async function loadFeedGroups(link) {
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

    return normalizeGroups(shop, extractOfferXml(xml))
}

function getWorkspaceItemIds(workspace) {
    return new Set(
        asArray(workspace.groups)
            .flatMap((group) => asArray(group.items))
            .map((item) => String(item.id))
            .filter(Boolean)
    )
}

function replaceOffersInXml(xml, selectedItems) {
    const offerXml = selectedItems.map((item) => item.xml).filter(Boolean)

    if (offerXml.length !== selectedItems.length) {
        throw new Error('Some selected items do not have original XML data. Re-import this workspace.')
    }

    const offersBlock = /<offers\b[^>]*>[\s\S]*?<\/offers>/i
    if (!offersBlock.test(xml)) {
        throw new Error('Initial workspace XML does not contain an offers section')
    }

    return xml.replace(offersBlock, (match) => {
        const openingTag = match.match(/^<offers\b[^>]*>/i)[0]
        const closingTag = '</offers>'
        return `${openingTag}\n${offerXml.join('\n')}\n${closingTag}`
    })
}

async function compareWorkspaceItems(link, workspaceName) {
    const workspace = await loadWorkspaceByName(workspaceName)

    if (!workspace) {
        throw new Error('Workspace not found')
    }

    const feedGroups = await loadFeedGroups(link)
    const existingItemIds = getWorkspaceItemIds(workspace)

    return feedGroups
        .map((group) => ({
            ...group,
            items: group.items.filter((item) => !existingItemIds.has(String(item.id))),
        }))
        .filter((group) => group.items.length > 0)
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

    const workspaceName = name || shop.name || shop.company || 'Imported workspace'
    const sourceGroups = normalizeGroups(shop, extractOfferXml(xml))
    const workspace = {
        id: `import-${Date.now()}`,
        name: workspaceName,
        link,
        groups: sourceGroups,
    }
    const fileName = `${slugify(workspaceName)}-${Date.now()}.json`
    const filePath = path.join(databaseDirectory, fileName)
    const xmlFilePath = filePath.replace(/\.json$/i, '.xml')

    await mkdir(databaseDirectory, { recursive: true })
    await writeFile(filePath, JSON.stringify({ ...workspace, importedAt: new Date().toISOString() }, null, 2), 'utf8')
    await writeFile(xmlFilePath, xml, 'utf8')

    return { workspace, fileName, xmlFileName: path.basename(xmlFilePath) }
}

function slugify(value) {
    return value
        .toLowerCase()
        .replace(/[^a-zа-яіїєґ0-9]+/gi, '-')
        .replace(/^-|-$/g, '') || 'group'
}

app.get('/api/workspaces', async (_request, response) => {
    try {
        response.json({ workspaces: await loadWorkspaces() })
    } catch (error) {
        console.error(error)
        response.status(500).json({ error: 'Unable to load workspaces' })
    }
})

app.get('/api/workspaces/:workspaceId', async (request, response) => {
    try {
        const workspace = await loadWorkspace(request.params.workspaceId)

        if (!workspace) {
            return response.status(404).json({ error: 'Workspace not found' })
        }

        return response.json({ workspace })
    } catch (error) {
        console.error(error)
        return response.status(500).json({ error: 'Unable to load workspace' })
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

app.post('/api/workspaces/import', async (request, response) => {
    const link = typeof request.body?.link === 'string' ? request.body.link.trim() : ''

    if (!link) {
        return response.status(400).json({ error: 'Link is required' })
    }

    try {
        const result = await importGroups('', link)
        return response.status(200).json(result)
    } catch (error) {
        console.error(error)
        return response.status(400).json({ error: error.message || 'Unable to import the workspace' })
    }
})

app.post('/api/workspaces/compare', async (request, response) => {
    const link = typeof request.body?.link === 'string' ? request.body.link.trim() : ''
    const workspaceName = typeof request.body?.workspaceName === 'string' ? request.body.workspaceName.trim() : ''

    if (!link || !workspaceName) {
        return response.status(400).json({ error: 'Link and workspaceName are required' })
    }

    try {
        const newItems = await compareWorkspaceItems(link, workspaceName)
        return response.status(200).json(newItems)
    } catch (error) {
        console.error(error)
        return response.status(400).json({ error: error.message || 'Unable to compare workspace items' })
    }
})

app.post('/api/workspaces/update', async (request, response) => {
    const workspaceName = typeof request.body?.workspaceName === 'string' ? request.body.workspaceName.trim() : ''
    const groups = request.body?.groups

    if (!workspaceName || !Array.isArray(groups)) {
        return response.status(400).json({ error: 'workspaceName and groups array are required' })
    }

    try {
        const workspace = await updateWorkspaceGroups(workspaceName, groups)
        return response.status(200).json({ workspace })
    } catch (error) {
        console.error(error)
        return response.status(400).json({ error: error.message || 'Unable to update workspace' })
    }
})

app.post('/api/workspaces/export', async (request, response) => {
    const workspaceName = typeof request.body?.workspaceName === 'string' ? request.body.workspaceName.trim() : ''
    const groups = request.body?.groups

    if (!workspaceName || !Array.isArray(groups) || groups.length === 0) {
        return response.status(400).json({ error: 'workspaceName and non-empty groups array are required' })
    }

    try {
        const storedWorkspace = await findWorkspaceFileByName(workspaceName)
        if (!storedWorkspace) {
            return response.status(400).json({ error: 'Workspace not found' })
        }

        const initialXml = await readFile(storedWorkspace.xmlFilePath, 'utf8')
        const selectedItems = groups.flatMap((group) => asArray(group.items))
        const xml = replaceOffersInXml(initialXml, selectedItems)
        const fileName = `${slugify(workspaceName)}-selected.xml`

        response.setHeader('Content-Type', 'application/xml; charset=utf-8')
        response.setHeader('Content-Disposition', `attachment; filename="${fileName}"`)
        return response.status(200).send(xml)
    } catch (error) {
        console.error(error)
        return response.status(400).json({ error: error.message || 'Unable to export workspace items' })
    }
})

app.listen(port, () => {
    console.log(`API server listening on http://localhost:${port}`)
})

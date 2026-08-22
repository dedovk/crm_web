import { useEffect, useState } from 'react'
import './App.css'
import GroupList from './components/GroupList'
import ImportDialog from './components/ImportDialog'
import TabDialog from './components/TabDialog'

function App() {
  const [tabs, setTabs] = useState([])
  const [activeTab, setActiveTab] = useState()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [groups, setGroups] = useState([])
  const [selectedGroups, setSelectedGroups] = useState([])
  const [groupListVersion, setGroupListVersion] = useState(0)
  const [isLoadingWorkspaces, setIsLoadingWorkspaces] = useState(true)
  const [isLoadingGroups, setIsLoadingGroups] = useState(true)
  const [workspaceError, setWorkspaceError] = useState('')
  const [groupsError, setGroupsError] = useState('')
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    async function loadWorkspaces() {
      try {
        const response = await fetch('/api/workspaces')
        if (!response.ok) throw new Error('Не вдалося завантажити робочі простори')

        const data = await response.json()
        setTabs(data.workspaces)
        setActiveTab(data.workspaces[0]?.id)
      } catch (error) {
        setWorkspaceError(error.message)
      } finally {
        setIsLoadingWorkspaces(false)
      }
    }

    loadWorkspaces()
  }, [])

  useEffect(() => {
    if (!activeTab) {
      setGroups([])
      setSelectedGroups([])
      setIsLoadingGroups(false)
      return
    }

    const controller = new AbortController()

    async function loadWorkspaceGroups() {
      setIsLoadingGroups(true)
      setGroupsError('')
      setGroups([])
      setSelectedGroups([])

      try {
        const response = await fetch(`/api/workspaces/${encodeURIComponent(activeTab)}`, {
          signal: controller.signal,
        })
        if (!response.ok) throw new Error('Не вдалося завантажити групи робочого простору')

        const data = await response.json()
        setGroups(data.workspace.groups)
      } catch (error) {
        if (error.name === 'AbortError') return
        setGroups([])
        setGroupsError(error.message)
      } finally {
        if (!controller.signal.aborted) setIsLoadingGroups(false)
      }
    }

    loadWorkspaceGroups()

    return () => controller.abort()
  }, [activeTab])

  function addTab() {
    setIsDialogOpen(true)
  }

  async function createTab(name, link) {
    const response = await fetch('/api/groups/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, link }),
    })

    const responseText = await response.text()
    let data

    try {
      data = JSON.parse(responseText)
    } catch {
      throw new Error('API імпорту недоступне. Запустіть проєкт командою npm run dev.')
    }

    if (!response.ok) {
      throw new Error(data.error || 'Не вдалося імпортувати групу')
    }

    const newWorkspace = data.workspace
    setTabs((currentTabs) => [...currentTabs, newWorkspace])
    setActiveTab(newWorkspace.id)
    setGroups(newWorkspace.groups)
    setIsDialogOpen(false)
  }

  async function compareWorkspace(link, workspaceName) {
    const response = await fetch('/api/workspaces/compare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ link, workspaceName }),
    })

    const responseText = await response.text()
    let data

    try {
      data = JSON.parse(responseText)
    } catch {
      throw new Error('API порівняння недоступне. Запустіть проєкт командою npm run dev.')
    }

    if (!response.ok) {
      throw new Error(data.error || 'Не вдалося порівняти товари робочого простору')
    }

    return data
  }

  async function updateWorkspace(groupsToAdd) {
    const workspaceName = tabs.find((tab) => tab.id === activeTab)?.name
    const selectedGroups = groupsToAdd
      .map((group) => ({
        id: group.id,
        name: group.name,
        items: group.items.filter((item) => item.id),
      }))
      .filter((group) => group.id && group.items.length > 0)

    if (!workspaceName || selectedGroups.length === 0) {
      throw new Error('Виберіть хоча б один товар')
    }

    const response = await fetch('/api/workspaces/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceName, groups: selectedGroups }),
    })

    const responseData = await response.json()
    if (!response.ok) throw new Error(responseData.error || 'Не вдалося оновити робочий простір')

    setGroups(responseData.workspace.groups)
    setSelectedGroups([])
    setGroupListVersion((version) => version + 1)
    setIsImportDialogOpen(false)
  }

  async function downloadWorkspaceItems(groupsToDownload) {
    const workspaceName = tabs.find((tab) => tab.id === activeTab)?.name

    if (!workspaceName) {
      throw new Error('Workspace not found')
    }

    const exportGroups = groupsToDownload
      .map((group) => ({
        id: group.id,
        name: group.name,
        items: (group.items || [])
          .filter((item) => item.id)
          .map((item) => ({
            id: item.id,
            xml: item.xml || '',
          })),
      }))
      .filter((group) => group.items.length > 0)
    const itemIds = exportGroups.flatMap((group) => group.items.map((item) => item.id))

    if (itemIds.length === 0) {
      throw new Error('No items selected for export')
    }

    setIsExporting(true)
    try {
      const response = await fetch('/api/workspaces/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceName, itemIds, groups: exportGroups }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Не вдалося завантажити товари робочого простору')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${workspaceName || 'workspace'}.xml`
      link.click()
      URL.revokeObjectURL(url)
    } finally {
      setIsExporting(false)
    }
  }

  function removeTab(tabIdToRemove) {
    setTabs((currentTabs) => {
      const removedIndex = currentTabs.findIndex((tab) => tab.id === tabIdToRemove)
      const nextTabs = currentTabs.filter((tab) => tab.id !== tabIdToRemove)

      if (activeTab === tabIdToRemove) {
        setActiveTab(nextTabs[Math.min(removedIndex, nextTabs.length - 1)]?.id)
      }

      return nextTabs
    })
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Головна сторінка CRM">
          <span className="brand-mark">C</span>
          <span>Робочий простір CRM</span>
        </a>

        <nav className="tab-bar" aria-label="Розділи робочого простору">
          {tabs.map((tab) => (
            <div
              className={`tab ${activeTab === tab.id ? 'tab--active' : ''}`}
              key={tab.id}
            >
              <button className="tab-select" onClick={() => setActiveTab(tab.id)} type="button">
                {tab.name}
              </button>
              <button
                aria-label={`Закрити ${tab.name}`}
                className="tab-close"
                onClick={() => removeTab(tab.id)}
                type="button"
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>
          ))}
          <button className="add-tab" onClick={addTab} type="button" aria-label="Додати нову вкладку">
            <span aria-hidden="true">+</span>
          </button>
        </nav>

        <button className="import-button" onClick={() => setIsImportDialogOpen(true)} type="button">
          <span className="import-icon" aria-hidden="true">↑</span>
          Імпорт
        </button>
        <button
          className="export-xml-button"
          disabled={!selectedGroups.length || isExporting}
          onClick={() => downloadWorkspaceItems(selectedGroups)}
          type="button"
          title={isExporting ? 'Експорт в процесі...' : ''}
        >
          <span className="import-icon" aria-hidden="true">{isExporting ? '⏳' : '↓'}</span>
          {isExporting ? 'Експорт...' : 'Експорт XML'}
        </button>
      </header>

      <section className="workspace" aria-labelledby="workspace-title">
        <div className="workspace-heading">
          <div>
            <p className="eyebrow">Робочий простір / {tabs.find((tab) => tab.id === activeTab)?.name || 'Огляд'}</p>
            <h1 id="workspace-title">Ваш робочий простір</h1>
          </div>
        </div>

        {(isLoadingWorkspaces || isLoadingGroups) && <p className="groups-message">Завантаження робочого простору...</p>}
        {workspaceError && <p className="groups-message groups-message--error">{workspaceError}</p>}
        {groupsError && <p className="groups-message groups-message--error">{groupsError}</p>}
        {!isLoadingWorkspaces && !isLoadingGroups && !workspaceError && !groupsError && (
          <GroupList
            key={groupListVersion}
            groups={groups}
            onSelectionChange={setSelectedGroups}
            showSelectAll
          />
        )}
      </section>

      {isDialogOpen && <TabDialog onClose={() => setIsDialogOpen(false)} onCreate={createTab} />}
      {isImportDialogOpen && (
        <ImportDialog
          onClose={() => setIsImportDialogOpen(false)}
          onAdd={updateWorkspace}
          onCompare={compareWorkspace}
          onDownload={downloadWorkspaceItems}
          workspaceName={tabs.find((tab) => tab.id === activeTab)?.name}
        />
      )}
    </main>
  )
}

export default App

import { useEffect, useState } from 'react'
import './App.css'
import GroupList, { initialGroups } from './components/GroupList'
import TabDialog from './components/TabDialog'

function App() {
  // pull tabs from back
  const [tabs, setTabs] = useState([])
  const [activeTab, setActiveTab] = useState(tabs[0])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [groups, setGroups] = useState(initialGroups)
  const [isLoadingGroups, setIsLoadingGroups] = useState(true)
  const [groupsError, setGroupsError] = useState('')

  useEffect(() => {
    async function loadGroups() {
      try {
        const response = await fetch('/api/groups')
        if (!response.ok) throw new Error('Unable to load groups')

        const data = await response.json()
        setGroups(data.groups)
      } catch (error) {
        setGroupsError(error.message)
      } finally {
        setIsLoadingGroups(false)
      }
    }

    loadGroups()
  }, [])

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
      throw new Error('Import API is unavailable. Start the project with npm run dev.')
    }

    if (!response.ok) {
      throw new Error(data.error || 'Unable to import the group')
    }

    setGroups((currentGroups) => [...currentGroups, data.group])
    const newTab = { id: data.group.id, name }
    setTabs((currentTabs) => [...currentTabs, newTab])
    setActiveTab(newTab.id)
    setIsDialogOpen(false)
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
        <a className="brand" href="/" aria-label="CRM home">
          <span className="brand-mark">C</span>
          <span>CRM workspace</span>
        </a>

        <nav className="tab-bar" aria-label="Workspace sections">
          {tabs.map((tab) => (
            <div
              className={`tab ${activeTab === tab.id ? 'tab--active' : ''}`}
              key={tab.id}
            >
              <button className="tab-select" onClick={() => setActiveTab(tab.id)} type="button">
                {tab.name}
              </button>
              <button
                aria-label={`Close ${tab.name}`}
                className="tab-close"
                onClick={() => removeTab(tab.id)}
                type="button"
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>
          ))}
          <button className="add-tab" onClick={addTab} type="button" aria-label="Add new tab">
            <span aria-hidden="true">+</span>
          </button>
        </nav>

        <button className="import-button" type="button">
          <span className="import-icon" aria-hidden="true">↑</span>
          Import
        </button>
      </header>

      <section className="workspace" aria-labelledby="workspace-title">
        <div className="workspace-heading">
          <div>
            <p className="eyebrow">Workspace / {tabs.find((tab) => tab.id === activeTab)?.name || 'Overview'}</p>
            <h1 id="workspace-title">Your workspace</h1>
          </div>
        </div>

        {isLoadingGroups && <p className="groups-message">Loading products...</p>}
        {groupsError && <p className="groups-message groups-message--error">{groupsError}. Showing sample data.</p>}
        {!isLoadingGroups && <GroupList groups={groups} />}
      </section>

      {isDialogOpen && <TabDialog onClose={() => setIsDialogOpen(false)} onCreate={createTab} />}
    </main>
  )
}

export default App

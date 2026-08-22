import { useEffect, useState } from 'react'
import GroupList from './GroupList'

function ImportDialog({ onClose, onCompare, onAdd, onDownload, workspaceName }) {
    const [link, setLink] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [submitError, setSubmitError] = useState('')
    const [comparisonGroups, setComparisonGroups] = useState(null)
    const [selectedGroups, setSelectedGroups] = useState([])
    const hasNewItems = comparisonGroups?.length > 0
    const totalItems = comparisonGroups?.reduce((total, group) => total + group.items.length, 0) || 0

    useEffect(() => {
        function handleKeyDown(event) {
            if (event.key === 'Escape') {
                onClose()
            }
        }

        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [onClose])

    async function handleSubmit(event) {
        event.preventDefault()

        if (!link.trim()) return

        setIsSubmitting(true)
        setSubmitError('')
        setComparisonGroups(null)

        try {
            const newGroups = await onCompare(link.trim(), workspaceName)
            setComparisonGroups(newGroups)
        } catch (error) {
            setSubmitError(error.message)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="dialog-backdrop" onMouseDown={onClose}>
            <section
                aria-labelledby="import-title"
                aria-modal="true"
                className={`dialog ${hasNewItems ? 'dialog--results' : ''}`}
                onMouseDown={(event) => event.stopPropagation()}
                role="dialog"
            >
                <div className="dialog-header">
                    <div>
                        <p className="eyebrow">Імпорт робочого простору</p>
                        <h2 id="import-title">Імпортувати дані</h2>
                    </div>
                    <button className="dialog-close" onClick={onClose} type="button" aria-label="Закрити діалог">
                        <span aria-hidden="true">×</span>
                    </button>
                </div>

                {comparisonGroups && (
                    <div className="comparison-summary" role="status">
                        <span><strong>{comparisonGroups.length}</strong> {comparisonGroups.length === 1 ? 'група' : 'груп'}</span>
                        <span><strong>{totalItems}</strong> {totalItems === 1 ? 'товар' : 'товарів'}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    {!hasNewItems && (
                        <div className="field-group">
                            <label className="field-label" htmlFor="import-link">Посилання</label>
                            <input
                                autoFocus
                                className="field-input"
                                id="import-link"
                                onChange={(event) => setLink(event.target.value)}
                                placeholder="https://example.com/feed.xml"
                                type="url"
                                value={link}
                            />
                        </div>
                    )}

                    {comparisonGroups && (
                        comparisonGroups.length > 0
                            ? <div className="comparison-results"><GroupList groups={comparisonGroups} onSelectionChange={setSelectedGroups} showPrice={false} /></div>
                            : <p className="comparison-empty" role="status">Немає нових товарів.</p>
                    )}

                    <div className="dialog-actions">
                        <button className="cancel-button" onClick={onClose} type="button">Скасувати</button>
                        {hasNewItems ? (
                            <>
                                <button className="cancel-button" disabled={!selectedGroups.length} onClick={() => onDownload(selectedGroups)} type="button">
                                    Експорт XML
                                </button>
                                <button className="dialog-import-button" disabled={!selectedGroups.length} onClick={() => onAdd(selectedGroups)} type="button">
                                    Додати
                                </button>
                            </>
                        ) : (
                            <button className="dialog-import-button" disabled={!link.trim() || !workspaceName || isSubmitting} type="submit">
                                {isSubmitting ? 'Імпортування...' : 'Імпортувати'}
                            </button>
                        )}
                    </div>
                    {submitError && <p className="dialog-error" role="alert">{submitError}</p>}
                </form>
            </section>
        </div>
    )
}

export default ImportDialog

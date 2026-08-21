import { useEffect, useState } from 'react'

function TabDialog({ onClose, onCreate }) {
    const [name, setName] = useState('')
    const [link, setLink] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [submitError, setSubmitError] = useState('')

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
        const trimmedName = name.trim()
        const trimmedLink = link.trim()

        if (trimmedName && trimmedLink) {
            setIsSubmitting(true)
            setSubmitError('')

            try {
                await onCreate(trimmedName, trimmedLink)
            } catch (error) {
                setSubmitError(error.message)
                setIsSubmitting(false)
            }
        }
    }

    return (
        <div className="dialog-backdrop" onMouseDown={onClose}>
            <section
                aria-labelledby="new-tab-title"
                aria-modal="true"
                className="dialog"
                onMouseDown={(event) => event.stopPropagation()}
                role="dialog"
            >
                <div className="dialog-header">
                    <div>
                        <p className="eyebrow">Нова група</p>
                        <h2 id="new-tab-title">Додати групу</h2>
                    </div>
                    <button className="dialog-close" onClick={onClose} type="button" aria-label="Закрити діалог">
                        <span aria-hidden="true">×</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="field-group">
                        <label className="field-label" htmlFor="tab-name">Назва</label>
                        <input
                            autoFocus
                            className="field-input"
                            id="tab-name"
                            onChange={(event) => setName(event.target.value)}
                            placeholder="наприклад, Ліди"
                            type="text"
                            value={name}
                        />
                    </div>

                    <div className="field-group">
                        <label className="field-label" htmlFor="tab-link">Ссылка</label>
                        <input
                            className="field-input"
                            id="tab-link"
                            onChange={(event) => setLink(event.target.value)}
                            placeholder="https://example.com"
                            type="url"
                            value={link}
                        />
                    </div>

                    <div className="dialog-actions">
                        <button className="cancel-button" onClick={onClose} type="button">Скасувати</button>
                        <button className="dialog-import-button" disabled={!name.trim() || !link.trim() || isSubmitting} type="submit">
                            {isSubmitting ? 'Імпортування...' : 'Імпортувати'}
                        </button>
                    </div>
                    {submitError && <p className="dialog-error" role="alert">{submitError}</p>}
                </form>
            </section>
        </div>
    )
}

export default TabDialog

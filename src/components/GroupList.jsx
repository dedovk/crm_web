import { useEffect, useState } from 'react'

function GroupList({ groups, showPrice = true, onSelectionChange }) {
    const [selectedItems, setSelectedItems] = useState([])
    const [expandedGroups, setExpandedGroups] = useState(new Set())

    useEffect(() => {
        setExpandedGroups(new Set())
    }, [groups])

    function formatPrice(item) {
        if (typeof item.price === 'number') {
            return `${item.price.toLocaleString('uk-UA')} ${item.currency || 'UAH'}`
        }

        return item.price
    }

    function toggleItem(itemId) {
        setSelectedItems((currentItems) => {
            const nextItems = currentItems.includes(itemId)
                ? currentItems.filter((currentItem) => currentItem !== itemId)
                : [...currentItems, itemId]

            onSelectionChange?.(getSelectedGroups(nextItems))
            return nextItems
        })
    }

    function toggleGroup(group) {
        const groupItemIds = group.items.map((item) => item.id)
        const allSelected = groupItemIds.every((itemId) => selectedItems.includes(itemId))

        setSelectedItems((currentItems) => {
            const nextItems = allSelected
                ? currentItems.filter((itemId) => !groupItemIds.includes(itemId))
                : [...new Set([...currentItems, ...groupItemIds])]

            onSelectionChange?.(getSelectedGroups(nextItems))
            return nextItems
        })
    }

    function getSelectedGroups(itemIds) {
        const selectedIds = new Set(itemIds)

        return groups
            .map((group) => ({
                ...group,
                items: group.items.filter((item) => selectedIds.has(item.id)),
            }))
            .filter((group) => group.items.length > 0)
    }

    function toggleExpandedGroup(groupId) {
        setExpandedGroups((currentGroups) => {
            const nextGroups = new Set(currentGroups)

            if (nextGroups.has(groupId)) {
                nextGroups.delete(groupId)
            } else {
                nextGroups.add(groupId)
            }

            return nextGroups
        })
    }

    return (
        <div className="group-list" aria-label="Групи">
            <div className="group-list-toolbar">
                <span className="group-list-label"><strong>{groups.length}</strong> Груп</span>
            </div>
            {groups.map((group) => (
                <section className="group" key={group.id}>
                    <div className="group-heading">
                        <button
                            aria-expanded={expandedGroups.has(group.id)}
                            aria-label={`${expandedGroups.has(group.id) ? 'Сховати' : 'Показати'} товари групи ${group.name}`}
                            className="group-expand-button"
                            onClick={() => toggleExpandedGroup(group.id)}
                            type="button"
                        >
                            <span aria-hidden="true">›</span>
                        </button>
                        {(() => {
                            const selectedGroupItems = group.items.filter((item) => selectedItems.includes(item.id))
                            const allSelected = group.items.length > 0 && selectedGroupItems.length === group.items.length
                            const partiallySelected = selectedGroupItems.length > 0 && !allSelected

                            return (
                                <label className="item-checkbox group-checkbox" aria-label={`Вибрати всі товари групи ${group.name}`}>
                                    <input
                                        checked={allSelected}
                                        onChange={() => toggleGroup(group)}
                                        ref={(element) => {
                                            if (element) element.indeterminate = partiallySelected
                                        }}
                                        type="checkbox"
                                    />
                                    <span className="checkbox-ui" aria-hidden="true" />
                                </label>
                            )
                        })()}
                        <h2>{group.name}</h2>
                        <span className="item-count">{group.items.length} товарів</span>
                    </div>
                    {expandedGroups.has(group.id) && (
                        <ul className="subgroup-list">
                            {group.items.map((item) => (
                                <li className="subgroup-item" key={item.id}>
                                    <label className="item-checkbox" aria-label={`Вибрати ${item.name}`}>
                                        <input
                                            checked={selectedItems.includes(item.id)}
                                            onChange={() => toggleItem(item.id)}
                                            type="checkbox"
                                        />
                                        <span className="checkbox-ui" aria-hidden="true" />
                                    </label>
                                    <img className="item-image" src={item.image} alt={item.name} />
                                    <span className="item-name">{item.name}</span>
                                    {showPrice && <span className="item-price">{formatPrice(item)}</span>}
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            ))}
        </div>
    )
}

export default GroupList

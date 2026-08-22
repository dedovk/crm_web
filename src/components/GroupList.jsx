import { useEffect, useMemo, useState } from 'react'

function GroupList({ groups, showPrice = true, onSelectionChange, showSelectAll = false }) {
    const [selectedItems, setSelectedItems] = useState([])
    const [expandedGroups, setExpandedGroups] = useState(new Set())

    const availableItemIds = useMemo(
        () => new Set(groups.flatMap((group) => group.items.map((item) => item.id))),
        [groups]
    )
    const activeSelectedItems = useMemo(
        () => selectedItems.filter((itemId) => availableItemIds.has(itemId)),
        [availableItemIds, selectedItems]
    )

    useEffect(() => {
        const selectedIds = new Set(activeSelectedItems)
        const selectedGroups = groups
            .map((group) => ({
                ...group,
                items: group.items.filter((item) => selectedIds.has(item.id)),
            }))
            .filter((group) => group.items.length > 0)

        onSelectionChange?.(selectedGroups)
    }, [groups, activeSelectedItems, onSelectionChange])

    function formatPrice(item) {
        if (typeof item.price === 'number') {
            return `${item.price.toLocaleString('uk-UA')} ${item.currency || 'UAH'}`
        }

        return item.price
    }

    function getAvailabilityTag(item) {
        if (item.availabilityTag && item.availabilityTag !== 'available=true') {
            return item.availabilityTag
        }

        return item.available ? 'Є в наявності' : 'Нема в наявності'
    }

    function toggleItem(itemId) {
        setSelectedItems((currentItems) => {
            const nextItems = currentItems.includes(itemId)
                ? currentItems.filter((currentItem) => currentItem !== itemId)
                : [...currentItems, itemId]

            return nextItems
        })
    }

    function toggleGroup(group) {
        const groupItemIds = group.items.map((item) => item.id)
        const allSelected = groupItemIds.every((itemId) => activeSelectedItems.includes(itemId))

        setSelectedItems((currentItems) => {
            const nextItems = allSelected
                ? currentItems.filter((itemId) => !groupItemIds.includes(itemId))
                : [...new Set([...currentItems, ...groupItemIds])]

            return nextItems
        })
    }

    function toggleAllItems() {
        const allItemIds = groups.flatMap((group) => group.items.map((item) => item.id))
        const allSelected = allItemIds.length > 0 && allItemIds.every((itemId) => selectedItems.includes(itemId))
        const nextItems = allSelected ? [] : allItemIds

        setSelectedItems(nextItems)
    }

    const allItemIds = groups.flatMap((group) => group.items.map((item) => item.id))
    const allItemsSelected = allItemIds.length > 0 && allItemIds.every((itemId) => activeSelectedItems.includes(itemId))
    const totalItems = groups.reduce((total, group) => total + group.items.length, 0)

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
                <span className="group-list-label">
                    <span><strong>{groups.length}</strong> груп</span>
                    <span><strong>{totalItems}</strong> товарів</span>
                </span>
                {showSelectAll && (
                    <button className="select-all-button" onClick={toggleAllItems} type="button">
                        {allItemsSelected ? 'Зняти вибір' : 'Вибрати все'}
                    </button>
                )}
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
                            const selectedGroupItems = group.items.filter((item) => activeSelectedItems.includes(item.id))
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
                                            checked={activeSelectedItems.includes(item.id)}
                                            onChange={() => toggleItem(item.id)}
                                            type="checkbox"
                                        />
                                        <span className="checkbox-ui" aria-hidden="true" />
                                    </label>
                                    <img className="item-image" src={item.image} alt={item.name} />
                                    <span className="item-name">
                                        <span className="item-name-text">{item.name}</span>
                                        <span className={`item-availability-tag ${item.available ? 'item-availability-tag--available' : 'item-availability-tag--missing'}`}>
                                            {getAvailabilityTag(item)}
                                        </span>
                                    </span>
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

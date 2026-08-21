import { useEffect, useState } from 'react'

const initialGroups = [
    {
        id: 'headphones',
        name: 'Наушники',
        items: [
            {
                id: 'airpods',
                name: 'AirPods',
                image: 'https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?auto=format&fit=crop&w=160&q=80',
                price: '5 499 грн',
            },
            {
                id: 'sony-headphones',
                name: 'Sony WH-1000XM5',
                image: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=160&q=80',
                price: '13 999 грн',
            },
        ],
    },
    {
        id: 'phone',
        name: 'телефон',
        items: [
            {
                id: 'iphone',
                name: 'iPhone 15',
                image: 'https://images.unsplash.com/photo-1592286927505-2fd2e0c3b8a8?auto=format&fit=crop&w=160&q=80',
                price: '32 999 грн',
            },
            {
                id: 'samsung',
                name: 'Samsung Galaxy S24',
                image: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?auto=format&fit=crop&w=160&q=80',
                price: '29 999 грн',
            },
        ],
    },
]

function GroupList({ groups = initialGroups }) {
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
        setSelectedItems((currentItems) => (
            currentItems.includes(itemId)
                ? currentItems.filter((currentItem) => currentItem !== itemId)
                : [...currentItems, itemId]
        ))
    }

    function toggleGroup(group) {
        const groupItemIds = group.items.map((item) => item.id)
        const allSelected = groupItemIds.every((itemId) => selectedItems.includes(itemId))

        setSelectedItems((currentItems) => (
            allSelected
                ? currentItems.filter((itemId) => !groupItemIds.includes(itemId))
                : [...new Set([...currentItems, ...groupItemIds])]
        ))
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
        <div className="group-list" aria-label="Groups">
            <div className="group-list-toolbar">
                <span className="group-list-label"><strong>{groups.length}</strong> Groups</span>
            </div>
            {groups.map((group) => (
                <section className="group" key={group.id}>
                    <div className="group-heading">
                        <button
                            aria-expanded={expandedGroups.has(group.id)}
                            aria-label={`${expandedGroups.has(group.id) ? 'Hide' : 'Show'} ${group.name} items`}
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
                                <label className="item-checkbox group-checkbox" aria-label={`Select all ${group.name}`}>
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
                        <span className="item-count">{group.items.length} items</span>
                    </div>
                    {expandedGroups.has(group.id) && (
                        <ul className="subgroup-list">
                            {group.items.map((item) => (
                                <li className="subgroup-item" key={item.id}>
                                    <label className="item-checkbox" aria-label={`Select ${item.name}`}>
                                        <input
                                            checked={selectedItems.includes(item.id)}
                                            onChange={() => toggleItem(item.id)}
                                            type="checkbox"
                                        />
                                        <span className="checkbox-ui" aria-hidden="true" />
                                    </label>
                                    <img className="item-image" src={item.image} alt={item.name} />
                                    <span className="item-name">{item.name}</span>
                                    <span className="item-price">{formatPrice(item)}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            ))}
        </div>
    )
}

export { initialGroups }
export default GroupList

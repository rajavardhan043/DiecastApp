function BrandFilter({ brands, selected, onChange }) {
  return (
    <div className="brand-filter">
      {brands.map(brand => (
        <button
          key={brand}
          className={`filter-btn ${selected === brand ? 'active' : ''}`}
          onClick={() => onChange(brand)}
        >
          {brand === 'all' ? 'All' : brand}
        </button>
      ))}
    </div>
  )
}

export default BrandFilter

import './CategoryFilter.css';

export type PlantCategory = 'all' | 'vegetable' | 'fruit' | 'flower' | 'medicinal' | 'tree' | 'accessories' | 'indoor' | 'other';

interface CategoryFilterProps {
  categories: { value: PlantCategory; label: string }[];
  selectedCategory: PlantCategory;
  onCategoryChange: (category: PlantCategory) => void;
}

export function CategoryFilter({ categories, selectedCategory, onCategoryChange }: CategoryFilterProps) {
  return (
    <div className="plants-categories">
      {categories.map((category) => (
        <button
          key={category.value}
          className={`category-btn ${selectedCategory === category.value ? 'active' : ''}`}
          onClick={() => onCategoryChange(category.value)}
        >
          {category.label}
        </button>
      ))}
    </div>
  );
}











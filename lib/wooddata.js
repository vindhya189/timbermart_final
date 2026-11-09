// lib/woodData.js - ALL INDIA Wood Species + Cutting Sizes + Plywood - Category Wise
export const WOOD_CATEGORIES = [
  {
    category: "🌳 Premium Hardwood - Teak / Sal / Rosewood",
    species: [
      "Teak Wood - Sagwan", "Burma Teak - Original", "CP Teak - Central Province", "Nilambur Teak - Kerala",
      "Sal Wood - Sakhu", "Sheesham - Rosewood", "Rosewood - Sheesham Black", "Ebony - Karungali",
      "Mahogany - Mahagani", "Walnut - Akhrot", "Padouk - Padauk", "Wenge", "Iroko",
      "Karnataka Teak", "Assam Teak", "Godavari Teak", "Bastar Teak"
    ]
  },
  {
    category: "🌲 Softwood - Pine / Deodar / Cedar",
    species: [
      "Pine Wood - Chir Pine", "Deodar - Devadaru", "Cedar - Devdar", "Kail - Blue Pine",
      "Spruce", "Fir - Silver Fir", "Cypress", "Larch", "Hollong", "Hollock",
      "Silver Oak - Silver Oak", "Poplar - Populus", "Kadamba - Kadam", "Simul - Silk Cotton"
    ]
  },
  {
    category: "🌿 Plantation Wood - Eucalyptus / Subabul / Rubber",
    species: [
      "Eucalyptus - Nilagiri", "Subabul - Leucaena", "Acacia - Babool / Kikar", "Rubber Wood",
      "Casuarina - Casuarina", "Ailanthus - Ailanthus", "Melina - Gmelina", "Neem Wood - Vepa",
      "Mango Wood - Mamidi", "Tamarind - Chinta", "Jamun - Neredu", "Jackfruit - Panasa",
      "Coconut Wood - Kobbari", "Palm Wood - Thati", "Cashew Wood", "Sesbania - Agise"
    ]
  },
  {
    category: "🪵 North India - Sal / Shisham / Khair",
    species: [
      "Khair - Khair", "Babul - Babool", "Khejri", "Shisham - UP Shisham", "Siris - Siris",
      "Haldu - Haldu", "Kusum", "Asna", "Bijasal", "Dhaura", "Tendu - Tendu",
      "Saja - Saja", "Arjun - Arjuna", "Karanj", "Bamboo - Veduru"
    ]
  },
  {
    category: "🌴 South India - Rosewood / Sandal / Gurjan",
    species: [
      "Sandalwood - Chandan", "Red Sandal - Erra Chandan", "Gurjan - Gurjan", "Irul - Irul",
      "Venteak - Venteak", "Manjakadam - Manjakadam", "Thambakam - Thambakam", "Punna",
      "Aini - Aini", "Matti - Matti", "Nandi - Nandi", "Benteak - Benteak",
      "Anjili - Anjili", "Kongu - Kongu", "Pincoda - Pincoda", "Maruthu - Maruthu"
    ]
  },
  {
    category: "🌍 Exotic / Imported",
    species: [
      "American Walnut", "White Oak - American", "Red Oak - American", "Maple - Maple",
      "African Teak - Iroko", "Merbau", "Meranti - Red Meranti", "Nyatoh", "Keruing",
      "Balau - Balau", "Kapur - Kapur", "Okoume - Okoume", "Sapele - Sapele",
      "Zebra Wood", "Bubinga", "Purpleheart", "Jatoba", "Cumaru", "Tali"
    ]
  },
  {
    category: "🪑 Plywood / Boards / Veneer",
    species: [
      "Plywood - Commercial MR", "Plywood - BWR Waterproof", "Plywood - BWP Marine", "Plywood - Flexible / Flexi",
      "Plywood - Shuttering / Film Faced", "Block Board - Block Board", "MDF - Medium Density Fibre",
      "HDF - High Density Fibre", "Particle Board - Particle", "WPC Board - WPC",
      "CenturyPly - Sainik 710", "CenturyPly - Architect Ply", "Greenply - Green Club", "Greenply - Green Gold",
      "Kitply - Kitply Gold", "National Plywood", "Duroply", "Sarda Plywood", "Anchor Plywood",
      "Veneer - Teak Veneer", "Veneer - Walnut Veneer", "Veneer - Oak Veneer", "Laminate - Sunmica"
    ]
  },
  {
    category: "🎋 Bamboo / Cane / Others",
    species: [
      "Bamboo - Bambusa", "Cane - Cane / Rattan", "Betel Nut - Betel", "Areca - Areca",
      "Others - Others / Mix", "Mixed Wood - Mixed Lot", "Firewood - Firewood", "Charcoal Wood"
    ]
  }
];

// FLAT LIST FOR SEARCH / DROPDOWN
export const ALL_SPECIES = WOOD_CATEGORIES.flatMap(c => c.species);

export const CUTTING_CATEGORIES = [
  {
    category: "🚪 Door & Frame Sizes",
    sizes: [
      "Door Frame 4x2.5 inch", "Door Frame 5x2.5 inch", "Door Frame 4x3 inch", "Door Frame 6x2.5 inch",
      "Door Shutter 7x3 ft", "Door Shutter 7x2.5 ft", "Door Shutter 6.5x3 ft", "Door Shutter 7x4 ft - Double",
      "Window Frame 4x2.5 inch", "Window Frame 3x2.5 inch", "Ventilator Frame 2x2 ft", "Chowkat - Chowkat"
    ]
  },
  {
    category: "🪵 Planks / Palalu - 1 inch to 3 inch",
    sizes: [
      "Plank 1 inch - 1\" Thick", "Plank 1.5 inch", "Plank 2 inch", "Plank 2.5 inch", "Plank 3 inch",
      "Plank 4 inch Width", "Plank 6 inch Width", "Plank 8 inch Width", "Plank 10 inch Width", "Plank 12 inch Width",
      "Palalu 6 ft Length", "Palalu 7 ft Length", "Palalu 8 ft Length", "Palalu 10 ft Length", "Palalu 12 ft Length"
    ]
  },
  {
    category: "📏 Battens / Reepers / Runners",
    sizes: [
      "Batten 2x1 inch", "Batten 2x2 inch", "Batten 3x2 inch", "Batten 4x2 inch", "Batten 4x3 inch",
      "Reeper 2x1 inch", "Reeper 3x1 inch", "Runner 3x2 inch", "Runner 4x2 inch",
      "Patti 1x1 inch", "Patti 2x1 inch", "Square 2x2 inch", "Square 3x3 inch", "Square 4x4 inch"
    ]
  },
  {
    category: "🏗️ Beams / Joists / Sleepers - Heavy",
    sizes: [
      "Beam 4x4 inch", "Beam 4x6 inch", "Beam 6x6 inch", "Beam 6x8 inch", "Beam 8x8 inch",
      "Joist 4x3 inch", "Joist 5x3 inch", "Joist 6x4 inch", "Rafter 4x2 inch", "Purlin 4x3 inch",
      "Sleeper 8x6 ft - Railway", "Sleeper 5x4 ft", "Sleeper 6x5 ft", "Pole 10 ft", "Pole 12 ft", "Pole 15 ft", "Pole 20 ft"
    ]
  },
  {
    category: "🪑 Furniture Sizes - Table / Cot / Chair",
    sizes: [
      "Cot Frame 6x3 ft - Single", "Cot Frame 6x4 ft - Double", "Cot Frame 6x5 ft - King",
      "Table Top 3x2 ft", "Table Top 4x2 ft", "Table Top 6x3 ft", "Dining Table 5x3 ft",
      "Chair Leg 18 inch", "Chair Back 24 inch", "Sofa Frame 6 ft", "Wardrobe 6x3 ft", "Cupboard 6x4 ft"
    ]
  },
  {
    category: "🪟 Plywood Sizes - All India Standard",
    sizes: [
      "Plywood 8x4 ft - 6mm", "Plywood 8x4 ft - 9mm", "Plywood 8x4 ft - 12mm", "Plywood 8x4 ft - 16mm", "Plywood 8x4 ft - 18mm", "Plywood 8x4 ft - 25mm",
      "Plywood 7x3 ft - 12mm", "Plywood 7x4 ft - 18mm", "Plywood 6x4 ft - 12mm", "Plywood 6x3 ft - 9mm",
      "Block Board 8x4 ft - 19mm", "Block Board 7x3 ft - 19mm",
      "MDF 8x4 ft - 8mm", "MDF 8x4 ft - 12mm", "MDF 8x4 ft - 18mm", "MDF 8x4 ft - 25mm",
      "Particle Board 8x4 ft - 12mm", "Particle Board 8x4 ft - 18mm", "WPC 8x4 ft - 18mm", "WPC 8x4 ft - 25mm",
      "Flexi Plywood 8x4 ft - 6mm", "Flexi Plywood 8x4 ft - 9mm", "Shuttering Ply 8x4 ft - 12mm", "Shuttering Ply 8x4 ft - 18mm"
    ]
  },
  {
    category: "✂️ Custom / Mixed Cutting",
    sizes: [
      "Mixed Cut Sizes - Mixed", "Custom Size - As per Order", "Log Cutting - As per Requirement",
      "Sawn Sizes - Sawn", "Rough Sawn - Rough", "Dressed / Planed - Dressed", "Finger Joint - Finger Joint"
    ]
  }
];

export const ALL_CUT_SIZES = CUTTING_CATEGORIES.flatMap(c => c.sizes);

export const PLYWOOD_BRANDS = [
  "CenturyPly - Sainik 710 (BWP)", "CenturyPly - Architect Ply (BWR)", "CenturyPly - Club Prime",
  "Greenply - Green Club 700", "Greenply - Green Gold", "Greenply - Green Platinum",
  "Kitply - Kitply Gold", "Kitply - Kitply Vista", "National Plywood - National Gold",
  "Duroply - Duro Green", "Sarda - Sarda Gold", "Anchor - Anchor Gold",
  "Merino - Merino Ply", "Austin Plywood - Austin Gold", "Uniteply - Uniteply"
];

export const PLYWOOD_TYPES = [
  "MR - Moisture Resistant", "BWR - Boiling Water Resistant", "BWP - Boiling Water Proof / Marine",
  "Flexible Plywood - Bendable", "Film Faced Shuttering - Black Film", "Commercial Ply - General",
  "Calibrated Ply - Calibrated", "Gurjan Ply - Gurjan Face", "Teak Ply - Teak Face"
];
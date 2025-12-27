import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Plants.css';
import { CategoryFilter } from '../components/CategoryFilter';
import { NotificationContainer } from '../components/NotificationContainer';
import { DecorativeButterflies } from '../components/DecorativeButterflies';

type PlantCategory = 'all' | 'vegetable' | 'fruit' | 'flower' | 'medicinal' | 'accessories' | 'indoor' | 'other';

interface Plant {
  id: number;
  name: string;
  price: string;
  description: string;
  imageUrl: string;
  category: PlantCategory[];
  categoryID?: string | number; // ID from database
  isPopular?: boolean;
  quantity?: number;
}

export function Plants() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<PlantCategory>('all');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [favorites, setFavorites] = useState<number[]>(() => {
    const saved = localStorage.getItem('plantFavorites');
    return saved ? JSON.parse(saved) : [];
  });
  const [cartNotifications, setCartNotifications] = useState<Array<{ id: number; message: string }>>([]);
  const [favoriteNotifications, setFavoriteNotifications] = useState<Array<{ id: number; message: string }>>([]);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  // Fetch plants from Access database
  useEffect(() => {
    fetchPlants();
  }, []);

  // Handle cart notifications auto-dismiss
  useEffect(() => {
    if (cartNotifications.length > 0) {
      const timers = cartNotifications.map((notification) => {
        return setTimeout(() => {
          setCartNotifications((prev) => prev.filter((n) => n.id !== notification.id));
        }, 2000);
      });
      
      return () => {
        timers.forEach((timer) => clearTimeout(timer));
      };
    }
  }, [cartNotifications]);

  // Handle favorite notifications auto-dismiss
  useEffect(() => {
    if (favoriteNotifications.length > 0) {
      const timers = favoriteNotifications.map((notification) => {
        return setTimeout(() => {
          setFavoriteNotifications((prev) => prev.filter((n) => n.id !== notification.id));
        }, 3000); // 3 seconds
      });
      
      return () => {
        timers.forEach((timer) => clearTimeout(timer));
      };
    }
  }, [favoriteNotifications]);

  const fetchPlants = async () => {
    setLoading(true);
    try {
      // Try to get plants from Access database
      const tablesResponse = await fetch(`${API_BASE_URL}/db/info`);
      const tablesData = await tablesResponse.json();
      
      if (tablesData.success && tablesData.tables.length > 0) {
        // Try to find a plants table (common names: Plants, Plant, Products, Product)
        const plantTableNames = ['Plants', 'Plant', 'Products', 'Product', 'نباتات', 'منتجات'];
        let plantTable = null;
        
        for (const tableName of plantTableNames) {
          if (tablesData.tables.includes(tableName)) {
            plantTable = tableName;
            break;
          }
        }
        
        // If no exact match, use the first table
        if (!plantTable && tablesData.tables.length > 0) {
          plantTable = tablesData.tables[0];
        }
        
        if (plantTable) {
          const response = await fetch(`${API_BASE_URL}/db/table/${plantTable}`);
          const data = await response.json();
          
          if (data.success && data.data) {
            // Transform Access database data to Plant format
            const transformedPlants: Plant[] = data.data.map((item: any, index: number) => {
              // Include Picture field from Access DB
              const rawImageUrl = item.Picture || item.ImageURL || item.imageUrl || item.Image || item.image || item.Photo || item.photo || '';
              const priceValue = parseFloat(item.Price || item.price || item.Cost || item.cost || 0);
              const category = item.Category || item.category || item.Type || item.type || 'other';
              
              // Build full image URL - if it's just a filename, prepend the backend server URL
              let finalImageUrl = '';
              if (rawImageUrl && typeof rawImageUrl === 'string' && rawImageUrl.trim() !== '') {
                const trimmedUrl = rawImageUrl.trim();
                if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
                  finalImageUrl = `http://localhost:5000/images/${trimmedUrl}`;
                } else {
                  finalImageUrl = trimmedUrl;
                }
              }
              
              // Map category to PlantCategory array
              let categoryArray: PlantCategory[] = ['other'];
              if (typeof category === 'string') {
                const catLower = category.toLowerCase();
                if (catLower.includes('vegetable') || catLower.includes('خضار')) categoryArray = ['vegetable'];
                else if (catLower.includes('fruit') || catLower.includes('فاكهة')) categoryArray = ['fruit'];
                else if (catLower.includes('flower') || catLower.includes('زهرة')) categoryArray = ['flower'];
                else if (catLower.includes('medicinal') || catLower.includes('طبي')) categoryArray = ['medicinal'];
                else if (catLower.includes('indoor') || catLower.includes('داخلي')) categoryArray = ['indoor'];
                else if (catLower.includes('accessory') || catLower.includes('اكسسوار')) categoryArray = ['accessories'];
              }
              
              return {
                id: item.ID || item.id || item.PlantID || item.Plant_ID || (index + 1),
                name: item.Name || item.name || item.PlantName || item.Plant_Name || 'Unknown',
                price: `₪${priceValue.toFixed(2)}`,
                description: item.Description || item.description || item.Desc || item.desc || '',
                imageUrl: finalImageUrl,
                category: categoryArray,
                categoryID: item.CategoryID || item.categoryID || item.Category_ID || null, // Store CategoryID from database
                isPopular: item.IsPopular || item.isPopular || item.Popular || false,
                quantity: item.Quantity || item.quantity || item.Stock || item.stock || 0
              };
            });
            setPlants(transformedPlants);
          } else {
            throw new Error('Failed to fetch plants from database');
          }
        } else {
          throw new Error('No plants table found in database');
        }
      } else {
        // Fallback to mock data if database connection fails
        console.warn('Database connection failed, using mock data');
        setPlants([
    {
      id: 1,
      name: 'Olive Seedling',
      price: '₪15',
      description: 'Perfect for home gardens and larger balconies. A symbol of peace and prosperity.',
      imageUrl: 'https://cdn.pixabay.com/photo/2022/09/29/09/35/olive-7486982_1280.jpg',
      category: ['vegetable'],
      isPopular: true,
    },
    {
      id: 2,
      name: 'Tomato Seedling',
      price: '₪8',
      description: 'High yield and great fresh flavor for daily use. Perfect for vegetable gardens.',
      imageUrl: 'https://www.yates.com.au/media/plants/vegetable/pr-tn-vege-tomato-2.jpg',
      category: ['vegetable'],
      isPopular: true,
    },
    {
      id: 3,
      name: 'Cucumber Seedling',
      price: '₪9',
      description: 'Popular vegetable for greenhouses and home gardens. Easy to grow and maintain.',
      imageUrl: 'https://www.ohsnapcupcakes.com/wp-content/uploads/2023/02/Pickle-vs-Cucumber-1-768x538.png',
      category: ['vegetable'],
    },
    {
      id: 4,
      name: 'Hot Pepper Seedling',
      price: '₪7',
      description: 'Ideal for lovers of strong and spicy flavors. Adds heat to your dishes.',
      imageUrl: 'https://www.chilipeppermadness.com/wp-content/uploads/2013/09/Birds-Eye-Peppers.jpg',
      category: ['vegetable'],
    },
    {
      id: 5,
      name: 'Lettuce Seedling',
      price: '₪6',
      description: 'Fast-growing leafy vegetable for fresh salads. Great for beginners.',
      imageUrl: 'https://th.bing.com/th/id/R.9d16c0fa0abdab2ce042128bd7716802?rik=RASxxJad9VXKmg&riu=http%3a%2f%2fnaturebring.com%2fwp-content%2fuploads%2f2017%2f10%2fLettuce-nb-03.jpg&ehk=3a5ZHwGQzGIFlDXbmj%2fsTfk6SFkuTwu2V70Ur1hCG9Q%3d&risl=&pid=ImgRaw&r=0',
      category: ['vegetable'],
    },
    {
      id: 6,
      name: 'Strawberry Seedling',
      price: '₪12',
      description: 'Sweet fruits loved across Palestine, perfect in pots or beds. Delicious and nutritious.',
      imageUrl: 'https://th.bing.com/th/id/OIP.7KZqxNgIMhm6DuwOGeza2gHaHa?w=187&h=187&c=7&r=0&o=7&cb=ucfimg2&dpr=1.3&pid=1.7&rm=3&ucfimg=1',
      category: ['fruit'],
      isPopular: true,
    },
    {
      id: 7,
      name: 'Grape Vine Seedling',
      price: '₪20',
      description: 'Classic vine for shaded terraces and fresh grapes. Beautiful and productive.',
      imageUrl: 'https://th.bing.com/th/id/OIP.LdUdWiPRe_fNsIAZKqnkTgHaJ4?w=147&h=196&c=7&r=0&o=7&cb=ucfimg2&dpr=1.3&pid=1.7&rm=3&ucfimg=1',
      category: ['fruit'],
    },
    {
      id: 8,
      name: 'Fig Tree Seedling',
      price: '₪22',
      description: 'Beloved fruit tree well-suited to the local climate. Produces delicious fruits.',
      imageUrl: 'https://th.bing.com/th/id/OIP.nEyLGBXu1s6Zn1poYBTcJgHaFi?w=306&h=183&c=7&r=0&o=7&cb=ucfimg2&dpr=1.3&pid=1.7&rm=3&ucfimg=1',
      category: ['fruit'],
    },
    {
      id: 9,
      name: 'Thyme Seedling',
      price: '₪10',
      description: 'Traditional Palestinian herb used for zaatar mixes. Aromatic and flavorful.',
      imageUrl: 'data:image/webp;base64,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',
      category: ['medicinal'],
    },
    {
      id: 10,
      name: 'Mint Seedling',
      price: '₪5',
      description: 'Great for refreshing drinks and decoration. Easy to grow indoors or outdoors.',
      imageUrl: 'https://th.bing.com/th/id/OIP.kGXM3ovnKfaOfc2p8qCZPQHaE7?w=264&h=180&c=7&r=0&o=7&cb=ucfimg2&dpr=1.3&pid=1.7&rm=3&ucfimg=1',
      category: ['medicinal'],
    },
    {
      id: 11,
      name: 'Basil Seedling',
      price: '₪6',
      description: 'Aromatic leaves, perfect for Mediterranean dishes. Essential kitchen herb.',
      imageUrl: 'https://th.bing.com/th/id/OIP.1b0XZfoPTkdkDXcJnP10vwHaHa?w=182&h=182&c=7&r=0&o=7&cb=ucfimg2&dpr=1.3&pid=1.7&rm=3&ucfimg=1',
      category: ['medicinal'],
    },
    {
      id: 12,
      name: 'Damask Rose Seedling',
      price: '₪18',
      description: 'Colorful flowers that add beauty to any space. Fragrant and elegant.',
      imageUrl: 'https://tse4.mm.bing.net/th/id/OIP.NoAulbl-v_xyvd0BlWY6cQHaFj?cb=ucfimg2&ucfimg=1&rs=1&pid=ImgDetMain&o=7&rm=3',
      category: ['flower'],
    },
    {
      id: 13,
      name: 'Jasmine Flower Seedling',
      price: '₪14',
      description: 'Fragrant climbing flower widely planted in Palestinian homes. Beautiful scent.',
      imageUrl: 'https://tse4.mm.bing.net/th/id/OIP.Ox6GW2biWAEsSTJpLt36SgHaE7?cb=ucfimg2&ucfimg=1&rs=1&pid=ImgDetMain&o=7&rm=3',
      category: ['flower'],
      isPopular: true,
    },
    {
      id: 14,
      name: 'Geranium Flower Seedling',
      price: '₪11',
      description: 'Colorful balcony flower that blooms for a long season. Low maintenance.',
      imageUrl: 'https://tse1.mm.bing.net/th/id/OIP.1PZJ5JLmIVuQygGt3pXD-gHaE6?cb=ucfimg2&ucfimg=1&rs=1&pid=ImgDetMain&o=7&rm=3',
      category: ['flower'],
    },
    {
      id: 15,
      name: 'Snake Plant',
      price: '₪25',
      description: 'Perfect indoor plant that purifies air and requires minimal care. Great for beginners.',
      imageUrl: 'https://th.bing.com/th/id/OIP.9FMqHdPgXAiCUnlzDM9ffQHaJQ?w=153&h=192&c=7&r=0&o=7&cb=ucfimg2&dpr=1.3&pid=1.7&rm=3&ucfimg=1',
      category: ['flower', 'indoor'],
      isPopular: true,
    },
    {
      id: 16,
      name: 'Spider Plant',
      price: '₪12',
      description: 'Easy-to-grow indoor plant that removes toxins from air. Perfect for hanging baskets.',
      imageUrl: 'https://th.bing.com/th/id/OIP.DKt6LocUW758p0BGRpJ-TgHaFj?w=245&h=184&c=7&r=0&o=7&cb=ucfimg2&dpr=1.3&pid=1.7&rm=3&ucfimg=1',
      category: ['flower', 'indoor'],
    },
    {
      id: 17,
      name: 'Aloe Vera',
      price: '₪15',
      description: 'Medicinal plant with healing properties. Great for skin care and indoor decoration.',
      imageUrl: 'https://th.bing.com/th/id/OIP.JixMBL_ZOkj6RcZD-lN0bwHaEK?w=304&h=180&c=7&r=0&o=7&cb=ucfimg2&dpr=1.3&pid=1.7&rm=3&ucfimg=1',
      category: ['medicinal', 'indoor'],
      isPopular: true,
    },
    {
      id: 18,
      name: 'Lavender',
      price: '₪16',
      description: 'Aromatic herb with calming properties. Beautiful purple flowers and soothing scent.',
      imageUrl: 'https://th.bing.com/th/id/OIP.G5yWPvCWfKzshQBAB8cehQHaD4?w=342&h=180&c=7&r=0&o=7&cb=ucfimg2&dpr=1.3&pid=1.7&rm=3&ucfimg=1',
      category: ['medicinal'],
    },
    {
      id: 19,
      name: 'Rose Flower',
      price: '₪20',
      description: 'Beautiful and elegant flower, symbol of love and beauty. Perfect for gardens and decoration.',
      imageUrl: 'https://cdn.pixabay.com/photo/2021/08/08/01/32/flower-6529708_640.jpg',
      category: ['flower'],
      isPopular: true,
    },
    {
      id: 20,
      name: 'Lemon Tree',
      price: '₪25',
      description: 'Fruitful tree that produces fresh lemons. Perfect for gardens and provides fresh citrus fruits.',
      imageUrl: 'https://tse1.mm.bing.net/th/id/OIP.tk_lsnJraAULhyM_xN8FRAHaE8?cb=ucfimg2&ucfimg=1&rs=1&pid=ImgDetMain&o=7&rm=3',
      category: ['vegetable'],
      isPopular: true,
    },
    {
      id: 21,
      name: 'Orange Tree',
      price: '₪25',
      description: 'Beautiful citrus tree that produces fresh oranges. Perfect for gardens and provides delicious fruits.',
      imageUrl: 'https://minnetonkaorchards.com/wp-content/uploads/2022/05/Oranges-on-Tree-SS-1349805650-640x424.jpg',
      category: ['fruit'],
      isPopular: true,
    },
    {
      id: 22,
      name: 'Bell Pepper',
      price: '₪15',
      description: 'Colorful and nutritious bell peppers. Available in various colors, perfect for cooking and salads.',
      imageUrl: 'https://www.almanac.com/sites/default/files/image_nodes/bell-peppers-assorted-crop.jpg',
      category: ['vegetable'],
      isPopular: true,
    },
    {
      id: 23,
      name: 'Eggplant',
      price: '₪12',
      description: 'Versatile vegetable with rich flavor. Perfect for cooking various dishes and Mediterranean cuisine.',
      imageUrl: 'https://img.freepik.com/premium-photo/eggplant-plant-with-green-leaves_1209326-155126.jpg',
      category: ['vegetable'],
      isPopular: true,
    },
    {
      id: 24,
      name: 'Zucchini',
      price: '₪10',
      description: 'Fresh and nutritious summer squash. Perfect for grilling, sautéing, and adding to various dishes.',
      imageUrl: 'https://tse1.mm.bing.net/th/id/OIP.fecfLiQmWbLT3ERBccN4-wHaHa?cb=ucfimg2&ucfimg=1&rs=1&pid=ImgDetMain&o=7&rm=3',
      category: ['vegetable'],
      isPopular: true,
    },
    {
      id: 25,
      name: 'Cabbage',
      price: '₪10',
      description: 'Nutritious leafy vegetable perfect for salads, coleslaw, and cooking. Rich in vitamins and easy to grow.',
      imageUrl: 'https://www.epicgardening.com/wp-content/uploads/2024/06/Cabbage-swings-in-the-beds-in-natural-conditions-1536x864.jpg',
      category: ['vegetable'],
      isPopular: true,
    },
    {
      id: 26,
      name: 'Cauliflower',
      price: '₪12',
      description: 'Versatile and nutritious vegetable. Perfect for roasting, steaming, and making healthy dishes. Rich in vitamins and fiber.',
      imageUrl: 'https://th.bing.com/th/id/R.67670747a5df1963f2abdc4485c06b9b?rik=jg0DG80j7iElrg&pid=ImgRaw&r=0',
      category: ['vegetable'],
      isPopular: true,
    },
    {
      id: 27,
      name: 'Spinach',
      price: '₪8',
      description: 'Nutritious leafy green vegetable rich in iron and vitamins. Perfect for salads, smoothies, and cooking. Easy to grow and harvest.',
      imageUrl: 'https://veggieharvest.com/wp-content/uploads/2020/11/spinach-1170x780.jpg',
      category: ['vegetable'],
      isPopular: true,
    },
    {
      id: 28,
      name: 'Coriander',
      price: '₪7',
      description: 'Fresh and aromatic herb essential for Middle Eastern cuisine. Perfect for garnishing dishes and adding flavor to salads and soups.',
      imageUrl: 'https://tse4.mm.bing.net/th/id/OIP.olmDpdepVdq9Xm868nn3CgHaEH?cb=ucfimg2&ucfimg=1&w=900&h=500&rs=1&pid=ImgDetMain&o=7&rm=3',
      category: ['medicinal'],
      isPopular: true,
    },
    {
      id: 29,
      name: 'Rosemary',
      price: '₪10',
      description: 'Aromatic evergreen herb with needle-like leaves. Perfect for cooking, aromatherapy, and garden decoration. Known for its distinct fragrance and culinary uses.',
      imageUrl: 'https://m.media-amazon.com/images/I/81VHJygX6ML._AC_SL1500_.jpg',
      category: ['medicinal'],
      isPopular: true,
    },
    {
      id: 30,
      name: 'Sage',
      price: '₪10',
      description: 'Aromatic herb with soft, gray-green leaves. Perfect for cooking, especially in Mediterranean dishes. Known for its earthy flavor and medicinal properties.',
      imageUrl: 'https://seedsnpots.com/wp-content/uploads/2017/10/sage1.jpg',
      category: ['medicinal'],
      isPopular: true,
    },
    {
      id: 31,
      name: 'Parsley',
      price: '₪7',
      description: 'Fresh and versatile herb essential for cooking and garnishing. Rich in vitamins and perfect for adding flavor to various dishes, salads, and soups.',
      imageUrl: 'https://th.bing.com/th/id/R.a0fefc0161516b2dc8765787be3cac0e?rik=CU84nY0oZpYQLg&pid=ImgRaw&r=0',
      category: ['medicinal'],
      isPopular: true,
    },
    {
      id: 32,
      name: 'Almond Tree',
      price: '₪25',
      description: 'Beautiful flowering tree that produces delicious almonds. Perfect for gardens and provides both ornamental beauty and nutritious fruits. Well-suited to Mediterranean climate.',
      imageUrl: 'https://www.garden.eco/wp-content/uploads/2018/03/almond-tree-zone.jpg',
      category: ['fruit'],
      isPopular: true,
    },
    {
      id: 33,
      name: 'Pomegranate Tree',
      price: '₪25',
      description: 'Beautiful fruit tree that produces delicious pomegranates. Perfect for gardens and provides both ornamental beauty and nutritious fruits. Well-suited to Mediterranean climate.',
      imageUrl: 'https://tse3.mm.bing.net/th/id/OIP.nqadO_TR_y923Uq9VqTMXAHaGZ?cb=ucfimg2&ucfimg=1&rs=1&pid=ImgDetMain&o=7&rm=3',
      category: ['fruit'],
      isPopular: true,
    },
    {
      id: 34,
      name: 'Apricot Tree',
      price: '₪25',
      description: 'Beautiful fruit tree that produces delicious apricots. Perfect for gardens and provides both ornamental beauty and nutritious fruits. Well-suited to Mediterranean climate.',
      imageUrl: 'https://cdn.mos.cms.futurecdn.net/V52UA8XaXc9YxWs2nHy6Ea-1280-80.jpg',
      category: ['fruit'],
      isPopular: true,
    },
    {
      id: 35,
      name: 'Oleander Flower',
      price: '₪18',
      description: 'Beautiful flowering shrub with vibrant blooms. Perfect for gardens and outdoor spaces. Known for its colorful flowers and ornamental beauty. Well-suited to Mediterranean climate.',
      imageUrl: 'https://th.bing.com/th/id/R.0b9b3c36143fe0ffa6af9b8ad67f2df0?rik=MCR9XayJUuPkpg&riu=http%3a%2f%2f4.bp.blogspot.com%2f-dm8Xq7bRxI8%2fUzWkjC61iwI%2fAAAAAAABBRk%2fjK9F2ar5AHQ%2fs1600%2fNerium%2bOleander%2b7.jpg&ehk=T6n1yNar%2fkt23AtRCpfIJ2jMD6tDC16KneQk3ifYdMs%3d&risl=&pid=ImgRaw&r=0',
      category: ['flower'],
      isPopular: true,
    },
    {
      id: 36,
      name: 'Petunia Flower',
      price: '₪13',
      description: 'Vibrant and colorful annual flowers, perfect for hanging baskets, containers, and garden beds. Known for their profuse blooms and delightful fragrance.',
      imageUrl: 'https://www.gardencrossings.com/wp-content/uploads/2022/12/petunia_supertunia_persimmon_petunia_gc_suppe_05.jpg',
      category: ['flower'],
      isPopular: true,
    },
    {
      id: 37,
      name: 'Watermelon',
      price: '₪15',
      description: 'Sweet and refreshing summer fruit, perfect for hot weather. Easy to grow in warm climates and produces large, juicy fruits. Great for gardens and outdoor spaces.',
      imageUrl: 'https://i.pinimg.com/originals/ac/2d/78/ac2d786b65fd554c514cd0fd98037cff.jpg',
      category: ['fruit'],
      isPopular: true,
    },
    {
      id: 38,
      name: 'Melon',
      price: '₪14',
      description: 'Delicious and sweet melon variety, perfect for summer. Easy to grow in warm climates and produces fragrant, juicy fruits. Great for gardens and outdoor spaces.',
      imageUrl: 'https://a-z-animals.com/media/2022/06/cantaloupe.jpg',
      category: ['fruit'],
      isPopular: true,
    },
    {
      id: 39,
      name: 'Apple Tree',
      price: '₪25',
      description: 'Beautiful fruit tree that produces delicious apples. Perfect for gardens and provides both ornamental beauty and nutritious fruits. Well-suited to Mediterranean climate.',
      imageUrl: 'https://www.grasshoppergardens.com/wp-content/uploads/2022/10/shutterstock_1508722937-1200x800.jpg',
      category: ['fruit'],
      isPopular: true,
    },
    {
      id: 40,
      name: 'Chamomile',
      price: '₪12',
      description: 'Calming and aromatic herb with delicate white flowers. Known for its soothing properties and used in teas. Easy to grow and perfect for gardens.',
      imageUrl: 'https://a-z-animals.com/media/2022/09/shutterstock_2053752875.jpg',
      category: ['medicinal', 'flower'],
      isPopular: true,
    },
    {
      id: 41,
      name: 'Pothos Plant',
      price: '₪18',
      description: 'Beautiful and easy-to-care-for indoor plant. Perfect for beginners, purifies air and adds greenery to any space. Low maintenance and fast-growing.',
      imageUrl: 'https://i1.wp.com/floresdelivery.com.br/wp-content/uploads/2017/05/fotos-floricutura-36.jpg?resize=768%2C767&ssl=1',
      category: ['flower', 'indoor'],
      isPopular: true,
    },
    {
      id: 42,
      name: 'Decorative Pebbles',
      price: '₪12',
      description: 'Beautiful decorative pebbles perfect for garden decoration, potted plants, and landscaping. Adds aesthetic appeal to any garden or indoor plant arrangement.',
      imageUrl: 'https://th.bing.com/th/id/R.0fa72d8932ae8e81ff4d9a7639dba2f9?rik=rzkutBB94xpMxA&pid=ImgRaw&r=0',
      category: ['accessories'],
      isPopular: true,
    },
    {
      id: 43,
      name: 'Mini Garden Lights',
      price: '₪25',
      description: 'Beautiful mini garden lights perfect for outdoor decoration and creating a magical atmosphere in your garden. Weather-resistant and energy-efficient lighting solution.',
      imageUrl: 'https://m.media-amazon.com/images/I/51-Nr1nlbML._AC_.jpg',
      category: ['accessories'],
      isPopular: true,
    },
    {
      id: 44,
      name: 'Butterflies',
      price: '₪15',
      description: 'Colorful decorative butterflies perfect for garden decoration. Adds beauty and a natural touch to your plants and garden spaces. Vibrant colors that enhance any outdoor or indoor plant arrangement.',
      imageUrl: 'https://factorydirectcraft.com/mpix/osc_products/20150601111438-392314.jpg',
      category: ['accessories'],
      isPopular: true,
    },
    {
      id: 45,
      name: 'Ladybug Decoration',
      price: '₪18',
      description: 'Charming decorative ladybugs perfect for garden decoration. Adds a playful and natural touch to your plants and garden spaces. Beautiful design that enhances any outdoor or indoor plant arrangement.',
      imageUrl: 'https://i.pinimg.com/originals/b7/aa/26/b7aa2642503c8143b3a6c179c1a93ca2.jpg',
      category: ['accessories'],
      isPopular: true,
    },
    {
      id: 46,
      name: 'Decorative Birds',
      price: '₪20',
      description: 'Beautiful decorative birds perfect for garden decoration. Adds elegance and a natural touch to your plants and garden spaces. Stunning design that enhances any outdoor or indoor plant arrangement.',
      imageUrl: 'https://ae01.alicdn.com/kf/S781de9ddbea24303ab3100c49ea9adfek.jpg',
      category: ['accessories'],
      isPopular: true,
    },
    {
      id: 47,
      name: 'ZZ Plant',
      price: '₪22',
      description: 'Extremely low-maintenance indoor plant with glossy, dark green leaves. Perfect for beginners and low-light conditions. Known for its ability to thrive with minimal care and purify indoor air.',
      imageUrl: 'https://glasswingshop.com/cdn/shop/products/8D2A2069_2048x2048.jpg?v=1595400475',
      category: ['indoor'],
      isPopular: true,
    },
        ]);
      }
    } catch (error) {
      console.error('Error fetching plants:', error);
      // Fallback to mock data on error
      setPlants([
    {
      id: 1,
      name: 'Olive Seedling',
      price: '₪15',
      description: 'Perfect for home gardens and larger balconies. A symbol of peace and prosperity.',
      imageUrl: 'https://cdn.pixabay.com/photo/2022/09/29/09/35/olive-7486982_1280.jpg',
      category: ['vegetable'],
      isPopular: true,
    },
    {
      id: 2,
      name: 'Tomato Seedling',
      price: '₪8',
      description: 'High yield and great fresh flavor for daily use. Perfect for vegetable gardens.',
      imageUrl: 'https://www.yates.com.au/media/plants/vegetable/pr-tn-vege-tomato-2.jpg',
      category: ['vegetable'],
      isPopular: true,
    },
    {
      id: 3,
      name: 'Cucumber Seedling',
      price: '₪9',
      description: 'Popular vegetable for greenhouses and home gardens. Easy to grow and maintain.',
      imageUrl: 'https://www.ohsnapcupcakes.com/wp-content/uploads/2023/02/Pickle-vs-Cucumber-1-768x538.png',
      category: ['vegetable'],
    },
    {
      id: 4,
      name: 'Hot Pepper Seedling',
      price: '₪7',
      description: 'Ideal for lovers of strong and spicy flavors. Adds heat to your dishes.',
      imageUrl: 'https://www.chilipeppermadness.com/wp-content/uploads/2013/09/Birds-Eye-Peppers.jpg',
      category: ['vegetable'],
    },
    {
      id: 5,
      name: 'Lettuce Seedling',
      price: '₪6',
      description: 'Fast-growing leafy vegetable for fresh salads. Great for beginners.',
      imageUrl: 'https://th.bing.com/th/id/R.9d16c0fa0abdab2ce042128bd7716802?rik=RASxxJad9VXKmg&riu=http%3a%2f%2fnaturebring.com%2fwp-content%2fuploads%2f2017%2f10%2fLettuce-nb-03.jpg&ehk=3a5ZHwGQzGIFlDXbmj%2fsTfk6SFkuTwu2V70Ur1hCG9Q%3d&risl=&pid=ImgRaw&r=0',
      category: ['vegetable'],
    },
    {
      id: 6,
      name: 'Strawberry Seedling',
      price: '₪12',
      description: 'Sweet fruits loved across Palestine, perfect in pots or beds. Delicious and nutritious.',
      imageUrl: 'https://th.bing.com/th/id/OIP.7KZqxNgIMhm6DuwOGeza2gHaHa?w=187&h=187&c=7&r=0&o=7&cb=ucfimg2&dpr=1.3&pid=1.7&rm=3&ucfimg=1',
      category: ['fruit'],
      isPopular: true,
    },
    {
      id: 7,
      name: 'Grape Vine Seedling',
      price: '₪20',
      description: 'Classic vine for shaded terraces and fresh grapes. Beautiful and productive.',
      imageUrl: 'https://th.bing.com/th/id/OIP.LdUdWiPRe_fNsIAZKqnkTgHaJ4?w=147&h=196&c=7&r=0&o=7&cb=ucfimg2&dpr=1.3&pid=1.7&rm=3&ucfimg=1',
      category: ['fruit'],
    },
    {
      id: 8,
      name: 'Fig Tree Seedling',
      price: '₪22',
      description: 'Beloved fruit tree well-suited to the local climate. Produces delicious fruits.',
      imageUrl: 'https://th.bing.com/th/id/OIP.nEyLGBXu1s6Zn1poYBTcJgHaFi?w=306&h=183&c=7&r=0&o=7&cb=ucfimg2&dpr=1.3&pid=1.7&rm=3&ucfimg=1',
      category: ['fruit'],
    },
    {
      id: 9,
      name: 'Thyme Seedling',
      price: '₪10',
      description: 'Traditional Palestinian herb used for zaatar mixes. Aromatic and flavorful.',
      imageUrl: 'data:image/webp;base64,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',
      category: ['medicinal'],
    },
    {
      id: 10,
      name: 'Mint Seedling',
      price: '₪5',
      description: 'Great for refreshing drinks and decoration. Easy to grow indoors or outdoors.',
      imageUrl: 'https://th.bing.com/th/id/OIP.kGXM3ovnKfaOfc2p8qCZPQHaE7?w=264&h=180&c=7&r=0&o=7&cb=ucfimg2&dpr=1.3&pid=1.7&rm=3&ucfimg=1',
      category: ['medicinal'],
    },
    {
      id: 11,
      name: 'Basil Seedling',
      price: '₪6',
      description: 'Aromatic leaves, perfect for Mediterranean dishes. Essential kitchen herb.',
      imageUrl: 'https://th.bing.com/th/id/OIP.1b0XZfoPTkdkDXcJnP10vwHaHa?w=182&h=182&c=7&r=0&o=7&cb=ucfimg2&dpr=1.3&pid=1.7&rm=3&ucfimg=1',
      category: ['medicinal'],
    },
    {
      id: 12,
      name: 'Damask Rose Seedling',
      price: '₪18',
      description: 'Colorful flowers that add beauty to any space. Fragrant and elegant.',
      imageUrl: 'https://tse4.mm.bing.net/th/id/OIP.NoAulbl-v_xyvd0BlWY6cQHaFj?cb=ucfimg2&ucfimg=1&rs=1&pid=ImgDetMain&o=7&rm=3',
      category: ['flower'],
    },
    {
      id: 13,
      name: 'Jasmine Flower Seedling',
      price: '₪14',
      description: 'Fragrant climbing flower widely planted in Palestinian homes. Beautiful scent.',
      imageUrl: 'https://tse4.mm.bing.net/th/id/OIP.Ox6GW2biWAEsSTJpLt36SgHaE7?cb=ucfimg2&ucfimg=1&rs=1&pid=ImgDetMain&o=7&rm=3',
      category: ['flower'],
      isPopular: true,
    },
    {
      id: 14,
      name: 'Geranium Flower Seedling',
      price: '₪11',
      description: 'Colorful balcony flower that blooms for a long season. Low maintenance.',
      imageUrl: 'https://tse1.mm.bing.net/th/id/OIP.1PZJ5JLmIVuQygGt3pXD-gHaE6?cb=ucfimg2&ucfimg=1&rs=1&pid=ImgDetMain&o=7&rm=3',
      category: ['flower'],
    },
    {
      id: 15,
      name: 'Snake Plant',
      price: '₪25',
      description: 'Perfect indoor plant that purifies air and requires minimal care. Great for beginners.',
      imageUrl: 'https://th.bing.com/th/id/OIP.9FMqHdPgXAiCUnlzDM9ffQHaJQ?w=153&h=192&c=7&r=0&o=7&cb=ucfimg2&dpr=1.3&pid=1.7&rm=3&ucfimg=1',
      category: ['flower', 'indoor'],
      isPopular: true,
    },
    {
      id: 16,
      name: 'Spider Plant',
      price: '₪12',
      description: 'Easy-to-grow indoor plant that removes toxins from air. Perfect for hanging baskets.',
      imageUrl: 'https://th.bing.com/th/id/OIP.DKt6LocUW758p0BGRpJ-TgHaFj?w=245&h=184&c=7&r=0&o=7&cb=ucfimg2&dpr=1.3&pid=1.7&rm=3&ucfimg=1',
      category: ['flower', 'indoor'],
    },
    {
      id: 17,
      name: 'Aloe Vera',
      price: '₪15',
      description: 'Medicinal plant with healing properties. Great for skin care and indoor decoration.',
      imageUrl: 'https://th.bing.com/th/id/OIP.JixMBL_ZOkj6RcZD-lN0bwHaEK?w=304&h=180&c=7&r=0&o=7&cb=ucfimg2&dpr=1.3&pid=1.7&rm=3&ucfimg=1',
      category: ['medicinal', 'indoor'],
      isPopular: true,
    },
    {
      id: 18,
      name: 'Lavender',
      price: '₪16',
      description: 'Aromatic herb with calming properties. Beautiful purple flowers and soothing scent.',
      imageUrl: 'https://th.bing.com/th/id/OIP.G5yWPvCWfKzshQBAB8cehQHaD4?w=342&h=180&c=7&r=0&o=7&cb=ucfimg2&dpr=1.3&pid=1.7&rm=3&ucfimg=1',
      category: ['medicinal'],
    },
    {
      id: 19,
      name: 'Rose Flower',
      price: '₪20',
      description: 'Beautiful and elegant flower, symbol of love and beauty. Perfect for gardens and decoration.',
      imageUrl: 'https://cdn.pixabay.com/photo/2021/08/08/01/32/flower-6529708_640.jpg',
      category: ['flower'],
      isPopular: true,
    },
    {
      id: 20,
      name: 'Lemon Tree',
      price: '₪25',
      description: 'Fruitful tree that produces fresh lemons. Perfect for gardens and provides fresh citrus fruits.',
      imageUrl: 'https://tse1.mm.bing.net/th/id/OIP.tk_lsnJraAULhyM_xN8FRAHaE8?cb=ucfimg2&ucfimg=1&rs=1&pid=ImgDetMain&o=7&rm=3',
      category: ['vegetable'],
      isPopular: true,
    },
    {
      id: 21,
      name: 'Orange Tree',
      price: '₪25',
      description: 'Beautiful citrus tree that produces fresh oranges. Perfect for gardens and provides delicious fruits.',
      imageUrl: 'https://minnetonkaorchards.com/wp-content/uploads/2022/05/Oranges-on-Tree-SS-1349805650-640x424.jpg',
      category: ['fruit'],
      isPopular: true,
    },
    {
      id: 22,
      name: 'Bell Pepper',
      price: '₪15',
      description: 'Colorful and nutritious bell peppers. Available in various colors, perfect for cooking and salads.',
      imageUrl: 'https://www.almanac.com/sites/default/files/image_nodes/bell-peppers-assorted-crop.jpg',
      category: ['vegetable'],
      isPopular: true,
    },
    {
      id: 23,
      name: 'Eggplant',
      price: '₪12',
      description: 'Versatile vegetable with rich flavor. Perfect for cooking various dishes and Mediterranean cuisine.',
      imageUrl: 'https://img.freepik.com/premium-photo/eggplant-plant-with-green-leaves_1209326-155126.jpg',
      category: ['vegetable'],
      isPopular: true,
    },
    {
      id: 24,
      name: 'Zucchini',
      price: '₪10',
      description: 'Fresh and nutritious summer squash. Perfect for grilling, sautéing, and adding to various dishes.',
      imageUrl: 'https://tse1.mm.bing.net/th/id/OIP.fecfLiQmWbLT3ERBccN4-wHaHa?cb=ucfimg2&ucfimg=1&rs=1&pid=ImgDetMain&o=7&rm=3',
      category: ['vegetable'],
      isPopular: true,
    },
    {
      id: 25,
      name: 'Cabbage',
      price: '₪10',
      description: 'Nutritious leafy vegetable perfect for salads, coleslaw, and cooking. Rich in vitamins and easy to grow.',
      imageUrl: 'https://www.epicgardening.com/wp-content/uploads/2024/06/Cabbage-swings-in-the-beds-in-natural-conditions-1536x864.jpg',
      category: ['vegetable'],
      isPopular: true,
    },
    {
      id: 26,
      name: 'Cauliflower',
      price: '₪12',
      description: 'Versatile and nutritious vegetable. Perfect for roasting, steaming, and making healthy dishes. Rich in vitamins and fiber.',
      imageUrl: 'https://th.bing.com/th/id/R.67670747a5df1963f2abdc4485c06b9b?rik=jg0DG80j7iElrg&pid=ImgRaw&r=0',
      category: ['vegetable'],
      isPopular: true,
    },
    {
      id: 27,
      name: 'Spinach',
      price: '₪8',
      description: 'Nutritious leafy green vegetable rich in iron and vitamins. Perfect for salads, smoothies, and cooking. Easy to grow and harvest.',
      imageUrl: 'https://veggieharvest.com/wp-content/uploads/2020/11/spinach-1170x780.jpg',
      category: ['vegetable'],
      isPopular: true,
    },
    {
      id: 28,
      name: 'Coriander',
      price: '₪7',
      description: 'Fresh and aromatic herb essential for Middle Eastern cuisine. Perfect for garnishing dishes and adding flavor to salads and soups.',
      imageUrl: 'https://tse4.mm.bing.net/th/id/OIP.olmDpdepVdq9Xm868nn3CgHaEH?cb=ucfimg2&ucfimg=1&w=900&h=500&rs=1&pid=ImgDetMain&o=7&rm=3',
      category: ['medicinal'],
      isPopular: true,
    },
    {
      id: 29,
      name: 'Rosemary',
      price: '₪10',
      description: 'Aromatic evergreen herb with needle-like leaves. Perfect for cooking, aromatherapy, and garden decoration. Known for its distinct fragrance and culinary uses.',
      imageUrl: 'https://m.media-amazon.com/images/I/81VHJygX6ML._AC_SL1500_.jpg',
      category: ['medicinal'],
      isPopular: true,
    },
    {
      id: 30,
      name: 'Sage',
      price: '₪10',
      description: 'Aromatic herb with soft, gray-green leaves. Perfect for cooking, especially in Mediterranean dishes. Known for its earthy flavor and medicinal properties.',
      imageUrl: 'https://seedsnpots.com/wp-content/uploads/2017/10/sage1.jpg',
      category: ['medicinal'],
      isPopular: true,
    },
    {
      id: 31,
      name: 'Parsley',
      price: '₪7',
      description: 'Fresh and versatile herb essential for cooking and garnishing. Rich in vitamins and perfect for adding flavor to various dishes, salads, and soups.',
      imageUrl: 'https://th.bing.com/th/id/R.a0fefc0161516b2dc8765787be3cac0e?rik=CU84nY0oZpYQLg&pid=ImgRaw&r=0',
      category: ['medicinal'],
      isPopular: true,
    },
    {
      id: 32,
      name: 'Almond Tree',
      price: '₪25',
      description: 'Beautiful flowering tree that produces delicious almonds. Perfect for gardens and provides both ornamental beauty and nutritious fruits. Well-suited to Mediterranean climate.',
      imageUrl: 'https://www.garden.eco/wp-content/uploads/2018/03/almond-tree-zone.jpg',
      category: ['fruit'],
      isPopular: true,
    },
    {
      id: 33,
      name: 'Pomegranate Tree',
      price: '₪25',
      description: 'Beautiful fruit tree that produces delicious pomegranates. Perfect for gardens and provides both ornamental beauty and nutritious fruits. Well-suited to Mediterranean climate.',
      imageUrl: 'https://tse3.mm.bing.net/th/id/OIP.nqadO_TR_y923Uq9VqTMXAHaGZ?cb=ucfimg2&ucfimg=1&rs=1&pid=ImgDetMain&o=7&rm=3',
      category: ['fruit'],
      isPopular: true,
    },
    {
      id: 34,
      name: 'Apricot Tree',
      price: '₪25',
      description: 'Beautiful fruit tree that produces delicious apricots. Perfect for gardens and provides both ornamental beauty and nutritious fruits. Well-suited to Mediterranean climate.',
      imageUrl: 'https://cdn.mos.cms.futurecdn.net/V52UA8XaXc9YxWs2nHy6Ea-1280-80.jpg',
      category: ['fruit'],
      isPopular: true,
    },
    {
      id: 35,
      name: 'Oleander Flower',
      price: '₪18',
      description: 'Beautiful flowering shrub with vibrant blooms. Perfect for gardens and outdoor spaces. Known for its colorful flowers and ornamental beauty. Well-suited to Mediterranean climate.',
      imageUrl: 'https://th.bing.com/th/id/R.0b9b3c36143fe0ffa6af9b8ad67f2df0?rik=MCR9XayJUuPkpg&riu=http%3a%2f%2f4.bp.blogspot.com%2f-dm8Xq7bRxI8%2fUzWkjC61iwI%2fAAAAAAABBRk%2fjK9F2ar5AHQ%2fs1600%2fNerium%2bOleander%2b7.jpg&ehk=T6n1yNar%2fkt23AtRCpfIJ2jMD6tDC16KneQk3ifYdMs%3d&risl=&pid=ImgRaw&r=0',
      category: ['flower'],
      isPopular: true,
    },
    {
      id: 36,
      name: 'Petunia Flower',
      price: '₪13',
      description: 'Vibrant and colorful annual flowers, perfect for hanging baskets, containers, and garden beds. Known for their profuse blooms and delightful fragrance.',
      imageUrl: 'https://www.gardencrossings.com/wp-content/uploads/2022/12/petunia_supertunia_persimmon_petunia_gc_suppe_05.jpg',
      category: ['flower'],
      isPopular: true,
    },
    {
      id: 37,
      name: 'Watermelon',
      price: '₪15',
      description: 'Sweet and refreshing summer fruit, perfect for hot weather. Easy to grow in warm climates and produces large, juicy fruits. Great for gardens and outdoor spaces.',
      imageUrl: 'https://i.pinimg.com/originals/ac/2d/78/ac2d786b65fd554c514cd0fd98037cff.jpg',
      category: ['fruit'],
      isPopular: true,
    },
    {
      id: 38,
      name: 'Melon',
      price: '₪14',
      description: 'Delicious and sweet melon variety, perfect for summer. Easy to grow in warm climates and produces fragrant, juicy fruits. Great for gardens and outdoor spaces.',
      imageUrl: 'https://a-z-animals.com/media/2022/06/cantaloupe.jpg',
      category: ['fruit'],
      isPopular: true,
    },
    {
      id: 39,
      name: 'Apple Tree',
      price: '₪25',
      description: 'Beautiful fruit tree that produces delicious apples. Perfect for gardens and provides both ornamental beauty and nutritious fruits. Well-suited to Mediterranean climate.',
      imageUrl: 'https://www.grasshoppergardens.com/wp-content/uploads/2022/10/shutterstock_1508722937-1200x800.jpg',
      category: ['fruit'],
      isPopular: true,
    },
    {
      id: 40,
      name: 'Chamomile',
      price: '₪12',
      description: 'Calming and aromatic herb with delicate white flowers. Known for its soothing properties and used in teas. Easy to grow and perfect for gardens.',
      imageUrl: 'https://a-z-animals.com/media/2022/09/shutterstock_2053752875.jpg',
      category: ['medicinal', 'flower'],
      isPopular: true,
    },
    {
      id: 41,
      name: 'Pothos Plant',
      price: '₪18',
      description: 'Beautiful and easy-to-care-for indoor plant. Perfect for beginners, purifies air and adds greenery to any space. Low maintenance and fast-growing.',
      imageUrl: 'https://i1.wp.com/floresdelivery.com.br/wp-content/uploads/2017/05/fotos-floricutura-36.jpg?resize=768%2C767&ssl=1',
      category: ['flower', 'indoor'],
      isPopular: true,
    },
    {
      id: 42,
      name: 'Decorative Pebbles',
      price: '₪12',
      description: 'Beautiful decorative pebbles perfect for garden decoration, potted plants, and landscaping. Adds aesthetic appeal to any garden or indoor plant arrangement.',
      imageUrl: 'https://th.bing.com/th/id/R.0fa72d8932ae8e81ff4d9a7639dba2f9?rik=rzkutBB94xpMxA&pid=ImgRaw&r=0',
      category: ['accessories'],
      isPopular: true,
    },
    {
      id: 43,
      name: 'Mini Garden Lights',
      price: '₪25',
      description: 'Beautiful mini garden lights perfect for outdoor decoration and creating a magical atmosphere in your garden. Weather-resistant and energy-efficient lighting solution.',
      imageUrl: 'https://m.media-amazon.com/images/I/51-Nr1nlbML._AC_.jpg',
      category: ['accessories'],
      isPopular: true,
    },
    {
      id: 44,
      name: 'Butterflies',
      price: '₪15',
      description: 'Colorful decorative butterflies perfect for garden decoration. Adds beauty and a natural touch to your plants and garden spaces. Vibrant colors that enhance any outdoor or indoor plant arrangement.',
      imageUrl: 'https://factorydirectcraft.com/mpix/osc_products/20150601111438-392314.jpg',
      category: ['accessories'],
      isPopular: true,
    },
    {
      id: 45,
      name: 'Ladybug Decoration',
      price: '₪18',
      description: 'Charming decorative ladybugs perfect for garden decoration. Adds a playful and natural touch to your plants and garden spaces. Beautiful design that enhances any outdoor or indoor plant arrangement.',
      imageUrl: 'https://i.pinimg.com/originals/b7/aa/26/b7aa2642503c8143b3a6c179c1a93ca2.jpg',
      category: ['accessories'],
      isPopular: true,
    },
    {
      id: 46,
      name: 'Decorative Birds',
      price: '₪20',
      description: 'Beautiful decorative birds perfect for garden decoration. Adds elegance and a natural touch to your plants and garden spaces. Stunning design that enhances any outdoor or indoor plant arrangement.',
      imageUrl: 'https://ae01.alicdn.com/kf/S781de9ddbea24303ab3100c49ea9adfek.jpg',
      category: ['accessories'],
      isPopular: true,
    },
    {
      id: 47,
      name: 'ZZ Plant',
      price: '₪22',
      description: 'Extremely low-maintenance indoor plant with glossy, dark green leaves. Perfect for beginners and low-light conditions. Known for its ability to thrive with minimal care and purify indoor air.',
      imageUrl: 'https://glasswingshop.com/cdn/shop/products/8D2A2069_2048x2048.jpg?v=1595400475',
      category: ['indoor'],
      isPopular: true,
    },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { value: 'all' as PlantCategory, label: 'All Plants' },
    { value: 'vegetable' as PlantCategory, label: 'Vegetables' },
    { value: 'fruit' as PlantCategory, label: 'Fruits' },
    { value: 'flower' as PlantCategory, label: 'Flowers' },
    { value: 'medicinal' as PlantCategory, label: 'Medicinal Herbs' },
    { value: 'accessories' as PlantCategory, label: 'Plant Accessories' },
    { value: 'indoor' as PlantCategory, label: 'Indoor Plants' },
  ];

  const filteredPlants = plants.filter((plant) => {
    // Filter by favorites if enabled
    if (showFavoritesOnly && !favorites.includes(plant.id)) {
      return false;
    }
    
    // Filter by category using CategoryID from database
    if (selectedCategory === 'all') return true;
    
    // Map category names to CategoryID values
    const categoryIDMap: Record<PlantCategory, string | null> = {
      'all': null,
      'vegetable': '1',
      'fruit': '2',
      'flower': '3',
      'medicinal': '4',
      'accessories': null, // Not in database
      'indoor': null, // Not in database
      'other': null
    };
    
    const expectedCategoryID = categoryIDMap[selectedCategory];
    
    // If we have CategoryID from database, use it for filtering
    if (plant.categoryID !== undefined && plant.categoryID !== null) {
      return String(plant.categoryID) === String(expectedCategoryID);
    }
    
    // Fallback to category name matching if CategoryID is not available
    return plant.category.includes(selectedCategory);
  });

  if (loading) {
    return (
      <div className="plants-page">
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p>Loading plants...</p>
        </div>
      </div>
    );
  }

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('mockUser');
    navigate('/register');
  };

  return (
    <div className="plants-page">
      <header className="plants-navbar">
        <div className="plants-logo" onClick={() => navigate('/home')}>
          <span className="logo-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"></path>
              <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"></path>
            </svg>
          </span>
          <span className="logo-text">PlantIllegence</span>
        </div>
        <nav className="plants-nav-links">
          <a href="/home">Home</a>
          <a href="/plants" onClick={(e) => {
            e.preventDefault();
            navigate('/plants');
          }}>Plants</a>
          <a href="/about" onClick={(e) => {
            e.preventDefault();
            navigate('/about');
          }}>About</a>
          <button
            className="favorites-icon-btn"
            onClick={() => navigate('/favorites')}
            title="Favorite products"
            aria-label="Favorite products"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
          </button>
          <button
            className="track-order-icon-btn"
            onClick={() => navigate('/track-order')}
            title="Track Order"
            aria-label="Track Order"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 17H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-1"></path>
              <path d="M12 8v8"></path>
              <path d="M8 12h8"></path>
              <circle cx="7" cy="17" r="2"></circle>
              <circle cx="17" cy="17" r="2"></circle>
            </svg>
          </button>
          <button 
            className="cart-icon-btn" 
            onClick={() => navigate('/cart')}
            title="Shopping Cart"
            aria-label="Shopping Cart"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
          </button>
          <button
            className="back-btn"
            onClick={() => navigate(-1)}
          >
            Back
          </button>
          <button className="logout-btn" onClick={handleLogout}>
            Log out
          </button>
        </nav>
      </header>

      <div className="plants-container">
        <div className="plants-header">
          <h1>Explore Our Plants</h1>
          <p>Discover a wide variety of plants, from indoor beauties to outdoor gardens</p>
        </div>

        <CategoryFilter
          categories={categories}
          selectedCategory={selectedCategory}
          onCategoryChange={(category) => setSelectedCategory(category)}
        />

        <div className="plants-grid">
          {filteredPlants.map((plant) => (
            <div 
              className="plant-card" 
              key={plant.id}
            >
              <div 
                className="plant-card-image-wrapper"
                onClick={() => {
                  console.log('Plant card clicked, navigating to:', `/plants/${plant.id}`);
                  navigate(`/plants/${plant.id}`);
                }}
              >
                <img
                  className="plant-card-image"
                  src={plant.imageUrl}
                  alt={plant.name}
                />
              </div>
              <div 
                className="plant-card-info"
                onClick={() => {
                  console.log('Plant card info clicked, navigating to:', `/plants/${plant.id}`);
                  navigate(`/plants/${plant.id}`);
                }}
              >
                <div className="plant-card-header">
                  <h3>{plant.name}</h3>
                  <span className="plant-price">{plant.price}</span>
                </div>
                <p className="plant-description">{plant.description}</p>
                <div className="plant-card-actions">
                  <button 
                    className="favorite-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      const isFavorite = favorites.includes(plant.id);
                      let newFavorites: number[];
                      
                      if (isFavorite) {
                        newFavorites = favorites.filter(id => id !== plant.id);
                        // Add notification when removing from favorites
                        const notificationId = Date.now();
                        setFavoriteNotifications((prev) => [
                          ...prev,
                          { id: notificationId, message: `${plant.name} has been removed from favorites` }
                        ]);
                      } else {
                        newFavorites = [...favorites, plant.id];
                      }
                      
                      setFavorites(newFavorites);
                      localStorage.setItem('plantFavorites', JSON.stringify(newFavorites));
                    }}
                    title={favorites.includes(plant.id) ? "Remove from favorites" : "Add to favorites"}
                    aria-label={favorites.includes(plant.id) ? "Remove from favorites" : "Add to favorites"}
                  >
                    <svg 
                      width="20" 
                      height="20" 
                      viewBox="0 0 24 24" 
                      fill={favorites.includes(plant.id) ? "#e74c3c" : "none"} 
                      stroke={favorites.includes(plant.id) ? "#e74c3c" : "#666"} 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    >
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                    </svg>
                  </button>
                  <button 
                    className="plant-buy-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      const savedCart = localStorage.getItem('plantCart');
                      const cart: Plant[] = savedCart ? JSON.parse(savedCart) : [];
                      const existingItem = cart.find((item) => item.id === plant.id);
                      
                      if (existingItem) {
                        existingItem.quantity = (existingItem.quantity || 1) + 1;
                      } else {
                        cart.push({ ...plant, quantity: 1 });
                      }
                      
                      localStorage.setItem('plantCart', JSON.stringify(cart));
                      const notificationId = Date.now();
                      setCartNotifications((prev) => [...prev, { id: notificationId, message: `${plant.name} added to cart!` }]);
                    }}
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredPlants.length === 0 && (
          <div className="no-plants">
            <p>No plants found in this category.</p>
          </div>
        )}
      </div>
      <NotificationContainer 
        cartNotifications={cartNotifications}
        favoriteNotifications={favoriteNotifications}
      />
    </div>
  );
}

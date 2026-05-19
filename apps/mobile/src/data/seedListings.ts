export interface Listing {
    id: string;
    title: string;
    category: string;
    locationName: string;
    lat: number;
    lng: number;
    description: string;
    price: string;
    rating: number;
    images: any[];
    isVerified: boolean;
    isVisible: 'public' | 'premium_only';
    distance?: string;
    duration?: string;
    dateText?: string;
    venueName?: string;
    reviews: Review[];
}

export interface Review {
    id: string;
    user: string;
    rating: number;
    comment: string;
    date: string;
}

export const CATEGORIES = [
    { id: '1', name: 'Party', icon: 'music' },
    { id: '2', name: 'Culture', icon: 'landmark' },
    { id: '3', name: 'Food', icon: 'utensils' },
    { id: '4', name: 'Beach', icon: 'palmtree' },
    { id: '5', name: 'Hiking', icon: 'mountain' },
    { id: '6', name: 'Wellness', icon: 'heart' },
];

export const SEED_LISTINGS: Listing[] = [
    {
        id: 'evt_sola_festival_2026',
        title: 'Sola Festival',
        category: 'Party',
        locationName: 'Madiha',
        lat: 5.9389,
        lng: 80.5471,
        description: '30–31 Jan 2026. Annual music festival at The Doctor’s House featuring local and international artists, art installations, and coastal vibes.',
        dateText: '30–31 Jan 2026',
        venueName: 'The Doctor’s House',
        price: 'Check Bio',
        rating: 4.9,
        images: ['https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=800'],
        isVerified: true,
        isVisible: 'public',
        distance: '2.5 km',
        duration: '2 Days',
        reviews: []
    },
    {
        id: 'evt_labatallia_dance_battle',
        title: 'Labatallia Dance Battle',
        category: 'Party',
        locationName: 'Ahangama',
        lat: 5.9726,
        lng: 80.3644,
        description: 'January 5th. Epic Battle & Jam (6–8 PM) followed by the Naughty Sunday Party (8 PM–1 AM) at Lamana Ahangama.',
        dateText: 'January 5th',
        venueName: 'Lamana Ahangama',
        price: 'Entry Fee',
        rating: 4.7,
        images: [require('../../assets/images/labatallia.jpg')],
        isVerified: true,
        isVisible: 'public',
        distance: '1.8 km',
        duration: '7h',
        reviews: []
    },
    {
        id: 'evt_no_shame_monday_2026',
        title: 'No Shame Monday — Karaoke Night',
        category: 'Party',
        locationName: 'Ahangama',
        lat: 5.9710,
        lng: 80.3620,
        description: '19 Jan 2026. Join Sandun Amarasinghe for an unforgettable karaoke night at Crust Ahangama. 7 PM onwards.',
        dateText: '19 Jan 2026',
        venueName: 'Crust Ahangama',
        price: 'Free Entrance',
        rating: 4.8,
        images: [require('../../assets/images/no_shame_monday.jpg')],
        isVerified: true,
        isVisible: 'public',
        distance: '1.5 km',
        duration: '4h',
        reviews: []
    },
    {
        id: 'evt_kai_open_mic',
        title: 'Kai Weligama Open Mic',
        category: 'Culture',
        locationName: 'Weligama',
        lat: 5.9735,
        lng: 80.4285,
        description: 'Tuesday Open Mic with Pradhee at Kai Weligama Rooftop. Experience live acoustic soul music. 6:30 PM – 10:30 PM.',
        dateText: 'Tuesday Night',
        venueName: 'Kai Weligama (Rooftop)',
        price: 'Free Entrance',
        rating: 4.6,
        images: [require('../../assets/images/kai_open_mic.jpg')],
        isVerified: true,
        isVisible: 'public',
        distance: '0.5 km',
        duration: '4h',
        reviews: []
    },
    {
        id: 'evt_fusion_party_valentine_2026',
        title: 'The Fusion Party — Valentine Edition',
        category: 'Party',
        locationName: 'Colombo',
        lat: 6.9038,
        lng: 79.9141,
        description: '14 Feb 2026. Special Valentine Edition with Doctor Band SL at Waters Edge Outdoor Premises. A fusion of romance and rhythm.',
        dateText: '14 Feb 2026',
        venueName: 'Waters Edge',
        price: 'LKR 5,000+',
        rating: 4.9,
        images: [require('../../assets/images/fusion_party.jpg')],
        isVerified: true,
        isVisible: 'public',
        distance: '12 km',
        duration: '6h',
        reviews: []
    },
    {
        id: 'svc_ice_weligama',
        title: 'ICE Weligama — Cafe & Sauna',
        category: 'Wellness',
        locationName: 'Weligama',
        lat: 5.9750,
        lng: 80.4250,
        description: 'Cafe, Ice bath, and Sauna experiences. Cafe 07:00–22:00 | Ice 09:00–22:00 | Sauna 11:00–22:00 (Last entry 21:00).',
        dateText: 'Daily / Season III',
        venueName: 'ICE Weligama',
        price: 'Varies',
        rating: 4.9,
        images: [require('../../assets/images/ice_weligama.jpg')],
        isVerified: true,
        isVisible: 'public',
        distance: '0.8 km',
        duration: 'Flexible',
        reviews: []
    },
    {
        id: '1',
        title: 'Galle Fort Sunset Walking Tour',
        category: 'Culture',
        locationName: 'Galle',
        lat: 6.0267,
        lng: 80.2170,
        description: 'Explore the historic UNESCO World Heritage site of Galle Fort. Witness the architectural fusion of European and South Asian styles.',
        price: 'LKR 4,500',
        rating: 4.8,
        images: ['https://images.unsplash.com/photo-1586902197503-e71026292412?q=80&w=800'],
        isVerified: true,
        isVisible: 'public',
        distance: '1.2 km',
        duration: '2h',
        reviews: [
            { id: 'r1', user: 'Alex', rating: 5, comment: 'Amazing history!', date: '2 days ago' }
        ]
    },
    {
        id: '3',
        title: 'Exclusive Jungle Rave: Secret Location',
        category: 'Party',
        locationName: 'Hikkaduwa',
        lat: 6.1362,
        lng: 80.1259,
        description: 'A premium jungle experience with international DJs. Location revealed only to premium members.',
        price: 'LKR 12,000',
        rating: 4.7,
        images: ['https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?q=80&w=800'],
        isVerified: false,
        isVisible: 'premium_only',
        distance: '3.5 km',
        duration: '6h',
        reviews: []
    },
    {
        id: 'evt_tiki_friday',
        title: 'Tiki Friday',
        category: 'Party',
        locationName: 'Weligama',
        lat: 5.9700,
        lng: 80.4300,
        description: 'Friday Night at Tiki Bar Weligama. Authentic island vibes with rotating DJ sets. 7 PM onwards.',
        dateText: 'Every Friday',
        venueName: 'Tiki Bar Weligama',
        price: 'LKR 2,000',
        rating: 4.5,
        images: ['https://images.unsplash.com/photo-1541532713592-79a0317b6b77?q=80&w=800'],
        isVerified: true,
        isVisible: 'public',
        distance: '0.2 km',
        duration: '5h',
        reviews: []
    }
];

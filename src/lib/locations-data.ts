
import type { Location } from './types';

// This file contains the hierarchical location data for seeding the Firestore database.
// Coordinates are approximate and may need refinement.

type LocationSeedData = Omit<Location, 'id' | 'createdAt' | 'createdBy'>;

export const countries: LocationSeedData[] = [
    {
        name: 'Palestine',
        country: 'Palestine',
        region: null, governorate: null, district: null, city: null, village: null, refugeeCamp: null, settlement: null, streetName: null,
        type: 'country',
        parentId: null,
        coordinates: { lat: 31.9522, lng: 35.2332 },
    },
    {
        name: 'Israel',
        country: 'Israel',
        region: null, governorate: null, district: null, city: null, village: null, refugeeCamp: null, settlement: null, streetName: null,
        type: 'country',
        parentId: null,
        coordinates: { lat: 31.0461, lng: 34.8516 },
    }
];

export const palestineRegions: LocationSeedData[] = [
     {
        name: 'West Bank',
        country: 'Palestine',
        region: 'West Bank',
        governorate: null, district: null, city: null, village: null, refugeeCamp: null, settlement: null, streetName: null,
        type: 'region',
        parentId: 'palestine',
        coordinates: { lat: 32.2966, lng: 35.2289 },
    },
    {
        name: 'Gaza Strip',
        country: 'Palestine',
        region: 'Gaza Strip',
        governorate: null, district: null, city: null, village: null, refugeeCamp: null, settlement: null, streetName: null,
        type: 'region',
        parentId: 'palestine',
        coordinates: { lat: 31.3547, lng: 34.3088 },
    }
];

export const westBankGovernorates: Omit<LocationSeedData, 'country' | 'region'>[] = [
    { name: 'Bethlehem', parentId: 'west_bank', governorate: 'Bethlehem', type: 'governorate', coordinates: { lat: 31.7056, lng: 35.2024 } },
    { name: 'Hebron', parentId: 'west_bank', governorate: 'Hebron', type: 'governorate', coordinates: { lat: 31.5326, lng: 35.0953 } },
    { name: 'Ramallah & Al-Bireh', parentId: 'west_bank', governorate: 'Ramallah & Al-Bireh', type: 'governorate', coordinates: { lat: 31.9029, lng: 35.2062 } },
    { name: 'Jerusalem', parentId: 'west_bank', governorate: 'Jerusalem', type: 'governorate', coordinates: { lat: 31.7683, lng: 35.2137 } },
    { name: 'Nablus', parentId: 'west_bank', governorate: 'Nablus', type: 'governorate', coordinates: { lat: 32.2215, lng: 35.2544 } },
    { name: 'Jenin', parentId: 'west_bank', governorate: 'Jenin', type: 'governorate', coordinates: { lat: 32.4609, lng: 35.2958 } },
    { name: 'Tulkarm', parentId: 'west_bank', governorate: 'Tulkarm', type: 'governorate', coordinates: { lat: 32.3135, lng: 35.0292 } },
    { name: 'Qalqilya', parentId: 'west_bank', governorate: 'Qalqilya', type: 'governorate', coordinates: { lat: 32.1931, lng: 34.9785 } },
    { name: 'Salfit', parentId: 'west_bank', governorate: 'Salfit', type: 'governorate', coordinates: { lat: 32.0847, lng: 35.1834 } },
    { name: 'Tubas', parentId: 'west_bank', governorate: 'Tubas', type: 'governorate', coordinates: { lat: 32.3214, lng: 35.37 } },
    { name: 'Jericho', parentId: 'west_bank', governorate: 'Jericho', type: 'governorate', coordinates: { lat: 31.8572, lng: 35.4444 } },
];


export const gazaGovernorates: Omit<LocationSeedData, 'country' | 'region'>[] = [
    { name: 'Gaza', parentId: 'gaza_strip', governorate: 'Gaza', type: 'governorate', coordinates: { lat: 31.5163, lng: 34.4554 } },
    { name: 'North Gaza', parentId: 'gaza_strip', governorate: 'North Gaza', type: 'governorate', coordinates: { lat: 31.5500, lng: 34.5000 } },
    { name: 'Deir al-Balah', parentId: 'gaza_strip', governorate: 'Deir al-Balah', type: 'governorate', coordinates: { lat: 31.4167, lng: 34.3500 } },
    { name: 'Khan Yunis', parentId: 'gaza_strip', governorate: 'Khan Yunis', type: 'governorate', coordinates: { lat: 31.3468, lng: 34.3053 } },
    { name: 'Rafah', parentId: 'gaza_strip', governorate: 'Rafah', type: 'governorate', coordinates: { lat: 31.2916, lng: 34.2505 } },
];

export const israeliDistricts: Omit<LocationSeedData, 'country' | 'region'>[] = [
    { name: 'Jerusalem', parentId: 'israel', district: 'Jerusalem', type: 'district', coordinates: { lat: 31.7683, lng: 35.2137 } },
    { name: 'Tel Aviv', parentId: 'israel', district: 'Tel Aviv', type: 'district', coordinates: { lat: 32.0853, lng: 34.7818 } },
    { name: 'Haifa', parentId: 'israel', district: 'Haifa', type: 'district', coordinates: { lat: 32.7940, lng: 34.9896 } },
    { name: 'Northern', parentId: 'israel', district: 'Northern', type: 'district', coordinates: { lat: 32.9192, lng: 35.2957 } },
    { name: 'Central', parentId: 'israel', district: 'Central', type: 'district', coordinates: { lat: 31.9864, lng: 34.8879 } },
    { name: 'Southern', parentId: 'israel', district: 'Southern', type: 'district', coordinates: { lat: 30.6120, lng: 34.7919 } },
];


// Specific Cities and Settlements
export const citiesAndVillages: Partial<LocationSeedData>[] = [
    // West Bank Cities
    { name: 'Ramallah', parentId: 'wb_ramallah_&_al-bireh', city: 'Ramallah', type: 'city', coordinates: { lat: 31.9029, lng: 35.2062 }, country: 'Palestine', region: 'West Bank' },
    { name: 'Al-Bireh', parentId: 'wb_ramallah_&_al-bireh', city: 'Al-Bireh', type: 'city', coordinates: { lat: 31.9103, lng: 35.2215 }, country: 'Palestine', region: 'West Bank' },
    { name: 'Hebron', parentId: 'wb_hebron', city: 'Hebron', type: 'city', coordinates: { lat: 31.5326, lng: 35.0953 }, country: 'Palestine', region: 'West Bank' },
    { name: 'Nablus', parentId: 'wb_nablus', city: 'Nablus', type: 'city', coordinates: { lat: 32.2215, lng: 35.2544 }, country: 'Palestine', region: 'West Bank' },
    { name: 'Jenin', parentId: 'wb_jenin', city: 'Jenin', type: 'city', coordinates: { lat: 32.4609, lng: 35.2958 }, country: 'Palestine', region: 'West Bank' },
    { name: 'Bethlehem', parentId: 'wb_bethlehem', city: 'Bethlehem', type: 'city', coordinates: { lat: 31.7056, lng: 35.2024 }, country: 'Palestine', region: 'West Bank' },
    { name: 'Jericho', parentId: 'wb_jericho', city: 'Jericho', type: 'city', coordinates: { lat: 31.8572, lng: 35.4444 }, country: 'Palestine', region: 'West Bank' },

    // Gaza Strip Cities
    { name: 'Gaza City', parentId: 'gz_gaza', city: 'Gaza City', type: 'city', coordinates: { lat: 31.5163, lng: 34.4554 }, country: 'Palestine', region: 'Gaza Strip' },
    { name: 'Khan Yunis', parentId: 'gz_khan_yunis', city: 'Khan Yunis', type: 'city', coordinates: { lat: 31.3468, lng: 34.3053 }, country: 'Palestine', region: 'Gaza Strip' },
    { name: 'Rafah', parentId: 'gz_rafah', city: 'Rafah', type: 'city', coordinates: { lat: 31.2916, lng: 34.2505 }, country: 'Palestine', region: 'Gaza Strip' },
    { name: 'Jabalia', parentId: 'gz_north_gaza', city: 'Jabalia', type: 'city', coordinates: { lat: 31.543, lng: 34.4983 }, country: 'Palestine', region: 'Gaza Strip' },

    // Israeli Cities
    { name: 'Tel Aviv-Yafo', parentId: 'il_tel_aviv', district: 'Tel Aviv', city: 'Tel Aviv-Yafo', type: 'city', coordinates: { lat: 32.0853, lng: 34.7818 }, country: 'Israel' },
    { name: 'Haifa', parentId: 'il_haifa', district: 'Haifa', city: 'Haifa', type: 'city', coordinates: { lat: 32.7940, lng: 34.9896 }, country: 'Israel' },
    { name: 'Beersheba', parentId: 'il_southern', district: 'Southern', city: 'Beersheba', type: 'city', coordinates: { lat: 31.2530, lng: 34.7915 }, country: 'Israel' },
    { name: 'Nazareth', parentId: 'il_northern', district: 'Northern', city: 'Nazareth', type: 'city', coordinates: { lat: 32.7022, lng: 35.2978 }, country: 'Israel' },
    
    // Jerusalem Cities (under Israel)
    { name: 'West Jerusalem', parentId: 'il_jerusalem', district: 'Jerusalem', city: 'West Jerusalem', type: 'city', coordinates: { lat: 31.777, lng: 35.212 }, country: 'Israel', region: 'Jerusalem' },
    { name: 'East Jerusalem', parentId: 'il_jerusalem', district: 'Jerusalem', city: 'East Jerusalem', type: 'city', coordinates: { lat: 31.7834, lng: 35.2339 }, country: 'Israel', region: 'Jerusalem' },
];

export const refugeeCamps: Partial<LocationSeedData>[] = [
    // West Bank Camps
    { name: 'Jenin Camp', parentId: 'wb_jenin', refugeeCamp: 'Jenin Camp', type: 'refugee_camp', coordinates: { lat: 32.464, lng: 35.289 }, country: 'Palestine', region: 'West Bank' },
    { name: 'Balata', parentId: 'wb_nablus', refugeeCamp: 'Balata', type: 'refugee_camp', coordinates: { lat: 32.209, lng: 35.282 }, country: 'Palestine', region: 'West Bank' },
    { name: 'Shuafat Camp', parentId: 'wb_jerusalem', refugeeCamp: 'Shuafat Camp', type: 'refugee_camp', coordinates: { lat: 31.815, lng: 35.247 }, country: 'Palestine', region: 'West Bank' },

    // Gaza Camps
    { name: 'Jabalia Camp', parentId: 'gz_north_gaza', refugeeCamp: 'Jabalia Camp', type: 'refugee_camp', coordinates: { lat: 31.533, lng: 34.500 }, country: 'Palestine', region: 'Gaza Strip' },
    { name: 'Al-Shati (Beach) Camp', parentId: 'gz_gaza', refugeeCamp: 'Al-Shati (Beach) Camp', type: 'refugee_camp', coordinates: { lat: 31.525, lng: 34.442 }, country: 'Palestine', region: 'Gaza Strip' },
];

export const westBankSettlements: Partial<LocationSeedData>[] = [
    // Settlements in West Bank, but classified under Israel
    { name: 'Ariel', parentId: 'wb_salfit', settlement: 'Ariel', type: 'settlement', coordinates: { lat: 32.1054, lng: 35.1834 }, country: 'Israel', region: 'West Bank' },
    { name: 'Maale Adumim', parentId: 'wb_jerusalem', settlement: 'Maale Adumim', type: 'settlement', coordinates: { lat: 31.780, lng: 35.305 }, country: 'Israel', region: 'West Bank' },
    { name: 'Beit El', parentId: 'wb_ramallah_&_al-bireh', settlement: 'Beit El', type: 'settlement', coordinates: { lat: 31.9472, lng: 35.2255 }, country: 'Israel', region: 'West Bank' },
    { name: 'Gilo', parentId: 'wb_bethlehem', settlement: 'Gilo', type: 'settlement', coordinates: { lat: 31.731, lng: 35.188 }, country: 'Israel', region: 'West Bank' },
    { name: 'Kiryat Arba', parentId: 'wb_hebron', settlement: 'Kiryat Arba', type: 'settlement', coordinates: { lat: 31.529, lng: 35.115 }, country: 'Israel', region: 'West Bank' },
    { name: 'Modi\'in Illit', parentId: 'wb_ramallah_&_al-bireh', settlement: 'Modi\'in Illit', type: 'settlement', coordinates: { lat: 31.933, lng: 35.041 }, country: 'Israel', region: 'West Bank' },
    { name: 'Efrat', parentId: 'wb_bethlehem', settlement: 'Efrat', type: 'settlement', coordinates: { lat: 31.656, lng: 35.155 }, country: 'Israel', region: 'West Bank' },
];

export type { Location };
    
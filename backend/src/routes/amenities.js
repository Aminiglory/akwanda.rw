const { Router } = require('express');
const mongoose = require('mongoose');
const Amenity = require('../tables/amenity');
const { authenticate: requireAuth } = require('../middleware/auth');

const router = Router();

function requireAdmin(req, res, next) {
  if (req.user?.userType === 'admin') return next();
  return res.status(403).json({ message: 'Admin only' });
}

// List amenities/services (optionally filter by scope/type/active)
router.get('/', async (req, res) => {
  try {
    const { scope, type, active } = req.query;
    const q = {};
    if (scope) q.scope = scope;
    if (type) q.type = type;
    if (active != null) q.active = String(active) === 'true';
    const items = await Amenity.find(q).sort({ order: 1, name: 1 }).lean();
    res.json({ amenities: items });
  } catch (e) {
    res.status(500).json({ message: 'Failed to list amenities', error: e.message });
  }
});

// Create amenity/service (admin)
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, slug, type = 'amenity', scope, icon, description = '', active = true, order = 0 } = req.body || {};
    if (!name || !slug || !scope) return res.status(400).json({ message: 'name, slug, scope are required' });
    const created = await Amenity.create({ name: String(name).trim(), slug: String(slug).trim().toLowerCase(), type, scope, icon, description, active: !!active, order: Number(order)||0 });
    res.status(201).json({ amenity: created });
  } catch (e) {
    if (e instanceof mongoose.Error && e.code === 11000) {
      return res.status(409).json({ message: 'Slug already exists' });
    }
    res.status(500).json({ message: 'Failed to create amenity', error: e.message });
  }
});

// Update amenity/service (admin)
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const updates = { ...req.body };
    if (updates.slug) updates.slug = String(updates.slug).trim().toLowerCase();
    if (updates.order != null) updates.order = Number(updates.order);
    const updated = await Amenity.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!updated) return res.status(404).json({ message: 'Amenity not found' });
    res.json({ amenity: updated });
  } catch (e) {
    res.status(500).json({ message: 'Failed to update amenity', error: e.message });
  }
});

// Delete amenity/service (admin)
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const deleted = await Amenity.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Amenity not found' });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ message: 'Failed to delete amenity', error: e.message });
  }
});

// Bulk seed default facilities & services (admin)
router.post('/bulk-seed', requireAuth, requireAdmin, async (req, res) => {
  try {
    const defs = [];
    const add = (name, slug, scope, type, description, order = 0) => defs.push({ name, slug, scope, type, description, active: true, order });
    // 1. General Facilities (property)
    add('Free Wi‑Fi', 'free_wifi', 'property', 'amenity', 'Complimentary wireless internet available throughout the property.');
    add('High‑speed Internet', 'high_speed_internet', 'property', 'amenity', 'Fast, reliable internet suitable for streaming and remote work.');
    add('On‑site Parking', 'on_site_parking', 'property', 'amenity', 'Parking available within the property premises.');
    add('Private Parking', 'private_parking', 'property', 'amenity', 'Reserved parking spots for guests only.');
    add('24‑Hour Front Desk', 'front_desk_24h', 'property', 'service', 'Reception available 24 hours a day for check‑in and assistance.');
    add('Non‑Smoking Rooms', 'non_smoking_rooms', 'property', 'amenity', 'Rooms designated as non‑smoking for comfort and safety.');
    add('Family Rooms', 'family_rooms', 'property', 'amenity', 'Larger rooms suited for families with multiple beds or space.');
    add('Air Conditioning', 'air_conditioning', 'property', 'amenity', 'Air‑conditioned rooms and common areas.');
    add('Heating', 'heating', 'property', 'amenity', 'Heating provided for rooms and common areas.');
    add('Elevator', 'elevator', 'property', 'amenity', 'Lift access to upper floors.');
    add('Garden / Terrace', 'garden_terrace', 'property', 'amenity', 'Outdoor garden or terrace area for relaxation.');
    add('Shared Lounge / TV Area', 'shared_lounge_tv', 'property', 'amenity', 'Common lounge area with seating and television.');
    // 2. Room Facilities (room)
    add('Comfortable Bed', 'comfortable_bed', 'room', 'amenity', 'High‑quality queen/king/twin bedding for a restful sleep.');
    add('Wardrobe / Closet', 'wardrobe_closet', 'room', 'amenity', 'Wardrobe or closet space for clothes and luggage.');
    add('Seating Area', 'seating_area', 'room', 'amenity', 'Seating area with chairs or a small sofa.');
    add('Desk / Work Table', 'desk_work_table', 'room', 'amenity', 'Work desk or table suitable for laptops and writing.');
    add('Flat‑Screen TV', 'flat_screen_tv', 'room', 'amenity', 'Modern flat‑screen television in the room.');
    add('Cable / Satellite Channels', 'cable_satellite_channels', 'room', 'amenity', 'TV with cable or satellite channels.');
    add('Safe (Deposit Box)', 'safety_deposit_box', 'room', 'amenity', 'In‑room safe for storing valuables.');
    add('Iron & Ironing Board', 'iron_ironing_board', 'room', 'amenity', 'Iron and ironing board available in the room or on request.');
    add('Private Balcony / Patio', 'private_balcony_patio', 'room', 'amenity', 'Room includes a private balcony or patio area.');
    add('Soundproof Rooms', 'soundproof_rooms', 'room', 'amenity', 'Enhanced soundproofing for a quieter stay.');
    // 3. Food & Drink
    add('Restaurant', 'restaurant', 'property', 'service', 'On‑site restaurant serving meals.');
    add('Bar / Lounge', 'bar_lounge', 'property', 'service', 'Bar or lounge area offering drinks and snacks.');
    add('Room Service', 'room_service', 'property', 'service', 'Meals and drinks delivered to your room.');
    add('Breakfast Included', 'breakfast_included', 'property', 'service', 'Breakfast included in room rate.');
    add('Breakfast Available', 'breakfast_available', 'property', 'service', 'Breakfast offered for an additional charge.');
    add('Coffee Maker / Kettle', 'coffee_maker_kettle', 'room', 'amenity', 'In‑room coffee maker or electric kettle.');
    add('Kitchen / Kitchenette', 'kitchen_kitchenette', 'room', 'amenity', 'Kitchen or kitchenette available (typical in apartments).');
    add('Refrigerator', 'refrigerator', 'room', 'amenity', 'In‑room refrigerator for food and drinks.');
    add('Microwave', 'microwave', 'room', 'amenity', 'In‑room microwave oven.');
    add('Oven / Stove', 'oven_stove', 'room', 'amenity', 'Oven and/or stovetop for cooking.');
    add('Mini‑Bar', 'mini_bar', 'room', 'amenity', 'Mini‑bar with selection of beverages.');
    // 4. Bathroom Facilities (room)
    add('Private Bathroom', 'private_bathroom', 'room', 'amenity', 'A private bathroom for the room/unit.');
    add('Shower / Bathtub', 'shower_bathtub', 'room', 'amenity', 'Shower and/or bathtub available.');
    add('Hot Water', 'hot_water', 'room', 'amenity', 'Continuous hot water supply.');
    add('Towels', 'towels', 'room', 'amenity', 'Fresh towels provided.');
    add('Free Toiletries', 'free_toiletries', 'room', 'amenity', 'Complimentary toiletries (soap, shampoo, etc.).');
    add('Hairdryer', 'hairdryer', 'room', 'amenity', 'Hairdryer provided in the room or upon request.');
    add('Slippers', 'slippers', 'room', 'amenity', 'Room slippers provided.');
    add('Toilet Paper', 'toilet_paper', 'room', 'amenity', 'Toilet paper supplied.');
    add('Mirror', 'mirror', 'room', 'amenity', 'Mirror in the bathroom or room.');
    // 5. Cleaning Services
    add('Daily Housekeeping', 'daily_housekeeping', 'property', 'service', 'Daily room cleaning and tidying.');
    add('Laundry Service', 'laundry_service', 'property', 'service', 'Laundry services available (additional charge may apply).');
    add('Ironing Service', 'ironing_service', 'property', 'service', 'Professional ironing service on request.');
    add('Dry Cleaning', 'dry_cleaning', 'property', 'service', 'Dry cleaning service available.');
    add('Washing Machine', 'washing_machine', 'room', 'amenity', 'Washing machine available (common or in‑unit).');
    add('Cleaning Products', 'cleaning_products', 'room', 'amenity', 'Cleaning supplies provided.');
    // 6. Wellness & Recreation
    add('Swimming Pool', 'swimming_pool', 'property', 'amenity', 'Indoor or outdoor pool for guests.');
    add('Spa & Wellness Center', 'spa_wellness_center', 'property', 'service', 'Spa services and wellness treatments.');
    add('Sauna', 'sauna', 'property', 'amenity', 'Sauna available on site.');
    add('Fitness Center / Gym', 'fitness_center_gym', 'property', 'amenity', 'Gym or fitness room with equipment.');
    add('Massage Services', 'massage_services', 'property', 'service', 'Professional massage services available.');
    add('Jacuzzi / Hot Tub', 'jacuzzi_hot_tub', 'property', 'amenity', 'Hot tub or jacuzzi available.');
    // 7. Business Facilities
    add('Business Center', 'business_center', 'property', 'amenity', 'Business facilities with computers/printers.');
    add('Meeting Rooms', 'meeting_rooms', 'property', 'amenity', 'Meeting rooms available for events.');
    add('Conference Facilities', 'conference_facilities', 'property', 'amenity', 'Conference halls or event spaces.');
    add('Fax / Photocopying', 'fax_photocopying', 'property', 'service', 'Faxing and photocopying services.');
    // 8. Family & Children
    add('Kid‑Friendly Facilities', 'kid_friendly', 'property', 'amenity', 'Facilities tailored for children and families.');
    add('Baby Cribs Available', 'baby_cribs_available', 'property', 'amenity', 'Cribs available upon request.');
    add('Baby Safety Gates', 'baby_safety_gates', 'room', 'amenity', 'Safety gates available for apartments.');
    add('Children’s Playground', 'childrens_playground', 'property', 'amenity', 'Outdoor/indoor play area for children.');
    add('Kids’ Menu', 'kids_menu', 'property', 'service', 'Child‑friendly menu options in the restaurant.');
    // 9. Transport Services
    add('Airport Shuttle', 'airport_shuttle', 'property', 'service', 'Airport transfers arranged by the property.');
    add('Car Rental Service', 'car_rental_service', 'property', 'service', 'On‑site or partner car rental.');
    add('Shuttle Service', 'shuttle_service', 'property', 'service', 'Local shuttle services (may be extra charge).');
    add('Taxi Service', 'taxi_service', 'property', 'service', 'Taxi arrangements available.');
    add('Bicycle Rental', 'bicycle_rental', 'property', 'service', 'Bicycle rental for guests.');
    // 10. Security & Safety
    add('24‑Hour Security', 'security_24h', 'property', 'amenity', 'Security personnel on site 24/7.');
    add('CCTV in Common Areas', 'cctv_common_areas', 'property', 'amenity', 'Video surveillance in public spaces.');
    add('Fire Extinguishers', 'fire_extinguishers', 'property', 'amenity', 'Fire extinguishers placed throughout property.');
    add('Smoke Detectors', 'smoke_detectors', 'property', 'amenity', 'Smoke detection systems installed.');
    add('Key Card Access', 'key_card_access', 'property', 'amenity', 'Electronic key card access to rooms and areas.');
    add('Security Alarm', 'security_alarm', 'property', 'amenity', 'Alarm systems for emergencies.');
    // 11. Apartment‑Specific Facilities
    add('Fully Equipped Kitchen', 'fully_equipped_kitchen', 'room', 'amenity', 'Kitchen with appliances and utensils.');
    add('Dining Area', 'dining_area', 'room', 'amenity', 'Dedicated dining table and chairs.');
    add('Living Room', 'living_room', 'room', 'amenity', 'Separate living area with seating.');
    add('Sofa Bed', 'sofa_bed', 'room', 'amenity', 'Convertible sofa bed for additional guests.');
    add('Private Entrance', 'private_entrance', 'room', 'amenity', 'Independent entrance for the unit.');
    add('Dishwasher', 'dishwasher', 'room', 'amenity', 'Dishwasher included in kitchen.');
    add('Kitchen Utensils', 'kitchen_utensils', 'room', 'amenity', 'Essential cooking and dining utensils.');
    add('Outdoor Furniture', 'outdoor_furniture', 'property', 'amenity', 'Furniture in balcony/terrace or garden.');
    add('Washing Machine & Dryer', 'washing_machine_dryer', 'room', 'amenity', 'Washer and dryer available.');
    // 12. Outdoor & View Options
    add('City View', 'city_view', 'room', 'amenity', 'Room offers a city view.');
    add('Sea View', 'sea_view', 'room', 'amenity', 'Room with sea view.');
    add('Lake View', 'lake_view', 'room', 'amenity', 'Room with lake view.');
    add('Mountain View', 'mountain_view', 'room', 'amenity', 'Room with mountain view.');
    add('Garden View', 'garden_view', 'room', 'amenity', 'Room with garden view.');
    add('Balcony / Terrace', 'balcony_terrace', 'room', 'amenity', 'Private balcony or terrace.');
    add('Outdoor Dining Area', 'outdoor_dining_area', 'property', 'amenity', 'Outdoor dining space for guests.');
    // 13. Extra Services
    add('Early Check‑in', 'early_check_in', 'property', 'service', 'Early check‑in available when possible.');
    add('Late Check‑out', 'late_check_out', 'property', 'service', 'Late check‑out subject to availability.');
    add('Luggage Storage', 'luggage_storage', 'property', 'service', 'Secure luggage storage for guests.');
    add('Concierge Service', 'concierge_service', 'property', 'service', 'Assistance with bookings and recommendations.');
    add('Tour Desk', 'tour_desk', 'property', 'service', 'Tours and activities arranged on site.');
    add('Wake‑up Service', 'wake_up_service', 'property', 'service', 'Wake‑up calls upon request.');
    add('Grocery Delivery', 'grocery_delivery', 'property', 'service', 'Grocery delivery to apartments.');
    add('Breakfast in Room', 'breakfast_in_room', 'property', 'service', 'Breakfast served in the guest room.');

    // Upsert by slug to avoid duplicates (resilient, per-item try/catch)
    let seeded = 0;
    const failures = [];
    for (const item of defs) {
      try {
        // Use a simpler, widely-compatible upsert
        const r = await Amenity.updateOne(
          { slug: item.slug },
          { $set: { name: item.name, slug: item.slug, scope: item.scope, type: item.type, description: item.description, icon: item.icon || '', active: true, order: Number(item.order)||0 } },
          { upsert: true }
        );
        // r.upsertedCount is available in newer drivers; fallback: count as seeded when matched or upserted
        const acknowledged = r.acknowledged !== false;
        if (acknowledged) seeded += 1;
      } catch (e) {
        failures.push({ slug: item.slug, name: item.name, error: e.message });
      }
    }
    const all = await Amenity.find({}).sort({ order: 1, name: 1 }).lean();
    res.json({ seeded, total: all.length, failures, amenities: all });
  } catch (e) {
    res.status(500).json({ message: 'Failed to seed amenities', error: e.message });
  }
});

module.exports = router;

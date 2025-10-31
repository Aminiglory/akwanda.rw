# AKWANDA.rw — Interactive User Guide

This guide focuses on how to use the system interactively — what you can do, what you see, and how the system responds at each step.

## How to use AKWANDA.rw (Desktop & Mobile)

This is a simple, non‑technical guide to help you find your way around on both desktop and mobile.

### Home and Finding Stays
- Go to the Home page `/`.
- Scroll to “Featured Apartments” to see the first 4 listings.
- Tap “View All Apartments” or open `/apartments` to see all properties.

### Apartments Listing (All Properties)
- Filters (top of the page):
  - Location (search box), Price Min/Max, Bedrooms, Amenities, Category, Dates, Guests.
- Results update automatically. Tap any card to open the property page.
- Mobile: filters are stacked; scroll if needed. Desktop: filters appear side‑by‑side.

### Property Details
- See images, description, rooms, and price per night.
- Tap “Book” to start your booking.

### Booking a Property (`/booking/:id`)
1) Pick dates and number of guests.
2) Optional: choose a Budget range to filter rooms.
3) Optional: choose a Promotion if available.
4) Check available rooms and select one.
5) Fill in your contact details and confirm.
- Payment: choose your preferred method. Cash on arrival is supported; some flows redirect to payment.
- After booking, you’ll see a confirmation screen and can monitor your booking status.

### Promotions (Deals)
- If a property has promotions, you’ll see them during booking as selectable chips.
- Selecting a promotion applies the discount to your total when possible.

### Favorites (Guest Mode)
- As a guest user, you can open `/favorites` from the top menu (desktop) or mobile menu.
- In owner mode, Favorites is hidden so your owner tools fit cleanly.

### Messages
- Open `/messages` to chat about a booking or ask questions.
- New messages show counters in the navbar; opening a conversation marks it as read.

### Notifications
- Open `/notifications` to see important updates:
  - Booking created/paid/confirmed/cancelled
  - Commission reminders (owners)
  - Reviews and other alerts
- Tap a notification to jump to the related page.

---

## Property Owners (Host Mode)

### Entering Owner Mode
- If you already have a host account, you’ll see owner links in the top bar.
- Desktop: a building icon with a dropdown lets you pick which property to manage.
- Mobile: open the menu. Under “Owner Tools,” you’ll see a compact “Select Property” list.

### Owner Dashboard (`/my-bookings` or `/dashboard`)
- Tabs: Dashboard, Reservations, Calendar, Finance, Analytics, Promotions, Reviews, Messages, Photos, Settings.
- Only the active tab’s content is shown; Dashboard shows quick summary cards.

### Manage Properties
- Add a new property at `/upload`.
- Edit an existing property at `/upload?edit=<propertyId>`.
- In edit mode, you’ll also see a Promotions summary with quick links:
  - Create Deal, Manage Deals.

### Promotions (Owner)
- Create and manage your deals under Promotions (or via the links on the Edit Property page).
- Active and published deals appear to guests and can be selected during booking.

### Calendar and Reservations
- Calendar shows availability by month. Use the property selector (desktop dropdown or mobile list) to switch properties.
- Reservations shows all bookings with filters for paid/pending/unpaid/cancelled.

### Finance & Analytics
- Finance: totals, paid/pending amounts.
- Analytics: trends (last 30/90 days, YTD).

### Reviews & Messages
- Reviews: read feedback and ratings from guests.
- Messages: reply to guest inquiries in real time.

### Cars & Attractions (Owner)
- Cars: manage your rental fleet at `/owner/cars`.
- Attractions: manage Rwanda‑based attractions you offer.

---

## Admins

### Admin Dashboard (`/admin`)
- View metrics (properties, bookings, users, revenue).
- Manage users: deactivate/reactivate or delete accounts (with related data). Use the three‑dots menu → View to open user details.
- Content and reports are accessible via admin links.

### Deleting Users
- Admin can delete a user account from the admin pages. The system also removes related data (properties, bookings, messages, etc.).

---

## Desktop vs Mobile Tips
- Navbar
  - Desktop: main menu across the top; owner property selector is a dropdown button.
  - Mobile: open the menu (☰). Owner property selector appears inside “Owner Tools.”
- Overflow safety: menus and cards scale to fit without overlapping.

## Quick Links
- Find stays: `/apartments`
- Property details: `/apartment/:id`
- Booking flow: `/booking/:id`
- Booking confirmation: `/booking-confirmation/:id`
- Notifications: `/notifications`
- Owner dashboard: `/my-bookings`
- Add/Edit property: `/upload` (or `/upload?edit=<id>`)
- Manage cars: `/owner/cars`
- Admin dashboard: `/admin`

## Policies (Simple)
- Owners cannot book their own properties.
- You can usually cancel before check‑in starts. After that, cancellations may be limited.
- Availability respects confirmed bookings and owner‑locked dates.

Need help? Open `/support` or reach out via the contact options provided in your account area.

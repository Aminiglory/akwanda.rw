# AKWANDA.rw — Interactive User Guide

This guide focuses on how to use the system interactively — what you can do, what you see, and how the system responds at each step.

## Guest Experience

- **Search stays**: Go to `/apartments`. As results load, you’ll see skeleton cards. Filter by location, budget, bedrooms, dates, and guests.
- **Open property**: Click a card to open the details page. Images are lazy‑loaded and always show a fallback if any image fails.
- **Choose a room**: View available rooms and their monthly/nightly prices. A read‑only availability calendar explains booked/locked periods.
- **Plan your stay**: In `/booking/:id`, enter check‑in/out, guests, and budget. Inputs have clear icons and spacing. Your choices are remembered (local storage).
- **See availability**: The rooms list is deduplicated. If your previously chosen room becomes unavailable for your new dates, it stays visible with an “Unavailable” label and a message showing your chosen date range.
- **Book and pay**: Complete the booking and choose the payment method. After mobile money payment, your booking becomes “Paid” but remains “Pending” until the property owner confirms.
- **Track status**: The confirmation page at `/booking-confirmation/:id` shows:
  - “Awaiting Confirmation” while pending.
  - “Booking Confirmed!” after the owner confirms.
  - A “Cancel booking” button appears when you can cancel (before check‑in).
- **Notifications**: Open `/notifications` to see system messages. Use Open to view the booking or actions like Confirm (owners only). Items you open or act on are marked as read.
- **Rate your stay**: After checkout, you’ll see a quick star‑rating in the confirmation page and in “My Bookings”. Ratings notify the owner.

## Property Owner Experience

- **Receive alerts**: You get notifications when a booking is created or paid. You also receive a commission‑due notification so you know a commission will be applied.
- **Confirm bookings**: From `/notifications` or the booking confirmation page, press “Confirm this booking” to finalize the reservation.
- **Lock dates**: If you lock a date range for maintenance or personal use, those dates become unavailable in availability checks.
- **Cancellations**: You can cancel your property’s bookings before check‑in if needed (guests and admins might also be able to cancel based on policy). All parties are notified.
- **Reviews**: When guests leave reviews after checkout, you receive a notification to keep improving quality.

## Admin Experience

- **System visibility**: Admin receives global notifications (including commission‑due and commission‑paid) to track finances.
- **Commission control**: Admin can mark commission as paid; the system notifies both admin (global) and the property owner.
- **Access control**: Admin can view bookings and use admin‑only functions. Owners cannot book their own properties.

## Common Interactions and States

- **Loading**: The app uses skeleton loaders while lists or pages fetch data (e.g., apartments list, availability checks, confirmations).
- **Empty**: Pages like notifications and confirmation show clear empty or not‑found messages with suggested actions.
- **Errors**: A global error boundary ensures friendly fallbacks with options to reload or go home.
- **Images**: All key images are lazy‑loaded and switch to a placeholder automatically if an image fails, ensuring visuals are never broken.

## Quick Paths

- **Find a stay** → `/apartments`
- **Property details** → `/apartment/:id`
- **Booking flow** → `/booking/:id`
- **Confirmation** → `/booking-confirmation/:id`
- **Notifications** → `/notifications`
- **My bookings** → `/my-bookings`

## Statuses & Notifications at a Glance

- **Statuses**: `pending`, `confirmed`, `cancelled`, `ended` (booking).
- **Payment**: `unpaid`, `pending`, `paid`.
- **Notifications**: `booking_created`, `booking_paid`, `booking_confirmed`, `booking_cancelled`, `commission_due`, `commission_paid`, `review_received`, plus account/admin events.

## Policies and Rules

- **Owner self‑booking**: Owners cannot book their own properties.
- **Cancellation**: By default, you cannot cancel after check‑in starts (owners/admins may have exceptions where allowed).
- **Availability**: Booked dates and owner‑locked dates are enforced; overlapping bookings are rejected.

If you need a deeper, developer‑oriented reference (endpoints, files), check the code comments and routes as needed. This guide is focused on how you interact with the system day‑to‑day.

-- Migration: add_listing_price_unit
-- Adds an optional priceUnit column to listings.
-- Stores the unit of the price (e.g. '/month', '/year', '/kg', 'unit').
-- Defaults to NULL which the application treats as 'unit' (one-off sale).

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS price_unit VARCHAR(20) DEFAULT NULL;

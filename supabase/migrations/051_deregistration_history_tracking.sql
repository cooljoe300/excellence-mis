-- PART 1: Add 'deregistered' status to enrollment_status enum
-- This must be run first and committed separately before part 2
ALTER TYPE enrollment_status ADD VALUE IF NOT EXISTS 'deregistered';
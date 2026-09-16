# Deregistration History System - Test Plan

## Implementation Summary

### Database Changes (Migration 051)
- Added 'deregistered' status to enrollment_status enum
- Added deregistration tracking fields to enrollments table:
  - `deregistered_at` - timestamp when enrollment was deregistered
  - `deregistered_by` - profile ID of who deregistered (student/admin)
  - `deregistration_reason` - reason for deregistration
- Created `deregistered_units_view` for easy querying
- Created `get_deregistered_units()` function with filtering capabilities
- Created `count_deregistered_units()` function for pagination

### Code Changes
1. **Updated deregistration logic** - Now marks enrollments as 'deregistered' instead of deleting
2. **Added reactivation logic** - Can reactivate previously deregistered units
3. **Updated fee integration** - Excludes deregistered units from fee calculations
4. **Added Deregistered Units admin page** - Full history with filtering and export
5. **Updated student registration page** - Shows active vs deregistered units separately
6. **Added menu item** - Admin → Deregistered Units

## Test Scenarios

### 1. Initial Registration
- **Test**: Student registers for units in a term
- **Expected**: Creates active enrollments and ONE fee payment record
- **Verification**: 
  - Check that enrollments have status='active'
  - Check that only one fee_payment exists for student+term
  - Check that fee_payment_items are created for each unit

### 2. Unit Deregistration (Student Request)
- **Test**: Student submits deregistration request for one unit
- **Expected**: 
  - Request is created in student_deregistration_requests table
  - Admin approves the request
  - Enrollment status changes to 'deregistered'
  - deregistered_at, deregistered_by, deregistration_reason are set
  - Fee payment is updated (amount reduced, fee_payment_item removed)
- **Verification**:
  - Check enrollment status='deregistered'
  - Check deregistration tracking fields are populated
  - Check fee_payment amount is reduced
  - Check fee_payment_item for deregistered unit is removed
  - Check record appears in Deregistered Units page

### 3. Unit Deregistration (Admin Direct)
- **Test**: Admin directly removes a unit from student registration
- **Expected**: 
  - Enrollment status changes to 'deregistered'
  - All tracking fields are populated with admin details
  - Fee payment is updated
- **Verification**: Same as above but with admin as deregistered_by

### 4. Unit Re-registration (Reactivation)
- **Test**: Student registers a unit that was previously deregistered
- **Expected**: 
  - Existing enrollment is reactivated (status='deregistered' → 'active')
  - deregistered_at, deregistered_by, deregistration_reason are cleared
  - Fee payment is updated (new fee_payment_item added)
  - No new enrollment record is created
- **Verification**:
  - Check enrollment status='active'
  - Check deregistration fields are null
  - Check only one enrollment exists for student+term+course
  - Check fee_payment is updated, not duplicated

### 5. Unit Re-registration (New Unit)
- **Test**: Student registers a completely new unit (not previously deregistered)
- **Expected**: 
  - New enrollment record is created with status='active'
  - Fee payment is updated with new fee_payment_item
- **Verification**:
  - Check new enrollment exists with status='active'
  - Check fee_payment is updated
  - Check no duplicate fee payments are created

### 6. Multiple Unit Changes
- **Test**: Student deregisters multiple units and registers multiple new units
- **Expected**: 
  - All deregistered units have proper tracking
  - All new units are properly enrolled
  - Fee payment is consolidated
- **Verification**:
  - Check all deregistered units appear in Deregistered Units page
  - Check fee payment is one consolidated record
  - Check fee_payment_items reflect current active units only

### 7. Payment Preservation
- **Test**: Student has made payments, then changes units
- **Expected**: 
  - Existing payments remain attached to the same fee payment record
  - Payments are not duplicated
- **Verification**:
  - Check amount_paid is preserved
  - Check payment history remains intact
  - Check fee_payment record count remains 1

### 8. Discount Preservation
- **Test**: Student has discounts applied, then changes units
- **Expected**: 
  - Discounts remain intact on the fee payment record
  - Discount history is preserved
- **Verification**:
  - Check discount_amount and discount_percentage are preserved
  - Check fee_discount_history records are intact

### 9. Fee Calculation After Deregistration
- **Test**: Verify that deregistered units are not counted in fee calculations
- **Expected**: 
  - Fee payment amount reflects only active units
  - Balance calculation excludes deregistered units
- **Verification**:
  - Check fee_payment.amount equals sum of active unit fees
  - Check fee_payment_items only include active enrollments
  - Check getUnbilledEnrollmentsForCourses excludes deregistered units

### 10. Deregistered Units Page
- **Test**: Admin accesses Deregistered Units page
- **Expected**: 
  - Shows all deregistered units with complete information
  - Filtering works (search, program, intake, term, course, date range)
  - Export functionality works
- **Verification**:
  - Check page loads without errors
  - Check all filters work correctly
  - Check CSV export contains all required fields
  - Check pagination works

### 11. Student Registration Page Display
- **Test**: Student views registration page
- **Expected**: 
  - Active units shown in main list
  - Deregistered units shown separately in "Previously Registered Units" section
  - Clear visual distinction between active and deregistered
- **Verification**:
  - Check active units are selectable
  - Check deregistered units are not selectable
  - Check deregistered units are visually distinct (red background, strikethrough price)
  - Check reactivation works when selecting deregistered unit

### 12. Unique Constraint Testing
- **Test**: Attempt to create duplicate active enrollment for same student+term+course
- **Expected**: Database constraint prevents creation
- **Verification**: 
  - Check UNIQUE constraint on enrollments(student_id, course_id, term_id) prevents duplicates
  - Check reactivation logic handles the constraint properly

## Database Migration Testing

### Migration 051
- **Test**: Run migration in Supabase SQL Editor
- **Expected**: 
  - enrollment_status enum adds 'deregistered' value
  - enrollments table gets new columns
  - Indexes are created
  - View and functions are created successfully
- **Verification**:
  - Check migration runs without errors
  - Check new columns exist in enrollments table
  - Check view returns correct data
  - Check functions execute correctly

## Success Criteria

✅ Student registers units → one fee record created  
✅ Student deregisters a unit → enrollment marked as deregistered, fee record updated  
✅ Student registers a replacement unit → fee record updated, no duplicates  
✅ Payments remain intact after unit changes  
✅ Discounts/waivers remain intact after unit changes  
✅ Balance recalculates correctly after unit changes  
✅ No duplicate fee records are generated  
✅ Deregistered units appear in Deregistered Units page  
✅ Deregistered units are excluded from fee calculations  
✅ Student registration page shows active vs deregistered units  
✅ Deregistration history is preserved with tracking information  
✅ Reactivation of deregistered units works correctly  
✅ Admin and student deregistrations are properly tracked  
✅ Export functionality works for deregistration history  

## Manual Testing Steps

1. **Run Migration 051**
   - Go to Supabase SQL Editor
   - Run the contents of supabase/migrations/051_deregistration_history_tracking.sql
   - Verify no errors occur

2. **Test Basic Registration**
   - Go to student enrollment page
   - Register for 3 units
   - Check /dashboard/fees - should show ONE record
   - Verify enrollments have status='active'

3. **Test Student Deregistration**
   - Go to student deregistration page
   - Submit deregistration request for 1 unit
   - Admin approves the request
   - Check /dashboard/deregistered-units - should show the deregistered unit
   - Check /dashboard/fees - should still show ONE record with reduced amount
   - Verify enrollment status='deregistered' with tracking fields

4. **Test Unit Reactivation**
   - Go to student enrollment page
   - Register the same unit that was deregistered
   - Check that it appears in active units (not as new)
   - Check /dashboard/fees - amount should be updated
   - Verify enrollment status='active' with cleared tracking fields

5. **Test Admin Deregistration**
   - Admin goes to /dashboard/enrollments
   - Removes a unit from student registration
   - Check /dashboard/deregistered-units - should show the deregistered unit
   - Verify admin is listed as deregistered_by

6. **Test Deregistered Units Page**
   - Go to /dashboard/deregistered-units
   - Test all filters (search, program, intake, term, course, date range)
   - Test export functionality
   - Test pagination

7. **Test Student Registration Display**
   - Go to student enrollment page
   - Verify active units shown in main list
   - Verify deregistered units shown separately
   - Try to register a deregistered unit (should reactivate)

8. **Test Fee Integration**
   - Make a payment on a fee record
   - Deregister a unit
   - Verify payment remains attached to same fee record
   - Verify amount is recalculated correctly
   - Verify balance is updated correctly

## Edge Cases to Consider

1. **Concurrent Deregistration**: Multiple admins try to deregister same unit
2. **Grade Protection**: Ensure units with grades cannot be deregistered
3. **Full Withdrawal**: Ensure full withdrawal marks all units as deregistered
4. **Term Boundaries**: Ensure deregistration history respects term boundaries
5. **Data Integrity**: Ensure no orphaned fee_payment_items after deregistration
6. **Performance**: Ensure queries perform well with large deregistration history

## Rollback Plan

If issues occur, rollback steps:
1. Delete deregistration tracking columns from enrollments table
2. Remove 'deregistered' from enrollment_status enum
3. Revert code changes to delete enrollments instead of marking as deregistered
4. Remove Deregistered Units page and menu item
5. Remove view and functions from database
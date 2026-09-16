# Fee Consolidation Test Plan

## Test Scenarios

### 1. Initial Registration
- **Test**: Student registers for units in a term
- **Expected**: Creates ONE fee payment record with fee_payment_items for each unit
- **Verification**: Check that only one fee_payment exists for student+term

### 2. Unit Deregistration  
- **Test**: Student deregisters one unit
- **Expected**: Updates existing fee payment by removing the corresponding fee_payment_item and recalculating amount
- **Verification**: Check that fee_payment record count remains 1, amount is reduced, and the deregistered unit's item is removed

### 3. Unit Re-registration
- **Test**: Student registers a replacement unit after deregistration
- **Expected**: Updates existing fee payment by adding new fee_payment_item and recalculating amount
- **Verification**: Check that fee_payment record count remains 1, amount is updated, and new unit's item is added

### 4. Multiple Unit Changes
- **Test**: Student deregisters multiple units and registers multiple new units
- **Expected**: Updates existing fee payment with all changes in one operation
- **Verification**: Check that fee_payment record count remains 1, all changes are reflected

### 5. Payment Preservation
- **Test**: Student has made payments, then changes units
- **Expected**: Existing payments remain attached to the same fee payment record
- **Verification**: Check that amount_paid is preserved and payment history is intact

### 6. Discount Preservation
- **Test**: Student has discounts applied, then changes units
- **Expected**: Discounts remain intact on the fee payment record
- **Verification**: Check that discount_amount and discount history are preserved

## Database Migration Testing

### Migration 050
- **Test**: Run consolidation function on existing duplicate records
- **Expected**: Multiple fee_payment records for same student+term are consolidated into one
- **Verification**: 
  - Check that consolidation function returns success
  - Verify that only one fee_payment exists per student+term
  - Verify that all fee_payment_items are preserved
  - Verify that all fee_payment_submissions are preserved
  - Verify that payment amounts are correctly summed
  - Verify that payment history is intact

### Unique Constraint Testing
- **Test**: Attempt to create duplicate fee_payment for same student+term
- **Expected**: Database constraint prevents creation of duplicate active fee payments
- **Verification**: Check that insert fails with constraint violation

## API Testing

### createFeeInvoiceForEnrollments
- **Test**: Call function with new enrollments for student with existing fee payment
- **Expected**: Updates existing fee payment instead of creating new one
- **Verification**: Check that function returns existing fee_payment_id and updated amount

### getFeePayments
- **Test**: Query fee payments for students with multiple terms
- **Expected**: Returns consolidated view with unit details
- **Verification**: Check that response includes fee_payment_items with course details

## Manual Testing Steps

1. **Test Initial Registration**
   - Go to student enrollment page
   - Register for 3 units
   - Check /dashboard/fees - should show ONE record for the student
   - Verify the record shows all 3 units in the description/items

2. **Test Deregistration**
   - Go to student deregistration page
   - Deregister 1 unit
   - Check /dashboard/fees - should still show ONE record
   - Verify the amount is reduced and the deregistered unit is removed

3. **Test Re-registration**
   - Go to student enrollment page
   - Register a different unit
   - Check /dashboard/fees - should still show ONE record
   - Verify the amount is updated and the new unit is added

4. **Test Payment Preservation**
   - Make a payment on the fee record
   - Then deregister/register units
   - Check /dashboard/fees - payment should still be attached to the same record

5. **Test Dashboard Display**
   - Verify that /dashboard/fees shows unit details in an expandable format
   - Verify that the display shows the correct total, paid amount, and balance

## Success Criteria

✅ Student registers units → one fee record created
✅ Student deregisters a unit → same fee record updated  
✅ Student registers a replacement unit → same fee record updated
✅ Payments remain intact after unit changes
✅ Discounts/waivers remain intact after unit changes
✅ Balance recalculates correctly after unit changes
✅ No duplicate fee records are generated
✅ Dashboard displays consolidated student records with unit details
✅ Database consolidation function works correctly
✅ Unique constraint prevents future duplicates
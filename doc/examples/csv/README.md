# CSV Import Examples

This directory contains example CSV files for testing the CSV import functionality in EditDor.

## Files

### `valid.csv`

A valid CSV file with correct data types and Modbus entities. This file should import without warnings.

**Valid Types:**

- `number`
- `string`
- `boolean`

**Valid Modbus Entities:**

- `HoldingRegister`
- `InputRegister`
- `Coil`
- `DiscreteInput`

### `invalid.csv`

A CSV file with intentional validation issues to demonstrate the warning system. When imported, this file will trigger the following warnings:

1. **Row 2, type**: `number123` is invalid (should be `number`, `string`, or `boolean`)
2. **Row 2, modbus:entity**: `holdingregister` has incorrect casing (expected `HoldingRegister`)
3. **Row 3, modbus:entity**: `InvalidRegister` is not a recognized Modbus entity
4. **Row 4, type**: `invalid_type` is not a valid type
5. **Row 5, modbus:entity**: `coil` has incorrect casing (expected `Coil`)

## Usage

1. Open EditDor
2. Select "Thing Description" or "Thing Model"
3. Click "Load a CSV File"
4. Select either `valid.csv` or `invalid.csv`
5. Observe the results:
   - `valid.csv`: Should load successfully without warnings
   - `invalid.csv`: Should display validation warnings but still load the data

## CSV Format

Required columns:

- `name`: Property name (required)
- `type`: Data type (number, string, or boolean)
- `modbus:entity`: Modbus entity type
- `modbus:address`: Modbus address (required)
- `modbus:unitID`: Modbus unit ID
- `modbus:quantity`: Number of registers
- `modbus:zeroBasedAddressing`: Boolean (true/false)
- `modbus:function`: Modbus function code
- `modbus:mostSignificantByte`: Boolean (true/false)
- `modbus:mostSignificantWord`: Boolean (true/false)
- `href`: Property endpoint path

Note: Modbus entity validation is case-insensitive for recognition purposes, but incorrect casing will produce a warning. For example, `coil` and `Coil` are treated as the same entity, but `coil` will generate a casing warning.

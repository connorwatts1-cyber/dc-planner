# DC Planner

DC Planner is a Vite, React, TypeScript, and Material UI application for distribution-centre labour planning. It combines MyTime schedules, STP demand, resource settings, capability calculations, and daily assignment planning.

## Running the app

From the project root:

```powershell
npm install
npm run dev
```

Open the local URL printed by Vite, normally `http://localhost:5173/dc-planner/`.

This project also includes a Windows Node.js bundle. Use it when `npm` is not available on the system PATH:

```powershell
$env:Path = (Resolve-Path .\tools\node-v24.18.1-win-x64).Path + ';' + $env:Path
npm install
npm run dev
```

For a production build:

```powershell
npm run build
```

## Application pages

### Planning

The weekly planning view compares forecast demand with scheduled productive hours. It includes inbound and outbound volume, truck assumptions, role capacity, capability, variance, and redeployment recommendations.

### Day Planner

Day Planner is the operational daily planning surface.

1. Select a planning date and shift.
2. Review the MyTime employees assigned to that date.
3. Review role cards grouped by work role.
4. Click an employee card to edit their role, start time, finish time, or hours.
5. Use the `+` roster control to search the complete MyTime employee population and add someone to the selected day.
6. Remove no-shows or restore removed employees from the roster editor.
7. Use the move planner to review balanced role moves. Moves can be applied individually or all at once.
8. Use `Export PDF` to print a compact one-page summary containing the selected date, shift, all configured roles, people, hours, pallets, KPI, trucks, and employee details.

Changing start or finish time recalculates hours automatically, including overnight shifts. Changing a role moves the employee's hours into the new role immediately.

### Follow Up

Reviews historical weekly volume, login hours, required hours, capability, absence, and role-level productive hours. MyTime absence data is used when available; Settings assumptions fill gaps.

### KPI Dashboard

Shows role productivity against configured targets, target hours, productive hours, variance, capability, and achieved weeks. A PowerPoint KPI pack can be exported.

### Scenario Tool

Tests staffing and volume scenarios using truck counts, volume uplifts, and inbound/outbound adjustments without changing the base plan.

### Headcount and Holiday Planning

Headcount converts monthly MTP volume and assumptions into FTE need. Holiday Planning compares holiday assumptions or uploaded holiday data against volume and available hours.

### Settings

Settings is the source of truth for role definitions, role type, resource assumptions, truck capacity, pallet size, deductions, and daily/shift demand profiles.

### Import / Export

Upload source documents and export MIP, KPI, and executive summary outputs. Uploaded files are shared across the application.

## Source files

### MyTime schedule

Upload the employee-level MyTime schedule export as `Schedule`. The expected fields include:

- `Shift Employee Name` or `Shift Employee`
- `Shift Date`
- `Scheduled Start Time`
- `Scheduled End Date`
- `Scheduled Hours`
- `WorkRole`

Department and location fields such as `Shift Employee Home Location Name` and `Shift Location Name` are not employee names.

### STP demand

Upload the STP forecast as `STP`. STP measures are mapped to configured roles such as DC Tipping, Transit Tipping, Bayclearing, DC Loading, Transit Loading, Picking, Replens, Cycles, Banding, and Booking.

### Other sources

The application also supports MTP, absence, paid-hours, actual-volume, M2-history, and holiday files. See Import / Export for the available upload types.

## Definitions and calculations

### Hours

Roster hours are the scheduled or manually adjusted hours for employees in the selected date and shift. Productive hours may be lower after Settings deductions such as breaks, travel, handover, inspection, training, and rejection time.

### People

People is the count of distinct employee rows currently included in the selected plan. Removing a person removes their hours from the role. Adding a person adds them to the selected day and shift.

### KPI

KPI is the configured role productivity rate from Settings. It is treated as static for the plan. It is not the same as capability.

### Pallets

Role capacity is calculated from scheduled hours and the configured role KPI:

`available pallets = assigned hours × KPI (pallets per hour)`

Demand pallets are derived from demand volume and the Settings pallet size:

`demand pallets = demand volume (m3) ÷ m3 per pallet`

### Capability

Capability compares available capacity with demand:

`capability = available pallets ÷ demand pallets × 100`

100% means the role has enough calculated capacity for the selected demand. Below 100% indicates a gap; above 100% indicates surplus capacity.

### Trucks

Truck estimates use the Settings truck-volume assumption:

`trucks = volume (m3) ÷ truck volume (m3 per truck)`

Inbound and outbound volume, pallets, and trucks are linked in Day Planner. Editing one recalculates the other two.

### Recommended moves

Recommendations use a finite balancing simulation. A move is suggested only when moving an employee reduces the capability gap between roles and does not leave the donor role less capable than the receiving role. The planner avoids reusing the same person within one recommendation plan.

## Local storage

Role configuration, resource mapping, upload records, scope selections, and theme settings are persisted in browser `localStorage`. This means the data is local to the browser and is not a shared server database.

## Troubleshooting

### `npm` is not recognized

Use the bundled Node.js PATH command in the Running the app section, or install Node.js and add it to the system PATH.

### The app shows old uploaded data

Uploads are cached in browser local storage. On the relevant upload control:

1. Click `Clear schedule cache` or `Clear STP Cache`.
2. Upload the source file again.
3. Refresh the page if necessary.

### Department appears as the employee name

Confirm that the source file contains `Shift Employee Name` or `Shift Employee`. `Shift Employee Home Location Name` and `Shift Location Name` are department/location fields. Clear the schedule cache and upload the employee-level MyTime export again.

### Names or dates are missing

Check that the file is an employee-level MyTime schedule and that it contains employee name, date, start/end time, role, and hours columns. A department-level or summary report cannot populate individual employees.

### The role list contains duplicates

Day Planner canonicalizes common aliases, including Pick/Picking, Transit Load/Transit Loading, Transit Tip/Transit Tipping, Transit Bay/Bayclearing (Transit), Bayclearing/Bayclearing (DC), and Replenishment/Replens. If a new label is not recognized, update the role mapping or Settings role name.

### The role menu or employee dropdown appears behind the overlay

Refresh the app with `Ctrl+F5`. The application raises the MUI menu, popover, modal, and autocomplete layers above the roster editor.

### Hours do not match the source after editing times

Start and finish changes recalculate hours, including overnight shifts. If the value still looks stale, close and reopen the employee editor. Manual hours can also be entered directly for overtime adjustments.

### No recommendations appear

Recommendations require demand and schedule data for the selected date/shift. Confirm that both MyTime Schedule and STP files are uploaded, that the selected date has schedule rows, and that the role has a configured KPI and mapped demand.

### The PDF is more than one page

Use the `Export PDF` button and choose landscape A4 in the browser print dialog. The print layout is designed as a compact one-page summary, but browser print margins and unusually long employee lists can affect pagination.

## Developer checks

```powershell
npm run build
```

The build runs TypeScript compilation and the Vite production build.

import React, { useMemo, useState } from 'react';
import { Alert, Autocomplete, Box, Button, Card, CardContent, Chip, Grid, MenuItem, Paper, Select, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DownloadIcon from '@mui/icons-material/Download';
import * as XLSX from 'xlsx';
import PageHeader from '../components/PageHeader';
import UploadComponent from '../components/UploadComponent';
import { usePlannerContext } from '../context/PlannerContext';
import { buildDailyShiftCapabilityRows, productiveHoursByScheduleRecord } from '../services/analytics';
import { buildStpDemandPlan, getRoleTargetRate, stpRoleMappingConfig } from '../services/stpMappingService';
import MoveQueuePopover from '../components/MoveQueuePopover';
import RosterAdjustments from '../components/RosterAdjustments';
import RoleAssignmentCards from '../components/RoleAssignmentCards';
import RoleKpiOverview from '../components/RoleKpiOverview';
import FlowValueInput from '../components/FlowValueInput';

type PlannerRow = { id: string; name: string; shift: string; date: string; start: string; end: string; role: string; hours: number };
type PlannerChange = { timestamp: string; date: string; shift: string; action: string; employee: string; role: string; field: string; before: string | number; after: string | number; details: string };
const numberValue = (value: unknown) => Number(value) || 0;
const dateKey = (value: unknown) => { const raw = String(value ?? '').trim(); const uk = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/); return uk ? `${uk[3]}-${uk[2].padStart(2, '0')}-${uk[1].padStart(2, '0')}` : raw.slice(0, 10); };
const roleKey = (value: string) => value.toLowerCase().replace(/[^a-z]+/g, '');
const roleMatches = (value: string, target: string) => roleKey(value) === roleKey(target) || roleKey(value).includes(roleKey(target)) || roleKey(target).includes(roleKey(value));
const canonicalPlannerRole = (value: string) => {
  const normalized = roleKey(value);
  const aliases: Record<string, string> = {
    pick: 'Picking',
    picking: 'Picking',
    transitload: 'Transit Loading',
    transitloading: 'Transit Loading',
    transittip: 'Transit Tipping',
    transittipping: 'Transit Tipping',
    transitbay: 'Bayclearing (Transit)',
    transitbayclearing: 'Bayclearing (Transit)',
    bayclearingtransit: 'Bayclearing (Transit)',
    bayclearingdc: 'Bayclearing (DC)',
    bayclearing: 'Bayclearing (DC)',
    replenishment: 'Replens',
    replen: 'Replens',
    replens: 'Replens'
  };
  return aliases[normalized] ?? value;
};
const looksLikeDepartment = (value: string) => /(^|[_ -])dep([_ -]|$)|department|dt\d{5,}/i.test(value.trim());
const roleColours: Record<string, { accent: string; background: string }> = {
  dctipping: { accent: '#d97706', background: '#fff7ed' },
  transittipping: { accent: '#0891b2', background: '#ecfeff' },
  bayclearingdc: { accent: '#2563eb', background: '#eff6ff' },
  bayclearingtransit: { accent: '#4f46e5', background: '#eef2ff' },
  cycles: { accent: '#7c3aed', background: '#f5f3ff' },
  dcloading: { accent: '#dc2626', background: '#fef2f2' },
  transitloading: { accent: '#be123c', background: '#fff1f2' },
  replens: { accent: '#15803d', background: '#f0fdf4' },
  picking: { accent: '#0f766e', background: '#f0fdfa' },
  booking: { accent: '#9333ea', background: '#faf5ff' },
  banding: { accent: '#a16207', background: '#fefce8' }
};
const colourForRole = (role: string) => roleColours[roleKey(role)] ?? { accent: '#475569', background: '#f8fafc' };
const shiftFromTime = (value: unknown) => { const match = String(value ?? '').match(/(?:^|T)(\d{1,2}):/); if (!match) return 'Unspecified'; const hour = Number(match[1]); return hour >= 22 ? 'Night' : hour < 14 ? 'AM' : 'PM'; };
const displayTime = (value: unknown) => { const text = String(value ?? ''); const match = text.match(/(?:T|\s)(\d{1,2}):(\d{2})/); return match ? `${match[1].padStart(2, '0')}:${match[2]}` : text; };
const weekCodeForDate = (value: string) => { const date = new Date(`${value}T00:00:00`); const day = date.getDay() || 7; date.setDate(date.getDate() + 4 - day); const yearStart = new Date(date.getFullYear(), 0, 1); return `${date.getFullYear()}${String(Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)).padStart(2, '0')}`; };
const streamForRole = (value: string) => { const normalized = roleKey(value); if (normalized.includes('transittip')) return 'transitInbound'; if (normalized.includes('transitload')) return 'transitOutbound'; if (normalized.includes('bayclearingtransit')) return 'transitInbound'; if (normalized.includes('dcload')) return 'dcOutbound'; if (normalized.includes('dctip') || normalized.includes('banding') || normalized.includes('booking') || normalized.includes('bayclearingdc')) return 'dcInbound'; if (normalized.includes('cycles')) return 'cycles'; return 'picking'; };

export default function DayPlannerPage() {
  const { scopedUploadedFiles, roles, resourceMapping } = usePlannerContext();
  const scheduleFile = scopedUploadedFiles.find(file => file.kind === 'schedule' && file.status === 'parsed');
  const demandFiles = scopedUploadedFiles;
  const sourceRows = scheduleFile?.records ?? [];
  const hasEmployeeNames = sourceRows.some(row => {
    const name = String(row.employeeName ?? row.name ?? '').trim();
    const location = String(row.shiftlocationname ?? '').trim();
    return Boolean(name) && !looksLikeDepartment(name) && name !== location;
  });
  const availableDates = Array.from(new Set(sourceRows.map(row => dateKey(row.date ?? row.shiftdate)).filter(value => /^\d{4}-\d{2}-\d{2}$/.test(value)))).sort();
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedShift, setSelectedShift] = useState('All');
  const [roleOverrides, setRoleOverrides] = useState<Record<string, string>>({});
  const [draggedPerson, setDraggedPerson] = useState<PlannerRow | null>(null);
  const [dragOverRole, setDragOverRole] = useState<string | null>(null);
  const [appliedMoveKeys, setAppliedMoveKeys] = useState<string[]>([]);
  const [selectedMovePeople, setSelectedMovePeople] = useState<Record<string, string>>({});
  const [removedPeople, setRemovedPeople] = useState<Record<string, PlannerRow>>({});
  const [addedPeople, setAddedPeople] = useState<Record<string, PlannerRow>>({});
  const [hourOverrides, setHourOverrides] = useState<Record<string, number>>({});
  const [timeOverrides, setTimeOverrides] = useState<Record<string, { start: string; end: string }>>({});
  const [rosterPaneOpen, setRosterPaneOpen] = useState(false);
  const [selectedRosterPerson, setSelectedRosterPerson] = useState<PlannerRow | null>(null);
  const [plannerChanges, setPlannerChanges] = useState<PlannerChange[]>([]);
  const recordChange = (change: Omit<PlannerChange, 'timestamp' | 'date' | 'shift'>) => setPlannerChanges(current => [...current, { ...change, timestamp: new Date().toISOString(), date: effectiveDate, shift: selectedShift }]);
  const effectiveDate = availableDates.includes(selectedDate) ? selectedDate : availableDates[0] ?? '';
  const operationalRoles = roles.filter(role => role.type === 'Operational');

  const plannerRows = useMemo<PlannerRow[]>(() => [...sourceRows.filter(row => dateKey(row.date ?? row.shiftdate) === effectiveDate), ...Object.values(addedPeople)].map((row, index) => {
    const record = row as Record<string, string | number>;
    const name = String(record.name ?? record.employeeName ?? record.worker ?? record.resource ?? 'Unnamed');
    const role = String(record.role ?? record.workrole ?? record.originalRole ?? 'Unassigned');
    const id = `${name}-${row.start ?? ''}-${index}`;
    const start = String(record.start ?? record.shiftstarttime ?? record.scheduledstarttime ?? '');
    const baseHours = numberValue(record.scheduledHours ?? record.hours);
    const baseEnd = displayTime(record.end ?? record.shiftendtime ?? record.scheduledendtime ?? '');
    return { id, name, date: effectiveDate, shift: String(record.shift ?? record.shiftName ?? shiftFromTime(start)), start: timeOverrides[id]?.start ?? displayTime(start), end: timeOverrides[id]?.end ?? baseEnd, role: canonicalPlannerRole(roleOverrides[id] ?? role), hours: hourOverrides[id] ?? baseHours };
  }).filter(row => (selectedShift === 'All' || row.shift.toLowerCase().includes(selectedShift.toLowerCase())) && !removedPeople[row.id]), [sourceRows, effectiveDate, roleOverrides, selectedShift, hourOverrides, timeOverrides, removedPeople, addedPeople]);
  const roleGroups = useMemo(() => Array.from(plannerRows.reduce((groups, row) => {
    const group = groups.get(row.role) ?? [];
    group.push(row);
    groups.set(row.role, group);
    return groups;
  }, new Map<string, PlannerRow[]>()).entries()).sort(([left], [right]) => left.localeCompare(right)), [plannerRows]);
  const productiveHoursByPerson = useMemo(() => {
    const productivityRecords = plannerRows.map(person => ({
      name: person.name,
      role: person.role,
      date: person.date,
      scheduledHours: person.hours,
      hours: person.hours,
      shiftstarttime: person.start,
      shiftendtime: person.end
    }));
    const calculatedHours = productiveHoursByScheduleRecord(productivityRecords, resourceMapping, false);
    return new Map(plannerRows.map((person, index) => [person.id, calculatedHours.get(productivityRecords[index]) ?? 0]));
  }, [plannerRows, resourceMapping]);
  const allMyTimePeople = useMemo(() => sourceRows.map((row, index) => {
    const name = String(row.name ?? row.employeeName ?? row.worker ?? 'Unnamed');
    const role = canonicalPlannerRole(String(row.role ?? row.workrole ?? 'Unassigned'));
    const start = displayTime(row.start ?? row.shiftstarttime ?? '');
    return { id: `${name}-${row.start ?? ''}-${index}`, name, date: dateKey(row.date ?? row.shiftdate), shift: String(row.shift ?? row.shiftName ?? shiftFromTime(start)), start, end: displayTime(row.end ?? row.shiftendtime ?? ''), role, hours: numberValue(row.scheduledHours ?? row.hours) };
  }).filter((person, index, people) => people.findIndex(candidate => candidate.name === person.name) === index), [sourceRows]);
  const roleSummary = operationalRoles.map(role => { const people = plannerRows.filter(row => canonicalPlannerRole(row.role) === canonicalPlannerRole(role.role) || canonicalPlannerRole(row.role) === canonicalPlannerRole(role.translation)); return { role: canonicalPlannerRole(role.translation || role.role), people: people.length, hours: people.reduce((sum, row) => sum + row.hours, 0), productiveHours: people.reduce((sum, person) => sum + (productiveHoursByPerson.get(person.id) ?? 0), 0) }; }).filter(row => row.people > 0 || row.hours > 0);
  const totalHours = plannerRows.reduce((sum, row) => sum + row.hours, 0);
  const productiveHours = plannerRows.reduce((sum, person) => sum + (productiveHoursByPerson.get(person.id) ?? 0), 0);
  const demandByRole = roleSummary.map(row => { const configured = operationalRoles.find(role => roleMatches(role.role, row.role)); const rate = Number(configured?.targetRate ?? configured?.palletsPerHour ?? 0); return { ...row, demand: rate > 0 ? row.hours * rate : 0, rate }; });
  const dailyCapabilityRows = buildDailyShiftCapabilityRows(demandFiles, roles, resourceMapping).filter(row => row.date === effectiveDate && (selectedShift === 'All' || row.shift === selectedShift));
  const demandPlan = buildStpDemandPlan(demandFiles, stpRoleMappingConfig, roles, effectiveDate ? [weekCodeForDate(effectiveDate)] : undefined, resourceMapping);
  const demandByDayShift = demandPlan.roleDemandRows.map(row => {
    const profile = resourceMapping.demandStreamProfiles?.[streamForRole(row.role) as keyof typeof resourceMapping.demandStreamProfiles];
    const day = effectiveDate ? new Date(`${effectiveDate}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'long' }) : '';
    const weights = profile?.[day] ?? { AM: 0, PM: 0, Night: 0 };
    const selectedWeight = selectedShift === 'All' ? weights.AM + weights.PM + weights.Night : weights[selectedShift as 'AM' | 'PM' | 'Night'];
    const weeklyWeight = profile ? Object.values(profile).reduce((total, value) => total + value.AM + value.PM + value.Night, 0) : 0;
    return { ...row, volume: row.volume * (weeklyWeight > 0 ? selectedWeight / weeklyWeight : 0) };
  }).filter(row => row.volume > 0);
  const [flowInputs, setFlowInputs] = useState<Record<string, number>>({});
  const flowScope = `${effectiveDate}|${selectedShift}`;
  const flowBase = (['Inbound', 'Outbound'] as const).map(flow => ({
    flow,
    volume: demandByDayShift.filter(row => row.flow === flow).reduce((sum, row) => sum + row.volume, 0)
  }));
  const flowValues = flowBase.map(({ flow, volume }) => {
    const key = flow.toLowerCase();
    const adjustedVolume = flowInputs[`${flowScope}|${key}Volume`] ?? volume;
    const pallets = flowInputs[`${flowScope}|${key}Pallets`] ?? adjustedVolume / Math.max(resourceMapping.m3PerPallet, 0.01);
    const trucks = flowInputs[`${flowScope}|${key}Trucks`] ?? adjustedVolume / Math.max(resourceMapping.truckVolumeM3, 0.01);
    return { flow, baseVolume: volume, volume: adjustedVolume, pallets, trucks };
  });
  const inboundVolume = flowValues.find(row => row.flow === 'Inbound')?.volume ?? 0;
  const outboundVolume = flowValues.find(row => row.flow === 'Outbound')?.volume ?? 0;
  const estimatedPallets = flowValues.reduce((sum, row) => sum + row.pallets, 0);
  const updateFlowInput = (flow: 'Inbound' | 'Outbound', field: 'volume' | 'pallets' | 'trucks', value: number) => {
    const key = flow.toLowerCase();
    const normalized = Math.max(value, 0);
    const volume = field === 'volume' ? normalized : field === 'pallets' ? normalized * Math.max(resourceMapping.m3PerPallet, 0.01) : normalized * Math.max(resourceMapping.truckVolumeM3, 0.01);
    const previous = flowValues.find(item => item.flow === flow);
    recordChange({ action: 'Demand adjustment', employee: '', role: flow, field, before: previous?.[field] ?? 0, after: normalized, details: 'Shift-scoped planning override' });
    setFlowInputs(current => ({ ...current, [`${flowScope}|${key}Volume`]: volume, [`${flowScope}|${key}Pallets`]: volume / Math.max(resourceMapping.m3PerPallet, 0.01), [`${flowScope}|${key}Trucks`]: volume / Math.max(resourceMapping.truckVolumeM3, 0.01) }));
  };
  const adjustedDemandRows = demandByDayShift.map(row => {
    const flow = row.flow;
    const base = flowValues.find(item => item.flow === flow);
    const factor = base && base.baseVolume > 0 ? base.volume / base.baseVolume : 1;
    const configuredRole = roles.find(role => roleMatches(role.role, row.role) || roleMatches(role.translation, row.role));
    const kpi = Number(configuredRole?.palletsPerHour ?? 0) > 0
      ? Number(configuredRole?.palletsPerHour)
      : Math.max(getRoleTargetRate(row.role, roles), 0);
    const assigned = roleSummary.find(item => canonicalPlannerRole(item.role) === canonicalPlannerRole(row.role));
    const assignedHours = assigned?.hours ?? 0;
    const availablePallets = (assigned?.productiveHours ?? 0) * kpi;
    return { ...row, volume: row.volume * factor, demandPallets: row.volume * factor / Math.max(resourceMapping.m3PerPallet, 0.01), pallets: availablePallets, kpi, trucks: row.volume * factor / Math.max(resourceMapping.truckVolumeM3, 0.01), rosteredHours: assignedHours, productiveHours: assigned?.productiveHours ?? 0 };
  });
  const roleCapabilityRows = adjustedDemandRows.map(row => {
    const assigned = roleSummary.find(item => canonicalPlannerRole(item.role) === canonicalPlannerRole(row.role));
    const capability = row.demandPallets > 0 ? row.pallets / row.demandPallets * 100 : 0;
    return { ...row, assignedHours: assigned?.hours ?? 0, assignedPeople: assigned?.people ?? 0, capability };
  });
  const balanceStates = new Map(roleCapabilityRows.map(row => [row.role, {
    ...row,
    capacity: row.pallets,
    people: plannerRows.filter(person => roleMatches(person.role, row.role))
  }]));
  const plannedPeople = new Set<string>();
  const moveRecommendations: Array<{ key: string; from: string; to: string; people: PlannerRow[]; person: PlannerRow; fromCapability: number; toCapability: number }> = [];
  for (let index = 0; index < 30; index += 1) {
    const states = Array.from(balanceStates.values()).filter(row => row.demandPallets > 0);
    const candidates = states.flatMap(receiver => states
      .filter(donor => donor.role !== receiver.role && donor.capacity / donor.demandPallets > receiver.capacity / receiver.demandPallets)
      .flatMap(donor => donor.people.filter(person => !plannedPeople.has(person.id)).map(person => {
        const fromCapability = donor.capacity / donor.demandPallets * 100;
        const toCapability = receiver.capacity / receiver.demandPallets * 100;
        const personProductiveHours = productiveHoursByPerson.get(person.id) ?? 0;
        const movedPallets = personProductiveHours * donor.kpi;
        const nextFrom = Math.max(donor.capacity - movedPallets, 0) / donor.demandPallets * 100;
        const nextTo = (receiver.capacity + personProductiveHours * receiver.kpi) / receiver.demandPallets * 100;
        const beforeGap = Math.abs(fromCapability - toCapability);
        const afterGap = Math.abs(nextFrom - nextTo);
        return { receiver, donor, person, fromCapability, toCapability, nextFrom, nextTo, improvement: beforeGap - afterGap };
      })))
      .filter(candidate => candidate.improvement > 0 && candidate.nextFrom >= candidate.nextTo)
      .sort((left, right) => right.improvement - left.improvement);
    const best = candidates[0];
    if (!best) break;
    const key = `${best.donor.role}->${best.receiver.role}:${best.person.id}`;
    if (appliedMoveKeys.includes(key)) break;
    moveRecommendations.push({ key, from: best.donor.role, to: best.receiver.role, people: best.donor.people.filter(person => !plannedPeople.has(person.id)), person: best.person, fromCapability: best.fromCapability, toCapability: best.toCapability });
    plannedPeople.add(best.person.id);
    const movedProductiveHours = productiveHoursByPerson.get(best.person.id) ?? 0;
    best.donor.capacity = Math.max(best.donor.capacity - movedProductiveHours * best.donor.kpi, 0);
    best.receiver.capacity += movedProductiveHours * best.receiver.kpi;
  }
  const suggestions = moveRecommendations.map(move => `${move.to} is at ${move.toCapability.toFixed(0)}% KPI. Move one person from ${move.from}.`);
  const moveRecommendation = moveRecommendations[0];
  const updateRole = (id: string, role: string) => { const person = plannerRows.find(row => row.id === id); if (person && person.role !== role) recordChange({ action: 'Role change', employee: person.name, role, field: 'Work role', before: person.role, after: role, details: 'Employee assignment changed' }); setRoleOverrides(current => ({ ...current, [id]: role })); };
  const openRosterPerson = (person: PlannerRow) => { setSelectedRosterPerson(person); setRosterPaneOpen(true); };
  const movePersonToRole = (role: string) => {
    if (!draggedPerson || draggedPerson.role === role) return;
    updateRole(draggedPerson.id, role);
    setDraggedPerson(null);
    setDragOverRole(null);
  };
  const initiateMove = (move: typeof moveRecommendations[number], personId?: string) => {
    const selectedPerson = move.people.find(person => person.id === (personId ?? selectedMovePeople[move.key])) ?? move.people[0];
    if (!selectedPerson) return;
    updateRole(selectedPerson.id, move.to);
    setAppliedMoveKeys(current => [...current, move.key]);
  };
  const initiateRecommendedMove = () => { if (moveRecommendation) initiateMove(moveRecommendation); };
  const removePerson = (person: PlannerRow) => { recordChange({ action: 'Employee removed', employee: person.name, role: person.role, field: 'Roster status', before: 'Scheduled', after: 'Removed', details: 'No-show or manual removal' }); setRemovedPeople(current => ({ ...current, [person.id]: person })); };
  const updatePersonHours = (person: PlannerRow, hours: number) => { recordChange({ action: 'Hours change', employee: person.name, role: person.role, field: 'Hours', before: person.hours, after: hours, details: 'Manual hours or overtime adjustment' }); setHourOverrides(current => ({ ...current, [person.id]: hours })); };
  const updatePersonRole = (person: PlannerRow, role: string) => { const nextRole = canonicalPlannerRole(role); recordChange({ action: 'Role change', employee: person.name, role: nextRole, field: 'Work role', before: person.role, after: nextRole, details: 'Employee assignment changed' }); setRoleOverrides(current => ({ ...current, [person.id]: nextRole })); };
  const updatePersonTime = (person: PlannerRow, start: string, end: string) => {
    const toMinutes = (value: string) => { const [hours, minutes] = value.split(':').map(Number); return Number.isFinite(hours) && Number.isFinite(minutes) ? hours * 60 + minutes : 0; };
    const startMinutes = toMinutes(start);
    let duration = toMinutes(end) - startMinutes;
    if (duration < 0) duration += 24 * 60;
    recordChange({ action: 'Time change', employee: person.name, role: person.role, field: 'Start / finish', before: `${person.start} - ${person.end}`, after: `${start} - ${end}`, details: 'Shift time adjustment' });
    setTimeOverrides(current => ({ ...current, [person.id]: { start, end } }));
    if (duration > 0) setHourOverrides(current => ({ ...current, [person.id]: Math.round(duration / 60 * 2) / 2 }));
  };
  const liveSelectedPerson = selectedRosterPerson ? plannerRows.find(person => person.id === selectedRosterPerson.id) ?? selectedRosterPerson : null;
  const initiateAllMoves = () => {
    const usedPeople = new Set<string>();
    const movesToApply = moveRecommendations.flatMap(move => {
      const selectedPerson = move.people.find(person => person.id === selectedMovePeople[move.key] && !usedPeople.has(person.id)) ?? move.people.find(person => !usedPeople.has(person.id));
      if (!selectedPerson) return [];
      usedPeople.add(selectedPerson.id);
      return [{ move, person: selectedPerson }];
    });
    if (!movesToApply.length) return;
    setRoleOverrides(current => movesToApply.reduce((next, item) => ({ ...next, [item.person.id]: item.move.to }), current));
    setAppliedMoveKeys(current => [...current, ...movesToApply.map(item => item.move.key)]);
  };
  const restorePerson = (person: PlannerRow | null) => { if (!person) return; const plannedPerson = { ...person, date: effectiveDate, shift: selectedShift === 'All' ? person.shift : selectedShift }; recordChange({ action: 'Employee added', employee: person.name, role: person.role, field: 'Roster status', before: 'Not in selected plan', after: 'Added', details: 'Added from MyTime employee population' }); setRemovedPeople(current => { const next = { ...current }; delete next[person.id]; return next; }); setAddedPeople(current => ({ ...current, [person.id]: plannedPerson })); setSelectedRosterPerson(plannedPerson); setRosterPaneOpen(true); };
  const formatDate = (value: string) => value ? new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${value}T00:00:00`)) : 'Select a date';
  const exportPlannerChanges = () => { const rows = plannerChanges.length ? plannerChanges : [{ timestamp: new Date().toISOString(), date: effectiveDate, shift: selectedShift, action: 'No changes', employee: '', role: '', field: '', before: '', after: '', details: 'No adjustments recorded in this planning session' }]; const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), 'Planner Changes'); XLSX.writeFile(workbook, `Day_Planner_Changes_${effectiveDate || 'date'}_${selectedShift}.xlsx`); };

  const printRows = operationalRoles.map(role => {
    const people = plannerRows.filter(person => canonicalPlannerRole(person.role) === canonicalPlannerRole(role.role) || canonicalPlannerRole(person.role) === canonicalPlannerRole(role.translation));
    const hours = people.reduce((sum, person) => sum + person.hours, 0);
    const productiveHours = people.reduce((sum, person) => sum + (productiveHoursByPerson.get(person.id) ?? 0), 0);
    const kpi = Number(role.palletsPerHour ?? 0);
    const pallets = productiveHours * kpi;
    const demand = adjustedDemandRows.find(row => canonicalPlannerRole(row.role) === canonicalPlannerRole(role.role) || canonicalPlannerRole(row.role) === canonicalPlannerRole(role.translation));
    const forecastKpi = productiveHours > 0 ? (demand?.demandPallets ?? 0) / productiveHours : 0;
    return { role: canonicalPlannerRole(role.translation || role.role), people, hours, productiveHours, pallets, kpi, forecastKpi, trucks: demand?.trucks ?? 0 };
  });

  return <Box><Box className="day-planner-print-toolbar"><Button variant="outlined" startIcon={<PictureAsPdfIcon />} onClick={() => window.print()}>Export PDF</Button></Box><PageHeader title="Day Planner" subtitle={`Plan assignments and balance capability — ${formatDate(effectiveDate)}`} /><Box className="day-planner-print-summary"><Typography variant="h5" fontWeight={800}>Day Planner · {formatDate(effectiveDate)} · {selectedShift === 'All' ? 'All shifts' : selectedShift}</Typography><Table size="small"><TableHead><TableRow>{['Work role', 'People', 'Hours', 'Pallets', 'KPI', 'Trucks', 'Employees'].map(label => <TableCell key={label} sx={{ fontWeight: 800 }}>{label}</TableCell>)}</TableRow></TableHead><TableBody>{printRows.map(row => <TableRow key={row.role}><TableCell sx={{ fontWeight: 700 }}>{row.role}</TableCell><TableCell>{row.people.length}</TableCell><TableCell>{row.hours.toFixed(1)}</TableCell><TableCell>{row.pallets.toFixed(1)}</TableCell><TableCell>{row.kpi.toFixed(1)}</TableCell><TableCell>{row.trucks.toFixed(1)}</TableCell><TableCell>{row.people.map(person => `${person.name} (${person.shift}, ${person.hours.toFixed(1)}h)`).join('; ') || '—'}</TableCell></TableRow>)}</TableBody></Table></Box><Stack className="day-planner-stack" spacing={2} sx={{ display: 'flex', flexDirection: 'column' }}>
    <Paper className="table-wrap" sx={{ p: 2 }}><Grid container spacing={2} alignItems="center"><Grid item xs={12} md={4}><TextField fullWidth type="date" label="Planning date" value={effectiveDate} onChange={event => setSelectedDate(event.target.value)} InputLabelProps={{ shrink: true }} /></Grid><Grid item xs={12} md={3}><TextField select fullWidth label="Shift" value={selectedShift} onChange={event => setSelectedShift(event.target.value)}><MenuItem value="All">All shifts</MenuItem>{['AM', 'PM', 'Night'].map(shift => <MenuItem key={shift} value={shift}>{shift}</MenuItem>)}</TextField></Grid><Grid item xs={12} md={5}><Typography variant="body2" color="text.secondary">Assignments come from MyTime. Edit any work role below; demand volumes come from the uploaded STP forecast.</Typography></Grid></Grid>{!sourceRows.length && <Alert severity="info" sx={{ mt: 2 }}>Upload the MyTime schedule in Import / Export or below to populate the day planner.</Alert>}{sourceRows.length > 0 && !hasEmployeeNames && <Alert severity="warning" sx={{ mt: 2 }}>This MyTime file contains department/location values but no employee names. The current source is {scheduleFile?.fileName}; upload the employee-level MyTime shift export to populate people.</Alert>}<Grid container spacing={2} sx={{ mt: 1 }}><Grid item xs={12} md={6}><UploadComponent title="MyTime schedule" kind="schedule" accept=".xlsx,.xls,.csv" /></Grid><Grid item xs={12} md={6}><UploadComponent title="STP demand / volume" kind="stp" accept=".xlsx,.xls,.csv" /></Grid></Grid></Paper>
    <Grid container spacing={2}>{[['People', plannerRows.length], ['Roster hours', totalHours.toFixed(1)], ['Productive hours', productiveHours.toFixed(1)], ['Estimated pallets', Math.round(estimatedPallets).toLocaleString('en-GB')], ['Inbound volume', Math.round(inboundVolume).toLocaleString('en-GB')], ['Outbound volume', Math.round(outboundVolume).toLocaleString('en-GB')]].map(([label, value]) => <Grid item xs={6} md={2} key={String(label)}><Paper className="kpi-card"><Typography variant="caption">{label}</Typography><Typography variant="h4" fontWeight={800}>{value}</Typography></Paper></Grid>)}</Grid>
    <Paper className="table-wrap" sx={{ p: 2 }}><Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={1} sx={{ mb: 2 }}><Box><Typography variant="h6" fontWeight={800}>Assignments by work role</Typography><Typography variant="body2" color="text.secondary">Drag a person onto another role to move the person and their hours.</Typography></Box><Chip label={`${roleGroups.length} work roles`} variant="outlined" /></Stack><Grid container spacing={2}>{roleGroups.map(([role, people]) => { const colour = colourForRole(role); const hours = people.reduce((sum, person) => sum + person.hours, 0); const isDropTarget = dragOverRole === role && draggedPerson?.role !== role; return <Grid item xs={12} md={6} lg={4} key={role}><Card variant="outlined" onDragOver={event => { event.preventDefault(); setDragOverRole(role); }} onDragLeave={() => setDragOverRole(current => current === role ? null : current)} onDrop={event => { event.preventDefault(); movePersonToRole(role); }} sx={{ height: '100%', borderTop: `5px solid ${colour.accent}`, borderColor: isDropTarget ? colour.accent : undefined, bgcolor: isDropTarget ? '#fff' : colour.background, borderRadius: 2, boxShadow: isDropTarget ? `0 0 0 3px ${colour.accent}33` : undefined, transition: 'box-shadow 120ms ease, background-color 120ms ease' }}><CardContent sx={{ p: 2 }}><Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1} sx={{ mb: 1.5 }}><Box><Typography variant="subtitle1" fontWeight={800}>{role}</Typography><Typography variant="caption" color="text.secondary">{people.length} {people.length === 1 ? 'person' : 'people'} · {hours.toFixed(1)} roster hours</Typography></Box><Chip size="small" label={`${people.length}`} sx={{ bgcolor: colour.accent, color: '#fff', fontWeight: 800 }} /></Stack><Stack spacing={1}>{people.map(person => <Box key={person.id} draggable onDragStart={() => setDraggedPerson(person)} onDragEnd={() => { setDraggedPerson(null); setDragOverRole(null); }} sx={{ p: 1, borderRadius: 1.5, bgcolor: 'rgba(255,255,255,0.75)', border: '1px solid rgba(15,23,42,0.08)', cursor: 'grab', '&:active': { cursor: 'grabbing' }, opacity: draggedPerson?.id === person.id ? 0.45 : 1 }}><Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}><Typography variant="body2" fontWeight={700} sx={{ overflowWrap: 'anywhere' }}>{person.name}</Typography><Typography variant="caption" fontWeight={800} color="text.secondary">{person.hours.toFixed(1)}h</Typography></Stack><Typography variant="caption" color="text.secondary">{person.shift} · {person.start} - {person.end}</Typography></Box>)}</Stack></CardContent></Card></Grid>; })}</Grid>{!roleGroups.length && <Typography color="text.secondary">No employees match the selected date and shift.</Typography>}</Paper>
    <Grid container spacing={2}><Grid item xs={12} md={8}><Paper className="table-wrap" sx={{ overflowX: 'auto' }}><Typography variant="h6" fontWeight={800} sx={{ mb: 1 }}>Role demand overview</Typography><TableContainer><Table size="small" sx={{ minWidth: 700 }}><TableHead><TableRow>{['Job title', 'Hours', 'People', 'Pallets', 'KPI', 'Trucks'].map(label => <TableCell key={label} sx={{ fontWeight: 800, whiteSpace: 'nowrap' }}>{label}</TableCell>)}</TableRow></TableHead><TableBody>{adjustedDemandRows.map(row => { const assigned = roleSummary.find(item => roleMatches(item.role, row.role)); const capability = row.demandPallets > 0 ? row.pallets / row.demandPallets * 100 : 0; return <TableRow key={row.role}><TableCell sx={{ fontWeight: 700 }}>{row.role}</TableCell><TableCell>{(assigned?.hours ?? 0).toFixed(1)}</TableCell><TableCell>{assigned?.people ?? 0}</TableCell><TableCell>{row.pallets.toFixed(1)}</TableCell><TableCell sx={{ color: capability < 100 ? 'error.main' : 'success.main', fontWeight: 800 }}>{row.kpi.toFixed(1)}</TableCell><TableCell>{row.trucks.toFixed(1)}</TableCell></TableRow>; })}</TableBody></Table></TableContainer></Paper></Grid><Grid item xs={12} md={4}><Paper className="table-wrap" sx={{ height: '100%' }}><Typography variant="h6" fontWeight={800} sx={{ mb: 1 }}>Recommended setup</Typography>{suggestions.length ? <Stack spacing={1.5}>{suggestions.map((suggestion, index) => <Alert key={index} severity={index === 0 ? 'warning' : 'info'}>{suggestion}</Alert>)}</Stack> : <Alert severity="success">No immediate role-balance suggestions for this selection.</Alert>}{moveRecommendation && <Button variant="contained" fullWidth sx={{ mt: 2 }} onClick={initiateRecommendedMove}>Initiate move: {moveRecommendation.person.name} to {moveRecommendation.to}</Button>}</Paper></Grid></Grid>
    <Paper className="table-wrap" sx={{ p: 2 }}><Typography variant="h6" fontWeight={800} sx={{ mb: 1 }}>Inbound and outbound volume setup</Typography><Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Edit volume, pallets, or trucks. The other two values recalculate using Settings: {resourceMapping.m3PerPallet} m³ per pallet and {resourceMapping.truckVolumeM3} m³ per truck.</Typography><Grid container spacing={2}>{flowValues.map(row => <Grid item xs={12} md={6} key={row.flow}><Paper variant="outlined" sx={{ p: 2 }}><Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1 }}>{row.flow}</Typography><Grid container spacing={1.5}><Grid item xs={4}><FlowValueInput label="Volume m3" value={row.volume} onCommit={value => updateFlowInput(row.flow, 'volume', value)} /></Grid><Grid item xs={4}><FlowValueInput label="Pallets" value={row.pallets} onCommit={value => updateFlowInput(row.flow, 'pallets', value)} /></Grid><Grid item xs={4}><FlowValueInput label="Trucks" value={row.trucks} onCommit={value => updateFlowInput(row.flow, 'trucks', value)} /></Grid></Grid></Paper></Grid>)}</Grid></Paper>
    <Paper className="table-wrap" sx={{ p: 2 }}><Typography variant="h6" fontWeight={800}>Recommended move queue</Typography><Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Choose a person for each move, apply one move, or apply the complete queue.</Typography>{moveRecommendations.length ? <Stack spacing={1}>{moveRecommendations.map(move => <Stack key={move.key} direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}><Typography variant="body2" sx={{ minWidth: 190 }}>{move.from} to {move.to}</Typography><TextField select size="small" value={selectedMovePeople[move.key] ?? move.people[0]?.id ?? ''} onChange={event => setSelectedMovePeople(current => ({ ...current, [move.key]: event.target.value }))} sx={{ flex: 1 }}>{move.people.map(person => <MenuItem key={person.id} value={person.id}>{person.name} ({person.hours.toFixed(1)}h)</MenuItem>)}</TextField><Button variant="outlined" size="small" onClick={() => initiateMove(move)}>Move</Button></Stack>)}<Button variant="contained" onClick={initiateAllMoves}>Do all recommended moves</Button></Stack> : <Alert severity="success">No outstanding recommended moves.</Alert>}</Paper>
    <MoveQueuePopover moves={moveRecommendations} selectedPeople={selectedMovePeople} onSelectPerson={(key, personId) => setSelectedMovePeople(current => ({ ...current, [key]: personId }))} onMove={move => initiateMove(move as typeof moveRecommendations[number])} onMoveAll={initiateAllMoves} />
    <RosterAdjustments people={plannerRows} allPeople={allMyTimePeople} removedPeople={Object.values(removedPeople)} onRemove={removePerson} onRestore={restorePerson} onHoursChange={updatePersonHours} onTimeChange={updatePersonTime} roles={roles} onRoleChange={updatePersonRole} open={rosterPaneOpen} selectedPerson={liveSelectedPerson} onOpen={() => { setSelectedRosterPerson(null); setRosterPaneOpen(true); }} onClose={() => { setRosterPaneOpen(false); setSelectedRosterPerson(null); }} />
    <RoleAssignmentCards groups={roleGroups} onPersonClick={person => { setSelectedRosterPerson(person); setRosterPaneOpen(true); }} onAddClick={() => { setSelectedRosterPerson(null); setRosterPaneOpen(true); }} onExportChanges={exportPlannerChanges} colourForRole={colourForRole} />
    <RoleKpiOverview rows={adjustedDemandRows} roleSummary={roleSummary} roleMatches={roleMatches} />
  </Stack></Box>;
}
import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { roleDefaults, resourceMapping, capabilityMetrics, trendData, absenceData, scenarioData, exportMetrics } from '../mockData';
import { Role, ResourceMapping, ScenarioData, CapabilityMetric, LabourData, AbsenceData, ExportMetrics, UploadedFileRecord, MonthlyResourceMapping, UploadKind } from '../types';
import { loadState, saveState } from '../storage';
import { filterFilesByRoleScope, RoleScope } from '../services/analytics';

interface PlannerContextValue {
  roles: Role[];
  resourceMapping: ResourceMapping;
  capabilityMetrics: CapabilityMetric[];
  trendData: LabourData[];
  absenceData: AbsenceData[];
  scenarioData: ScenarioData;
  exportMetrics: ExportMetrics;
  uploadedFiles: UploadedFileRecord[];
  scopedUploadedFiles: UploadedFileRecord[];
  roleScope: RoleScope;
  setRoleScope: (scope: RoleScope) => void;
  themeMode: 'light' | 'dark';
  setThemeMode: (mode: 'light' | 'dark') => void;
  updateRole: (id: string, updates: Partial<Role>) => void;
  addRole: () => void;
  deleteRole: (id: string) => void;
  updateResourceMapping: (key: keyof ResourceMapping, value: number) => void;
  updateMonthlyResourceMapping: (month: string, key: keyof MonthlyResourceMapping, value: number) => void;
  addUploadedFile: (item: UploadedFileRecord) => void;
  clearUploadedFiles: (kind?: UploadKind) => void;
}

const PlannerContext = createContext<PlannerContextValue | undefined>(undefined);

export function PlannerProvider({ children }: { children: React.ReactNode }) {
  const stored = loadState();
  const [roles, setRoles] = useState<Role[]>(stored.roles.length ? stored.roles : roleDefaults);
  const [resourceMappingState, setResourceMappingState] = useState<ResourceMapping>(stored.resourceMapping || resourceMapping);
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>(stored.themeMode || 'light');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileRecord[]>(() => (stored.uploadedFiles || []).filter(file => {
    if (file.kind !== 'stp' || !file.records.length) return true;
    const hasWeekRecords = file.records.some(record => record.weekCode !== undefined);
    return hasWeekRecords;
  }));
  const [roleScope, setRoleScope] = useState<RoleScope>(stored.roleScope || 'both');

  useEffect(() => {
    saveState({ roles, resourceMapping: resourceMappingState, themeMode, roleScope, uploadedFiles });
  }, [roles, resourceMappingState, themeMode, roleScope, uploadedFiles]);

  const updateRole = (id: string, updates: Partial<Role>) => {
    setRoles(current => current.map(role => role.id === id ? { ...role, ...updates } : role));
  };

  const addRole = () => {
    const newRole: Role = {
      id: `role-${Date.now()}`,
      role: 'New Role',
      translation: 'New Role',
      palletsPerHour: 0,
      m3PerPallet: 0.82,
      targetRate: 0,
      baselineValue: 0,
      type: 'Operational'
    };
    setRoles([...roles, newRole]);
  };

  const deleteRole = (id: string) => {
    setRoles(current => current.filter(role => role.id !== id));
  };

  const updateResourceMapping = (key: keyof ResourceMapping, value: number) => {
    setResourceMappingState(current => ({ ...current, [key]: value }));
  };

  const updateMonthlyResourceMapping = (month: string, key: keyof MonthlyResourceMapping, value: number) => {
    setResourceMappingState(current => {
      const monthOrder = ['September', 'October', 'November', 'December', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August'];
      const currentIndex = monthOrder.indexOf(month);
      const monthValues = {
        ...current.monthValues,
        [month]: { ...current.monthValues[month], [key]: value }
      };

      for (let index = currentIndex + 1; index < monthOrder.length; index += 1) {
        const previous = monthValues[monthOrder[index - 1]];
        const nextMonth = monthOrder[index];
        monthValues[nextMonth] = {
          ...monthValues[nextMonth],
          fte: Math.max(previous.fte - previous.leavers, 0)
        };
      }

      return { ...current, monthValues };
    });
  };

  const addUploadedFile = (item: UploadedFileRecord) => {
    setUploadedFiles(current => [item, ...current.filter(file => file.kind !== item.kind)]);
  };

  const clearUploadedFiles = (kind?: UploadKind) => {
    setUploadedFiles(current => kind ? current.filter(file => file.kind !== kind) : []);
  };

  const scopedUploadedFiles = useMemo(() => filterFilesByRoleScope(uploadedFiles, roles, roleScope), [uploadedFiles, roles, roleScope]);

  const value = useMemo(() => ({
    roles,
    resourceMapping: resourceMappingState,
    capabilityMetrics,
    trendData,
    absenceData,
    scenarioData,
    exportMetrics,
    uploadedFiles,
    scopedUploadedFiles,
    roleScope,
    setRoleScope,
    themeMode,
    setThemeMode,
    updateRole,
    addRole,
    deleteRole,
    updateResourceMapping,
    updateMonthlyResourceMapping,
    addUploadedFile,
    clearUploadedFiles
  }), [roles, resourceMappingState, themeMode, roleScope, uploadedFiles, scopedUploadedFiles]);

  return <PlannerContext.Provider value={value}>{children}</PlannerContext.Provider>;
}

export function usePlannerContext() {
  const ctx = useContext(PlannerContext);
  if (!ctx) throw new Error('PlannerContext must be used inside PlannerProvider');
  return ctx;
}

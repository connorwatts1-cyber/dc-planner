export interface HistoricalFollowUpWeek {
  week: string;
  year: number;
  start: string;
  end: string;
  m3Received: number;
  m3Shipped: number;
  m3Handled: number;
  loginHours: number;
  pickingHours: number;
}

export const historicalFollowUpWeeks: HistoricalFollowUpWeek[] = [
  { week: 'W35', year: 2025, start: '2025-08-31', end: '2025-09-06', m3Received: 20403.29, m3Shipped: 20419.88, m3Handled: 40823.16, loginHours: 5946.86, pickingHours: 259.22 },
  { week: 'W36', year: 2025, start: '2025-09-07', end: '2025-09-13', m3Received: 20759.69, m3Shipped: 25510.47, m3Handled: 46270.16, loginHours: 6018.01, pickingHours: 341.71 },
  { week: 'W37', year: 2025, start: '2025-09-14', end: '2025-09-20', m3Received: 22310.86, m3Shipped: 25384.60, m3Handled: 47695.46, loginHours: 6230.67, pickingHours: 315.93 },
  { week: 'W38', year: 2025, start: '2025-09-21', end: '2025-09-27', m3Received: 22069.80, m3Shipped: 23938.22, m3Handled: 46008.02, loginHours: 5828.04, pickingHours: 272.57 },
  { week: 'W39', year: 2025, start: '2025-09-28', end: '2025-10-04', m3Received: 25515.76, m3Shipped: 24217.69, m3Handled: 49733.45, loginHours: 6084.38, pickingHours: 280.25 },
  { week: 'W40', year: 2025, start: '2025-10-05', end: '2025-10-11', m3Received: 25424.35, m3Shipped: 24582.16, m3Handled: 50006.51, loginHours: 5799.76, pickingHours: 303.23 },
  { week: 'W41', year: 2025, start: '2025-10-12', end: '2025-10-18', m3Received: 25056.19, m3Shipped: 24107.24, m3Handled: 49163.42, loginHours: 5913.35, pickingHours: 274.08 },
  { week: 'W42', year: 2025, start: '2025-10-19', end: '2025-10-25', m3Received: 20078.23, m3Shipped: 22300.90, m3Handled: 42379.13, loginHours: 5432.80, pickingHours: 261.80 },
  { week: 'W43', year: 2025, start: '2025-10-26', end: '2025-11-01', m3Received: 21459.48, m3Shipped: 20409.61, m3Handled: 41869.08, loginHours: 5448.35, pickingHours: 258.37 },
  { week: 'W44', year: 2025, start: '2025-11-02', end: '2025-11-08', m3Received: 23262.66, m3Shipped: 21906.46, m3Handled: 45169.11, loginHours: 5688.21, pickingHours: 256.78 },
  { week: 'W45', year: 2025, start: '2025-11-09', end: '2025-11-15', m3Received: 22173.48, m3Shipped: 20773.32, m3Handled: 42946.79, loginHours: 5715.38, pickingHours: 274.47 },
  { week: 'W46', year: 2025, start: '2025-11-16', end: '2025-11-22', m3Received: 22344.17, m3Shipped: 22258.46, m3Handled: 44602.63, loginHours: 5739.40, pickingHours: 284.29 },
  { week: 'W47', year: 2025, start: '2025-11-23', end: '2025-11-29', m3Received: 23562.01, m3Shipped: 21462.11, m3Handled: 45024.12, loginHours: 5642.55, pickingHours: 277.62 },
  { week: 'W48', year: 2025, start: '2025-11-30', end: '2025-12-06', m3Received: 22442.85, m3Shipped: 21680.51, m3Handled: 44123.36, loginHours: 5941.59, pickingHours: 353.53 },
  { week: 'W49', year: 2025, start: '2025-12-07', end: '2025-12-13', m3Received: 24629.30, m3Shipped: 22272.31, m3Handled: 46901.61, loginHours: 5937.85, pickingHours: 274.55 },
  { week: 'W50', year: 2025, start: '2025-12-14', end: '2025-12-20', m3Received: 19157.56, m3Shipped: 21677.47, m3Handled: 40835.03, loginHours: 5357.76, pickingHours: 296.76 },
  { week: 'W51', year: 2025, start: '2025-12-21', end: '2025-12-27', m3Received: 11829.22, m3Shipped: 13673.64, m3Handled: 25502.87, loginHours: 3627.23, pickingHours: 131.54 },
  { week: 'W52', year: 2025, start: '2025-12-28', end: '2026-01-03', m3Received: 17986.12, m3Shipped: 20369.63, m3Handled: 38355.75, loginHours: 4993.22, pickingHours: 323.06 },
  { week: 'W01', year: 2026, start: '2026-01-04', end: '2026-01-10', m3Received: 19893.92, m3Shipped: 22675.75, m3Handled: 42569.67, loginHours: 5859.61, pickingHours: 301.24 },
  { week: 'W02', year: 2026, start: '2026-01-11', end: '2026-01-17', m3Received: 16927.90, m3Shipped: 21766.11, m3Handled: 38694.02, loginHours: 5840.56, pickingHours: 285.50 },
  { week: 'W03', year: 2026, start: '2026-01-18', end: '2026-01-24', m3Received: 22995.13, m3Shipped: 22230.76, m3Handled: 45225.89, loginHours: 6336.77, pickingHours: 293.87 },
  { week: 'W04', year: 2026, start: '2026-01-25', end: '2026-01-31', m3Received: 25791.43, m3Shipped: 22371.02, m3Handled: 48162.46, loginHours: 6475.00, pickingHours: 341.68 },
  { week: 'W05', year: 2026, start: '2026-02-01', end: '2026-02-07', m3Received: 25814.25, m3Shipped: 23171.63, m3Handled: 48985.88, loginHours: 6733.58, pickingHours: 305.86 },
  { week: 'W06', year: 2026, start: '2026-02-08', end: '2026-02-14', m3Received: 25400.20, m3Shipped: 22021.19, m3Handled: 47421.39, loginHours: 6143.39, pickingHours: 289.60 },
  { week: 'W07', year: 2026, start: '2026-02-15', end: '2026-02-21', m3Received: 22886.99, m3Shipped: 20312.57, m3Handled: 43199.55, loginHours: 5967.14, pickingHours: 297.37 },
  { week: 'W08', year: 2026, start: '2026-02-22', end: '2026-02-28', m3Received: 23014.37, m3Shipped: 20411.21, m3Handled: 43425.57, loginHours: 6073.41, pickingHours: 310.42 },
  { week: 'W09', year: 2026, start: '2026-03-01', end: '2026-03-07', m3Received: 25868.42, m3Shipped: 24249.65, m3Handled: 50118.07, loginHours: 6294.33, pickingHours: 304.35 },
  { week: 'W10', year: 2026, start: '2026-03-08', end: '2026-03-14', m3Received: 24166.21, m3Shipped: 24148.02, m3Handled: 48314.22, loginHours: 5875.45, pickingHours: 220.26 },
  { week: 'W11', year: 2026, start: '2026-03-15', end: '2026-03-21', m3Received: 22262.96, m3Shipped: 21524.26, m3Handled: 43787.22, loginHours: 5305.44, pickingHours: 240.84 },
  { week: 'W12', year: 2026, start: '2026-03-22', end: '2026-03-28', m3Received: 24652.18, m3Shipped: 20191.08, m3Handled: 44843.26, loginHours: 5726.40, pickingHours: 274.84 },
  { week: 'W13', year: 2026, start: '2026-03-29', end: '2026-04-04', m3Received: 20284.21, m3Shipped: 18188.78, m3Handled: 38472.99, loginHours: 5404.79, pickingHours: 274.47 },
  { week: 'W14', year: 2026, start: '2026-04-05', end: '2026-04-11', m3Received: 17637.32, m3Shipped: 20116.82, m3Handled: 37754.15, loginHours: 5569.57, pickingHours: 331.38 },
  { week: 'W15', year: 2026, start: '2026-04-12', end: '2026-04-18', m3Received: 22137.78, m3Shipped: 20478.38, m3Handled: 42616.16, loginHours: 5225.68, pickingHours: 239.93 },
  { week: 'W16', year: 2026, start: '2026-04-19', end: '2026-04-25', m3Received: 18846.90, m3Shipped: 19778.34, m3Handled: 38625.24, loginHours: 4886.51, pickingHours: 207.14 },
  { week: 'W17', year: 2026, start: '2026-04-26', end: '2026-05-02', m3Received: 20227.20, m3Shipped: 18267.21, m3Handled: 38494.41, loginHours: 5036.34, pickingHours: 232.55 },
  { week: 'W18', year: 2026, start: '2026-05-03', end: '2026-05-09', m3Received: 17767.13, m3Shipped: 19044.91, m3Handled: 36812.04, loginHours: 5096.45, pickingHours: 281.35 },
  { week: 'W19', year: 2026, start: '2026-05-10', end: '2026-05-16', m3Received: 17726.04, m3Shipped: 19879.23, m3Handled: 37605.27, loginHours: 5217.06, pickingHours: 247.42 },
  { week: 'W20', year: 2026, start: '2026-05-17', end: '2026-05-23', m3Received: 18027.69, m3Shipped: 21951.27, m3Handled: 39978.96, loginHours: 5747.70, pickingHours: 335.40 },
  { week: 'W21', year: 2026, start: '2026-05-24', end: '2026-05-30', m3Received: 18328.11, m3Shipped: 20277.96, m3Handled: 38606.07, loginHours: 5507.92, pickingHours: 345.25 },
  { week: 'W22', year: 2026, start: '2026-05-31', end: '2026-06-06', m3Received: 18515.70, m3Shipped: 19847.84, m3Handled: 38363.54, loginHours: 6131.81, pickingHours: 357.98 },
  { week: 'W23', year: 2026, start: '2026-06-07', end: '2026-06-13', m3Received: 20913.20, m3Shipped: 19115.47, m3Handled: 40028.68, loginHours: 5690.17, pickingHours: 295.78 },
  { week: 'W24', year: 2026, start: '2026-06-14', end: '2026-06-20', m3Received: 18865.40, m3Shipped: 17186.85, m3Handled: 36052.24, loginHours: 5055.94, pickingHours: 274.44 },
  { week: 'W25', year: 2026, start: '2026-06-21', end: '2026-06-27', m3Received: 19828.97, m3Shipped: 17907.18, m3Handled: 37736.15, loginHours: 5295.77, pickingHours: 275.86 },
  { week: 'W26', year: 2026, start: '2026-06-28', end: '2026-07-04', m3Received: 18039.02, m3Shipped: 16956.84, m3Handled: 34995.87, loginHours: 5831.32, pickingHours: 303.54 },
  { week: 'W27', year: 2026, start: '2026-07-05', end: '2026-07-11', m3Received: 18497.03, m3Shipped: 17704.67, m3Handled: 36201.70, loginHours: 5730.95, pickingHours: 288.35 },
  { week: 'W28', year: 2026, start: '2026-07-12', end: '2026-07-18', m3Received: 19283.54, m3Shipped: 18375.53, m3Handled: 37659.07, loginHours: 6066.09, pickingHours: 269.66 },
  { week: 'W29', year: 2026, start: '2026-07-19', end: '2026-07-25', m3Received: 19624.05, m3Shipped: 20022.25, m3Handled: 39646.30, loginHours: 6309.71, pickingHours: 298.13 },
  { week: 'W30', year: 2026, start: '2026-07-26', end: '2026-08-01', m3Received: 19276.02, m3Shipped: 20688.97, m3Handled: 39964.99, loginHours: 6441.22, pickingHours: 319.81 },
  { week: 'W31', year: 2026, start: '2026-08-02', end: '2026-08-08', m3Received: 19503.71, m3Shipped: 21194.92, m3Handled: 40698.63, loginHours: 6492.77, pickingHours: 299.80 },
  { week: 'W32', year: 2026, start: '2026-08-09', end: '2026-08-15', m3Received: 19193.36, m3Shipped: 20322.37, m3Handled: 39515.73, loginHours: 6312.57, pickingHours: 396.85 },
  { week: 'W33', year: 2026, start: '2026-08-16', end: '2026-08-22', m3Received: 18538.84, m3Shipped: 21059.43, m3Handled: 39598.27, loginHours: 6142.47, pickingHours: 308.62 },
  { week: 'W34', year: 2026, start: '2026-08-23', end: '2026-08-29', m3Received: 17905.52, m3Shipped: 22488.47, m3Handled: 40393.99, loginHours: 6253.17, pickingHours: 385.06 },
  { week: 'W35', year: 2026, start: '2026-08-30', end: '2026-09-05', m3Received: 18244.23, m3Shipped: 21659.64, m3Handled: 39903.87, loginHours: 6266.63, pickingHours: 296.35 },
  { week: 'W36', year: 2026, start: '2026-09-06', end: '2026-09-12', m3Received: 21400.35, m3Shipped: 22957.77, m3Handled: 44358.12, loginHours: 6599.90, pickingHours: 342.00 }
];

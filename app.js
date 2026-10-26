/**
 * ToolMaster Pro - Sistema de Control de Herramientas, Maquinaria, Mantenimientos y Préstamos
 * Vue 3 Application Core + Autenticación Criptográfica & Control de Usuarios
 */

const { createApp, ref, reactive, computed, onMounted, watch } = Vue;

const STORAGE_KEY = 'TOOLMASTER_PRO_DATA_V1';
const SESSION_KEY = 'TOOLMASTER_AUTH_SESSION_V1';

// Función para calcular hash seguro SHA-256 usando Web Crypto API
async function hashPassword(plainText) {
  if (!plainText) return '';
  try {
    if (window.crypto && window.crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(plainText);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (e) {
    console.warn('Crypto API fallback:', e);
  }
  // Fallback simple
  let hash = 0;
  for (let i = 0; i < plainText.length; i++) {
    hash = ((hash << 5) - hash) + plainText.charCodeAt(i);
    hash |= 0;
  }
  return 'fb_' + Math.abs(hash);
}

// Iconos SVG reutilizables para garantizar funcionamiento 100% offline
const SvgIcons = {
  dashboard: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>`,
  tool: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>`,
  loans: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>`,
  maintenance: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>`,
  technicians: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>`,
  users: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>`,
  reports: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>`,
  lock: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>`,
  shield: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>`,
  logout: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>`,
  eye: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>`,
  eyeOff: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"/></svg>`,
  plus: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>`,
  search: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>`,
  check: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>`,
  alert: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`,
  print: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>`,
  excel: `<svg class="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>`,
  close: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>`,
  cloud: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 00-9.78 2.096A4.001 4.001 0 003 15z"/></svg>`,
  database: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"/></svg>`,
  sync: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>`,
  mobile: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>`,
  wrench: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>`,
  bolt: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>`,
  calendar: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>`,
  flame: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"/></svg>`,
  clock: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
  currency: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`
};

// Datos iniciales de demostración
const SEED_DATA = {
  company: {
    name: 'MECATRÓNICA & CONSTRUCCIONES INDUSTRIALES S.A.',
    nit: '900.854.120-4',
    warehouse: 'Bodega Principal & Patio de Maquinaria Norte',
    address: 'Zona Industrial Calle 45 # 12-80',
    phone: '+57 (601) 745-9000',
    manager: 'Ing. Roberto Méndez (Jefe de Almacén)'
  },
  // Usuarios iniciales preconfigurados con hash SHA-256
  users: [
    {
      id: 'usr_admin',
      username: 'admin',
      name: 'Administrador Principal',
      email: 'admin@empresa.com',
      // Hash SHA-256 de 'admin123'
      passwordHash: '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
      role: 'admin',
      active: true,
      createdAt: '2026-01-01'
    },
    {
      id: 'usr_operador',
      username: 'operador',
      name: 'Carlos Almacén (Operador)',
      email: 'almacen@empresa.com',
      // Hash SHA-256 de 'almacen123'
      passwordHash: '7439033334ff7f5d2d164c47fe54b5819c0f7cd1225ecbc3bbac5bc80206b01f',
      role: 'almacen',
      active: true,
      createdAt: '2026-02-10'
    },
    {
      id: 'usr_supervisor',
      username: 'supervisor',
      name: 'Ing. Diana Gómez (Auditor)',
      email: 'auditoria@empresa.com',
      // Hash SHA-256 de 'consulta123'
      passwordHash: '7fa95c704c2defa7b1295d28bcddfd752bf9b594db18886dd64721183cfc47a5',
      role: 'consulta',
      active: true,
      createdAt: '2026-03-05'
    }
  ],
  tools: [
    {
      id: 'tool_1',
      code: 'ROT-001',
      name: 'Rotomartillo SDS-Plus 800W Profesional',
      category: 'Herramienta Eléctrica',
      brand: 'DeWalt',
      model: 'D25133K',
      serialNumber: 'DW-904821',
      status: 'prestado',
      location: 'Almacén Central - Estante A1',
      acquisitionDate: '2025-03-15',
      cost: 210,
      notes: 'Incluye maletín y juego de 3 brocas de impacto'
    },
    {
      id: 'tool_2',
      code: 'GEN-002',
      name: 'Generador Eléctrico Diésel 15 kVA Insonorizado',
      category: 'Generadores y Motores',
      brand: 'Cummins',
      model: 'C15D5P',
      serialNumber: 'CM-8837190',
      status: 'disponible',
      location: 'Patio de Maquinaria - Bahía 3',
      acquisitionDate: '2024-11-10',
      cost: 4500,
      notes: 'Mantenimiento de aceite cada 250 horas de uso',
      requiresPeriodicMaintenance: true,
      maintenancePeriod: 'trimestral',
      maintenancePeriodDays: 90,
      lastMaintenanceDate: '2026-06-15',
      nextMaintenanceDate: '2026-09-13', // Vencido para generar alerta
      requiresPeriodicTesting: true,
      testingPeriod: '15_dias',
      testingPeriodDays: 15,
      lastTestingDate: '2026-09-10',
      nextTestingDate: '2026-09-25' // Vencido para generar alerta
    },
    {
      id: 'tool_3',
      code: 'MIN-003',
      name: 'Minicargador Frontal con Orugas',
      category: 'Maquinaria Pesada',
      brand: 'Bobcat',
      model: 'T590',
      serialNumber: 'BC-T590-7712',
      status: 'prestado',
      location: 'Obra Autopista Oriente',
      acquisitionDate: '2023-08-20',
      cost: 38000,
      notes: 'Requiere operador certificado con licencia C2',
      requiresPeriodicMaintenance: true,
      maintenancePeriod: 'semestral',
      maintenancePeriodDays: 180,
      lastMaintenanceDate: '2026-03-20',
      nextMaintenanceDate: '2026-09-16', // Vencido para generar alerta
      requiresPeriodicTesting: true,
      testingPeriod: '1_mes',
      testingPeriodDays: 30,
      lastTestingDate: '2026-09-01',
      nextTestingDate: '2026-10-01' // Vencido para generar alerta
    },
    {
      id: 'tool_4',
      code: 'SOL-004',
      name: 'Soldadora Inverter Multiproceso 250A',
      category: 'Soldadura',
      brand: 'Lincoln Electric',
      model: 'Powercraft 250',
      serialNumber: 'LE-250-9941',
      status: 'mantenimiento',
      location: 'Taller de Mantenimiento Eléctrico',
      acquisitionDate: '2024-05-12',
      cost: 1100,
      notes: 'En revisión por recalentamiento de tarjeta de potencia'
    },
    {
      id: 'tool_5',
      code: 'FLU-005',
      name: 'Multímetro Digital Industrial True-RMS',
      category: 'Medición y Precisión',
      brand: 'Fluke',
      model: '87V Max',
      serialNumber: 'FLK-87V-4421',
      status: 'disponible',
      location: 'Almacén Central - Armario Calibrados',
      acquisitionDate: '2025-01-20',
      cost: 580,
      notes: 'Calibración certificada vigente hasta Noviembre 2026'
    },
    {
      id: 'tool_6',
      code: 'COR-006',
      name: 'Cortadora de Concreto a Gasolina 14"',
      category: 'Maquinaria Pesada',
      brand: 'Husqvarna',
      model: 'K770',
      serialNumber: 'HQ-K770-3321',
      status: 'prestado',
      location: 'Obra San Pedro',
      acquisitionDate: '2024-09-05',
      cost: 1350,
      notes: 'Filtro de aire recién reemplazado. Usa mezcla 2T 50:1'
    },
    {
      id: 'tool_7',
      code: 'LLV-007',
      name: 'Llave de Impacto Neumática 1/2" 1350 Nm',
      category: 'Neumática',
      brand: 'Ingersoll Rand',
      model: '2235TiMAX',
      serialNumber: 'IR-2235-512',
      status: 'disponible',
      location: 'Almacén Central - Estante B3',
      acquisitionDate: '2025-02-18',
      cost: 340,
      notes: 'Lubricar a diario con aceite neumático antes de cada uso'
    },
    {
      id: 'tool_8',
      code: 'BAI-008',
      name: 'Apisonador Tipo Bailarina 4 Tiempos - Motor Honda',
      category: 'Maquinaria Pesada',
      brand: 'Wacker Neuson',
      model: 'BS50-4s',
      serialNumber: 'WN-BS50-801',
      status: 'disponible',
      location: 'Patio de Maquinaria - Bahía 1',
      acquisitionDate: '2024-06-30',
      cost: 2900,
      notes: 'Equipo clave para compactación en zanjas. Motor Honda GX100',
      requiresPeriodicMaintenance: true,
      maintenancePeriod: 'mensual',
      maintenancePeriodDays: 30,
      lastMaintenanceDate: '2026-08-25',
      nextMaintenanceDate: '2026-09-24', // Vencido para generar alerta
      requiresPeriodicTesting: true,
      testingPeriod: '15_dias',
      testingPeriodDays: 15,
      lastTestingDate: '2026-09-15',
      nextTestingDate: '2026-09-30' // Vencido para generar alerta
    },
    {
      id: 'tool_9',
      code: 'ESM-009',
      name: 'Esmeriladora Angular 9" 2600W de Alta Potencia',
      category: 'Herramienta Eléctrica',
      brand: 'Bosch Professional',
      model: 'GWS 26-230 LVI',
      serialNumber: 'BOSH-230-661',
      status: 'disponible',
      location: 'Almacén Central - Estante A2',
      acquisitionDate: '2025-04-10',
      cost: 240,
      notes: 'Sistema de reducción de vibración KickBack Control'
    },
    {
      id: 'tool_10',
      code: 'LAS-010',
      name: 'Nivel Láser Autonivelante de 3 Líneas 360°',
      category: 'Medición y Precisión',
      brand: 'Bosch',
      model: 'GLL 3-80 C',
      serialNumber: 'BOSH-LAS-1029',
      status: 'disponible',
      location: 'Almacén Central - Armario Calibrados',
      acquisitionDate: '2025-06-14',
      cost: 620,
      notes: 'Incluye trípode de aluminio y receptor láser'
    },
    {
      id: 'tool_11',
      code: 'COM-011',
      name: 'Compresor de Aire Bicilíndrico 60 Galones 5 HP',
      category: 'Neumática',
      brand: 'Campbell Hausfeld',
      model: 'VT6275',
      serialNumber: 'CH-60G-4410',
      status: 'mantenimiento',
      location: 'Taller Central',
      acquisitionDate: '2023-10-15',
      cost: 1450,
      notes: 'Mantenimiento preventivo anual y cambio de aceite de cabezal',
      requiresPeriodicMaintenance: true,
      maintenancePeriod: 'anual',
      maintenancePeriodDays: 365,
      lastMaintenanceDate: '2025-09-20',
      nextMaintenanceDate: '2026-09-20', // Vencido para generar alerta
      requiresPeriodicTesting: true,
      testingPeriod: '3_meses',
      testingPeriodDays: 90,
      lastTestingDate: '2026-06-25',
      nextTestingDate: '2026-09-23' // Vencido para generar alerta
    },
    {
      id: 'tool_12',
      code: 'AND-012',
      name: 'Juego de Andamio Multidireccional Certificado (2 Cuerpos)',
      category: 'Seguridad y Protección',
      brand: 'Layher',
      model: 'Allround Steel',
      serialNumber: 'LAY-AL-2004',
      status: 'disponible',
      location: 'Bodega de Estructuras',
      acquisitionDate: '2024-02-11',
      cost: 1200,
      notes: 'Incluye 4 plataformas con escotilla y rodapiés'
    }
  ],
  technicians: [
    {
      id: 'tech_1',
      dni: 'CC-10948271',
      name: 'Carlos Andrés Morales',
      phone: '312-845-9201',
      email: 'carlos.morales@empresa.com',
      role: 'Técnico Mecánico Líder',
      active: true,
      createdAt: '2024-01-10'
    },
    {
      id: 'tech_2',
      dni: 'CC-79845112',
      name: 'Jorge Eliécer Peña',
      phone: '315-992-1450',
      email: 'jorge.pena@empresa.com',
      role: 'Operador de Maquinaria Pesada',
      active: true,
      createdAt: '2024-02-15'
    },
    {
      id: 'tech_3',
      dni: 'CC-10178492',
      name: 'Diana Marcela Gómez',
      phone: '320-641-3329',
      email: 'diana.gomez@empresa.com',
      role: 'Especialista en Instrumentación Eléctrica',
      active: true,
      createdAt: '2024-03-01'
    },
    {
      id: 'tech_4',
      dni: 'CC-80345678',
      name: 'Mauricio Silva Rivas',
      phone: '318-774-8890',
      email: 'mauricio.silva@empresa.com',
      role: 'Oficial de Obras Civiles y Estructuras',
      active: true,
      createdAt: '2024-04-12'
    }
  ],
  loans: [
    {
      id: 'loan_1',
      voucherNumber: 'VAL-2026-001',
      technicianId: 'tech_1',
      technicianName: 'Carlos Andrés Morales',
      technicianDni: 'CC-10948271',
      toolIds: ['tool_1'],
      toolSnapshot: [
        { id: 'tool_1', code: 'ROT-001', name: 'Rotomartillo SDS-Plus 800W Profesional', serialNumber: 'DW-904821' }
      ],
      loanDate: '2026-08-25 08:30',
      expectedReturnDate: '2026-09-02',
      actualReturnDate: null,
      status: 'activo',
      project: 'Mantenimiento Preventivo Planta Papelera San José',
      deliveryCondition: 'Excelente',
      returnCondition: null,
      deliveryNotes: 'Se entrega con juego de brocas de 1/2 y 3/8"',
      returnNotes: '',
      createdAt: 1724574600000
    },
    {
      id: 'loan_2',
      voucherNumber: 'VAL-2026-002',
      technicianId: 'tech_2',
      technicianName: 'Jorge Eliécer Peña',
      technicianDni: 'CC-79845112',
      toolIds: ['tool_3'],
      toolSnapshot: [
        { id: 'tool_3', code: 'MIN-003', name: 'Minicargador Frontal con Orugas', serialNumber: 'BC-T590-7712' }
      ],
      loanDate: '2026-09-03 07:00',
      expectedReturnDate: '2026-09-12',
      actualReturnDate: null,
      status: 'activo',
      project: 'Movimiento de Tierras Obra Autopista Oriente Tramo 4',
      deliveryCondition: 'Excelente',
      returnCondition: null,
      deliveryNotes: 'Tanque de combustible lleno al 100%, horómetro en 1.450 hrs.',
      returnNotes: '',
      createdAt: 1725346800000
    },
    {
      id: 'loan_3',
      voucherNumber: 'VAL-2026-003',
      technicianId: 'tech_4',
      technicianName: 'Mauricio Silva Rivas',
      technicianDni: 'CC-80345678',
      toolIds: ['tool_6'],
      toolSnapshot: [
        { id: 'tool_6', code: 'COR-006', name: 'Cortadora de Concreto a Gasolina 14"', serialNumber: 'HQ-K770-3321' }
      ],
      loanDate: '2026-09-05 09:15',
      expectedReturnDate: '2026-09-08',
      actualReturnDate: null,
      status: 'activo',
      project: 'Corte de losas en Bodega San Pedro',
      deliveryCondition: 'Buena',
      returnCondition: null,
      deliveryNotes: 'Disco diamantado con 70% de vida útil restante.',
      returnNotes: '',
      createdAt: 1725527700000
    },
    {
      id: 'loan_4',
      voucherNumber: 'VAL-2026-000-HIST',
      technicianId: 'tech_3',
      technicianName: 'Diana Marcela Gómez',
      technicianDni: 'CC-10178492',
      toolIds: ['tool_5'],
      toolSnapshot: [
        { id: 'tool_5', code: 'FLU-005', name: 'Multímetro Digital Industrial True-RMS', serialNumber: 'FLK-87V-4421' }
      ],
      loanDate: '2026-08-10 10:00',
      expectedReturnDate: '2026-08-15',
      actualReturnDate: '2026-08-14 16:30',
      status: 'devuelto',
      project: 'Auditoría Termográfica y Eléctrica Subestación',
      deliveryCondition: 'Excelente',
      returnCondition: 'Excelente',
      deliveryNotes: 'Entregado con cables de prueba y estuche',
      returnNotes: 'Devuelto a tiempo y en perfecto estado funcional',
      createdAt: 1723284000000
    }
  ],
  maintenances: [
    {
      id: 'maint_1',
      code: 'MNT-2026-001',
      toolId: 'tool_4',
      toolCode: 'SOL-004',
      toolName: 'Soldadora Inverter Multiproceso 250A',
      type: 'correctivo',
      status: 'en_proceso',
      scheduledDate: '2026-09-04',
      completedDate: null,
      provider: 'Servicio Autorizado Lincoln Electric',
      responsible: 'Ing. Carlos Morales',
      cost: 180,
      description: 'Sobrecalentamiento tras 20 min de uso continuo en obra y testigo de alarma activado',
      workDone: '',
      partsReplaced: '',
      nextMaintenanceDate: '2027-03-01',
      createdAt: 1725444000000
    },
    {
      id: 'maint_2',
      code: 'MNT-2026-002',
      toolId: 'tool_11',
      toolCode: 'COM-011',
      toolName: 'Compresor de Aire Bicilíndrico 60 Galones 5 HP',
      type: 'preventivo',
      status: 'en_proceso',
      scheduledDate: '2026-09-05',
      completedDate: null,
      provider: 'Taller de Mantenimiento Interno',
      responsible: 'Tec. Andrés Pérez',
      cost: 65,
      description: 'Cambio anual de aceite ISO 100 de cabezal, purga de tanque y verificación de presostato',
      workDone: '',
      partsReplaced: 'Filtro de admisión de aire, aceite sintético',
      nextMaintenanceDate: '2027-09-05',
      createdAt: 1725530400000
    },
    {
      id: 'maint_3',
      code: 'MNT-2026-000-HIST',
      toolId: 'tool_2',
      toolCode: 'GEN-002',
      toolName: 'Generador Eléctrico Diésel 15 kVA Insonorizado',
      type: 'preventivo',
      status: 'completado',
      scheduledDate: '2026-07-20',
      completedDate: '2026-07-21',
      provider: 'Cummins Diésel Service',
      responsible: 'Ing. Roberto Méndez',
      cost: 290,
      description: 'Servicio de 250 horas: Cambio de aceite, filtros de combustible y prueba bajo carga de 10 kW',
      workDone: 'Inspección de bornes de batería, cambio de filtro primario y secundario, calibración de regulador AVR',
      partsReplaced: 'Filtro de combustible FS19732, Filtro de aceite LF16015, 12L Aceite 15W-40',
      nextMaintenanceDate: '2027-01-20',
      createdAt: 1721473200000
    }
  ]
};

const app = createApp({
  setup() {
    const icons = SvgIcons;
    const activeTab = ref('dashboard');

    // Estado de Sesión y Usuario Autenticado
    const currentUser = ref(null);
    const loginForm = reactive({
      username: '',
      password: '',
      remember: true,
      showPassword: false,
      error: '',
      loading: false
    });

    // Permisos Computados
    const isAuthenticated = computed(() => !!currentUser.value);
    const isAdmin = computed(() => currentUser.value?.role === 'admin');
    const isAlmacen = computed(() => currentUser.value?.role === 'almacen' || currentUser.value?.role === 'admin');
    const isConsulta = computed(() => currentUser.value?.role === 'consulta');

    // Toast notificaciones
    const toast = reactive({
      show: false,
      message: '',
      type: 'success',
      timer: null
    });

    const notify = (message, type = 'success') => {
      if (toast.timer) clearTimeout(toast.timer);
      toast.message = message;
      toast.type = type;
      toast.show = true;
      toast.timer = setTimeout(() => {
        toast.show = false;
      }, 4000);
    };

    // Contexto Multi-Tenant y Seguridad
    const currentCompanyId = ref('main');
    const sessionToken = ref('');
    const failedLoginAttempts = ref(0);
    const loginLockoutUntil = ref(0);

    // Sanitizador preventivo contra inyección / XSS
    const sanitizeInput = (val) => {
      if (val === null || val === undefined) return '';
      if (typeof val !== 'string') return val;
      return val
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .trim();
    };

    // Datos principales
    const company = reactive({ ...SEED_DATA.company });
    const users = ref([]);
    const tools = ref([]);
    const technicians = ref([]);
    const loans = ref([]);
    const maintenances = ref([]);

    // =========================================================================
    // UTILIDADES UNIVERSALES DE FECHAS (ESTÁNDAR: "dia/mes/año" DD/MM/AAAA)
    // =========================================================================
    const parseDateObj = (val) => {
      if (!val) return null;
      if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
      if (typeof val === 'number') {
        const d = new Date(val);
        return isNaN(d.getTime()) ? null : d;
      }
      const str = String(val).trim();
      if (!str) return null;

      // Formato DD/MM/AAAA o DD/MM/AAAA HH:mm o DD-MM-AAAA
      const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
      if (dmyMatch) {
        const [, d, m, y, h, min, s] = dmyMatch;
        return new Date(Number(y), Number(m) - 1, Number(d), Number(h || 0), Number(min || 0), Number(s || 0));
      }

      // Formato AAAA-MM-DD o AAAA-MM-DD HH:mm o ISO (2026-10-25T14:30:00)
      const ymdMatch = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})(?:[T\s](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
      if (ymdMatch) {
        const [, y, m, d, h, min, s] = ymdMatch;
        return new Date(Number(y), Number(m) - 1, Number(d), Number(h || 0), Number(min || 0), Number(s || 0));
      }

      const parsed = new Date(str);
      return isNaN(parsed.getTime()) ? null : parsed;
    };

    // Formateador estándar a "dia/mes/año" (DD/MM/AAAA)
    const formatDate = (val) => {
      if (!val) return '';
      const str = String(val).trim();
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
        return str;
      }
      if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(str)) {
        const datePart = str.split(' ')[0];
        const parts = datePart.split('/');
        return `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[2]}`;
      }
      const d = parseDateObj(val);
      if (!d) return str;
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    };

    // Formateador a "dia/mes/año" con hora si está disponible: DD/MM/AAAA HH:mm
    const formatDateTime = (val) => {
      if (!val) return '';
      const str = String(val).trim();
      const d = parseDateObj(val);
      if (!d) return formatDate(val);

      const dStr = formatDate(d);
      const hasTime = str.includes(':') || (str.includes('T') && str.length > 10);
      if (hasTime) {
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        return `${dStr} ${hours}:${minutes}`;
      }
      return dStr;
    };

    // Helper de fecha para cálculo de periodicidad
    const addDaysToDate = (baseDateStr, days) => {
      if (!baseDateStr || !days) return '';
      try {
        const d = parseDateObj(baseDateStr) || new Date(baseDateStr);
        d.setDate(d.getDate() + Number(days));
        return d.toISOString().split('T')[0];
      } catch (e) {
        return '';
      }
    };

    // Carga inicial y persistencia
    const loadFromStorage = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          users.value = parsed.users && parsed.users.length > 0 ? parsed.users : JSON.parse(JSON.stringify(SEED_DATA.users));
          tools.value = (parsed.tools || []).map(t => {
            // Mapeo seguro de periodicidades
            let maintPeriod = t.maintenancePeriod;
            if (!maintPeriod && t.maintenancePeriodDays) {
              if (t.maintenancePeriodDays === 30) maintPeriod = 'mensual';
              else if (t.maintenancePeriodDays === 90) maintPeriod = 'trimestral';
              else if (t.maintenancePeriodDays === 180) maintPeriod = 'semestral';
              else if (t.maintenancePeriodDays === 365) maintPeriod = 'anual';
              else maintPeriod = 'trimestral';
            }

            let testPeriod = t.testingPeriod;
            if (!testPeriod && t.testingPeriodDays) {
              if (t.testingPeriodDays === 15) testPeriod = '15_dias';
              else if (t.testingPeriodDays === 30) testPeriod = '1_mes';
              else if (t.testingPeriodDays === 90) testPeriod = '3_meses';
              else testPeriod = '15_dias';
            }

            const tool = {
              requiresPeriodicMaintenance: Boolean(t.requiresPeriodicMaintenance),
              maintenancePeriod: maintPeriod || 'trimestral',
              maintenancePeriodDays: Number(t.maintenancePeriodDays) || (maintPeriod === 'mensual' ? 30 : maintPeriod === 'semestral' ? 180 : maintPeriod === 'anual' ? 365 : 90),
              lastMaintenanceDate: t.lastMaintenanceDate || '',
              nextMaintenanceDate: t.nextMaintenanceDate || '',
              requiresPeriodicTesting: Boolean(t.requiresPeriodicTesting),
              testingPeriod: testPeriod || '15_dias',
              testingPeriodDays: Number(t.testingPeriodDays) || (testPeriod === '1_mes' ? 30 : testPeriod === '3_meses' ? 90 : 15),
              lastTestingDate: t.lastTestingDate || '',
              nextTestingDate: t.nextTestingDate || '',
              ...t
            };

            // Asegurar que demo data tenga las opciones activas
            if (tool.code === 'GEN-002') {
              tool.requiresPeriodicMaintenance = true;
              tool.maintenancePeriod = 'trimestral';
              tool.maintenancePeriodDays = 90;
              tool.lastMaintenanceDate = tool.lastMaintenanceDate || '2026-06-15';
              tool.nextMaintenanceDate = tool.nextMaintenanceDate || '2026-09-13';
              tool.requiresPeriodicTesting = true;
              tool.testingPeriod = '15_dias';
              tool.testingPeriodDays = 15;
              tool.lastTestingDate = tool.lastTestingDate || '2026-09-10';
              tool.nextTestingDate = tool.nextTestingDate || '2026-09-25';
            } else if (tool.code === 'MIN-003') {
              tool.requiresPeriodicMaintenance = true;
              tool.maintenancePeriod = 'semestral';
              tool.maintenancePeriodDays = 180;
              tool.lastMaintenanceDate = tool.lastMaintenanceDate || '2026-03-20';
              tool.nextMaintenanceDate = tool.nextMaintenanceDate || '2026-09-16';
              tool.requiresPeriodicTesting = true;
              tool.testingPeriod = '1_mes';
              tool.testingPeriodDays = 30;
              tool.lastTestingDate = tool.lastTestingDate || '2026-09-01';
              tool.nextTestingDate = tool.nextTestingDate || '2026-10-01';
            } else if (tool.code === 'BAI-008') {
              tool.requiresPeriodicMaintenance = true;
              tool.maintenancePeriod = 'mensual';
              tool.maintenancePeriodDays = 30;
              tool.lastMaintenanceDate = tool.lastMaintenanceDate || '2026-08-25';
              tool.nextMaintenanceDate = tool.nextMaintenanceDate || '2026-09-24';
              tool.requiresPeriodicTesting = true;
              tool.testingPeriod = '15_dias';
              tool.testingPeriodDays = 15;
              tool.lastTestingDate = tool.lastTestingDate || '2026-09-15';
              tool.nextTestingDate = tool.nextTestingDate || '2026-09-30';
            } else if (tool.code === 'COM-011') {
              tool.requiresPeriodicMaintenance = true;
              tool.maintenancePeriod = 'anual';
              tool.maintenancePeriodDays = 365;
              tool.lastMaintenanceDate = tool.lastMaintenanceDate || '2025-09-20';
              tool.nextMaintenanceDate = tool.nextMaintenanceDate || '2026-09-20';
              tool.requiresPeriodicTesting = true;
              tool.testingPeriod = '3_meses';
              tool.testingPeriodDays = 90;
              tool.lastTestingDate = tool.lastTestingDate || '2026-06-25';
              tool.nextTestingDate = tool.nextTestingDate || '2026-09-23';
            }
            return tool;
          });
          technicians.value = parsed.technicians || [];
          loans.value = parsed.loans || [];
          maintenances.value = (parsed.maintenances || []).map(m => ({
            priority: m.priority || (m.type === 'correctivo' ? 'alta' : 'media'),
            estimatedCost: Number(m.estimatedCost) || Number(m.cost) || 0,
            failureDescription: m.failureDescription || (m.type === 'correctivo' ? m.description : ''),
            workToDo: m.workToDo || (m.type === 'correctivo' ? m.description : ''),
            testingResult: m.testingResult || '',
            ...m
          }));
          if (parsed.currentCompanyId) currentCompanyId.value = parsed.currentCompanyId;
          if (parsed.company) Object.assign(company, parsed.company);
        } else {
          cargarDatosEjemplo(false);
        }
      } catch (e) {
        console.error('Error cargando localStorage:', e);
        cargarDatosEjemplo(false);
      }

      // Comprobar sesión guardada
      checkSavedSession();
    };

    const saveToStorage = () => {
      try {
        const payload = {
          currentCompanyId: currentCompanyId.value,
          company,
          users: users.value,
          tools: tools.value,
          technicians: technicians.value,
          loans: loans.value,
          maintenances: maintenances.value,
          updatedAt: new Date().toISOString()
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      } catch (e) {
        console.error('Error guardando en localStorage:', e);
        notify('Error de almacenamiento local', 'error');
      }
    };

    // Auto-guardar local
    watch([tools, technicians, loans, maintenances, users], () => {
      saveToStorage();
    }, { deep: true });

    // =========================================================================
    // INTEGRACIÓN SUPABASE (POSTGRESQL & REALTIME WEBSOCKETS)
    // =========================================================================
    const supabaseClient = ref(null);
    const supabaseConnected = ref(false);
    const supabaseConnecting = ref(false);
    const supabaseRealtimeActive = ref(false);
    const isSyncingCloud = ref(false);
    const showSupabaseModal = ref(false);

    const supabaseForm = reactive({
      url: '',
      anonKey: '',
      status: 'idle', // 'idle' | 'testing' | 'connected' | 'error'
      errorMessage: ''
    });

    // Mapeo bidireccional JS <-> PostgreSQL Multi-Tenant (Protección y Aislamiento por Empresa)
    const toSupabaseTool = (t) => {
      const meta = {
        requiresPeriodicMaintenance: t.requiresPeriodicMaintenance === true,
        maintenancePeriod: t.maintenancePeriod || 'trimestral',
        maintenancePeriodDays: Number(t.maintenancePeriodDays) || 0,
        lastMaintenanceDate: t.lastMaintenanceDate || '',
        nextMaintenanceDate: t.nextMaintenanceDate || '',
        requiresPeriodicTesting: t.requiresPeriodicTesting === true,
        testingPeriod: t.testingPeriod || '15_dias',
        testingPeriodDays: Number(t.testingPeriodDays) || 0,
        lastTestingDate: t.lastTestingDate || '',
        nextTestingDate: t.nextTestingDate || ''
      };
      let cleanNotes = (t.notes || '').replace(/<!--METADATA:[\s\S]*?-->/g, '').trim();
      let notesWithMeta = cleanNotes ? (cleanNotes + '\n<!--METADATA:' + JSON.stringify(meta) + '-->') : ('<!--METADATA:' + JSON.stringify(meta) + '-->');

      return {
        id: t.id,
        company_id: currentCompanyId.value || t.companyId || 'main',
        code: sanitizeInput(t.code),
        name: sanitizeInput(t.name),
        category: sanitizeInput(t.category || ''),
        brand: sanitizeInput(t.brand || ''),
        model: sanitizeInput(t.model || ''),
        serialNumber: sanitizeInput(t.serialNumber || ''),
        status: t.status || 'disponible',
        location: sanitizeInput(t.location || ''),
        acquisitionDate: t.acquisitionDate || '',
        cost: Number(t.cost) || 0,
        notes: notesWithMeta,
        createdAt: Number(t.createdAt) || Date.now()
      };
    };

    const fromSupabaseTool = (r) => {
      let meta = {};
      let cleanNotes = r.notes || '';
      const match = cleanNotes.match(/<!--METADATA:([\s\S]*?)-->/);
      if (match) {
        try {
          meta = JSON.parse(match[1]);
        } catch (e) {}
        cleanNotes = cleanNotes.replace(/<!--METADATA:[\s\S]*?-->/g, '').trim();
      }
      return {
        id: r.id,
        companyId: r.company_id || r.companyId || 'main',
        code: r.code,
        name: r.name,
        category: r.category || '',
        brand: r.brand || '',
        model: r.model || '',
        serialNumber: r.serialNumber || r.serial_number || '',
        status: r.status || 'disponible',
        location: r.location || '',
        acquisitionDate: r.acquisitionDate || r.acquisition_date || '',
        cost: Number(r.cost) || 0,
        notes: cleanNotes,
        requiresPeriodicMaintenance: meta.requiresPeriodicMaintenance ?? (r.requires_periodic_maintenance === true || r.requiresPeriodicMaintenance === true),
        maintenancePeriod: meta.maintenancePeriod || r.maintenance_period || r.maintenancePeriod || 'trimestral',
        maintenancePeriodDays: Number(meta.maintenancePeriodDays || r.maintenance_period_days || r.maintenancePeriodDays) || 0,
        lastMaintenanceDate: meta.lastMaintenanceDate || r.last_maintenance_date || r.lastMaintenanceDate || '',
        nextMaintenanceDate: meta.nextMaintenanceDate || r.next_maintenance_date || r.nextMaintenanceDate || '',
        requiresPeriodicTesting: meta.requiresPeriodicTesting ?? (r.requires_periodic_testing === true || r.requiresPeriodicTesting === true),
        testingPeriod: meta.testingPeriod || r.testing_period || r.testingPeriod || '15_dias',
        testingPeriodDays: Number(meta.testingPeriodDays || r.testing_period_days || r.testingPeriodDays) || 0,
        lastTestingDate: meta.lastTestingDate || r.last_testing_date || r.lastTestingDate || '',
        nextTestingDate: meta.nextTestingDate || r.next_testing_date || r.nextTestingDate || '',
        createdAt: Number(r.createdAt || r.created_at) || Date.now()
      };
    };

    const toSupabaseLoan = (l) => ({
      id: l.id,
      company_id: currentCompanyId.value || l.companyId || 'main',
      voucherNumber: l.voucherNumber,
      technicianId: l.technicianId || null,
      technicianName: sanitizeInput(l.technicianName),
      technicianDni: sanitizeInput(l.technicianDni || ''),
      toolIds: l.toolIds || [],
      toolSnapshot: l.toolSnapshot || [],
      loanDate: l.loanDate,
      expectedReturnDate: l.expectedReturnDate,
      actualReturnDate: l.actualReturnDate || null,
      status: l.status || 'activo',
      project: sanitizeInput(l.project || ''),
      deliveryCondition: l.deliveryCondition || 'Excelente',
      returnCondition: l.returnCondition || null,
      deliveryNotes: sanitizeInput(l.deliveryNotes || ''),
      returnNotes: sanitizeInput(l.returnNotes || ''),
      dispatcher: sanitizeInput(l.dispatcher || ''),
      receiver: sanitizeInput(l.receiver || ''),
      createdAt: Number(l.createdAt) || Date.now()
    });

    const fromSupabaseLoan = (r) => ({
      id: r.id,
      companyId: r.company_id || r.companyId || 'main',
      voucherNumber: r.voucherNumber || r.voucher_number,
      technicianId: r.technicianId || r.technician_id,
      technicianName: r.technicianName || r.technician_name,
      technicianDni: r.technicianDni || r.technician_dni || '',
      toolIds: r.toolIds || r.tool_ids || [],
      toolSnapshot: r.toolSnapshot || r.tool_snapshot || [],
      loanDate: r.loanDate || r.loan_date,
      expectedReturnDate: r.expectedReturnDate || r.expected_return_date,
      actualReturnDate: r.actualReturnDate !== undefined ? r.actualReturnDate : r.actual_return_date,
      status: r.status || 'activo',
      project: r.project || '',
      deliveryCondition: r.deliveryCondition || r.delivery_condition || 'Excelente',
      returnCondition: r.returnCondition !== undefined ? r.returnCondition : r.return_condition,
      deliveryNotes: r.deliveryNotes || r.delivery_notes || '',
      returnNotes: r.returnNotes || r.return_notes || '',
      dispatcher: r.dispatcher || '',
      receiver: r.receiver || '',
      createdAt: Number(r.createdAt || r.created_at) || Date.now()
    });

    const toSupabaseMaint = (m) => {
      let desc = m.description || '';
      if (m.failureDescription && !desc.includes(m.failureDescription)) {
        desc = (desc ? desc + '\n' : '') + 'Falla: ' + m.failureDescription;
      }
      let work = m.workDone || '';
      if (m.testingResult && !work.includes(m.testingResult)) {
        work = (work ? work + '\n' : '') + 'Resultado: ' + m.testingResult;
      }
      return {
        id: m.id,
        company_id: currentCompanyId.value || m.companyId || 'main',
        code: m.code,
        toolId: m.toolId || null,
        toolCode: m.toolCode,
        toolName: m.toolName,
        type: m.type || 'preventivo',
        status: m.status || 'programado',
        scheduledDate: m.scheduledDate,
        completedDate: m.completedDate || null,
        provider: sanitizeInput(m.provider || ''),
        responsible: sanitizeInput(m.responsible || ''),
        cost: Number(m.cost) || 0,
        description: sanitizeInput(desc),
        workDone: sanitizeInput(work),
        partsReplaced: sanitizeInput(m.partsReplaced || ''),
        nextMaintenanceDate: m.nextMaintenanceDate || '',
        createdAt: Number(m.createdAt) || Date.now()
      };
    };

    const fromSupabaseMaint = (r) => ({
      id: r.id,
      companyId: r.company_id || r.companyId || 'main',
      code: r.code,
      toolId: r.toolId || r.tool_id,
      toolCode: r.toolCode || r.tool_code,
      toolName: r.toolName || r.tool_name,
      type: r.type || 'preventivo',
      status: r.status || 'programado',
      priority: r.priority || (r.type === 'correctivo' ? 'alta' : 'media'),
      scheduledDate: r.scheduledDate || r.scheduled_date,
      completedDate: r.completedDate !== undefined ? r.completedDate : r.completed_date,
      provider: r.provider || '',
      responsible: r.responsible || '',
      cost: Number(r.cost) || 0,
      estimatedCost: Number(r.estimatedCost || r.estimated_cost) || Number(r.cost) || 0,
      description: r.description || '',
      failureDescription: r.failureDescription || r.failure_description || (r.type === 'correctivo' ? r.description : ''),
      workToDo: r.workToDo || r.work_to_do || (r.type === 'correctivo' ? r.description : ''),
      workDone: r.workDone || r.work_done || '',
      partsReplaced: r.partsReplaced || r.parts_replaced || '',
      nextMaintenanceDate: r.nextMaintenanceDate || r.next_maintenance_date || '',
      testingResult: r.testingResult || r.testing_result || '',
      createdAt: Number(r.createdAt || r.created_at) || Date.now()
    });

    const toSupabaseTech = (t) => ({
      id: t.id,
      company_id: currentCompanyId.value || t.companyId || 'main',
      dni: sanitizeInput(t.dni),
      name: sanitizeInput(t.name),
      phone: sanitizeInput(t.phone || ''),
      email: sanitizeInput(t.email || ''),
      role: sanitizeInput(t.role || ''),
      active: t.active !== false,
      createdAt: t.createdAt || new Date().toISOString().split('T')[0]
    });

    const fromSupabaseTech = (r) => ({
      id: r.id,
      companyId: r.company_id || r.companyId || 'main',
      dni: r.dni,
      name: r.name,
      phone: r.phone || '',
      email: r.email || '',
      role: r.role || '',
      active: r.active !== false,
      createdAt: r.createdAt || r.created_at
    });

    const toSupabaseUser = (u) => {
      const payload = {
        id: u.id,
        company_id: currentCompanyId.value || u.companyId || 'main',
        username: sanitizeInput(u.username),
        name: sanitizeInput(u.name),
        email: sanitizeInput(u.email || ''),
        role: u.role || 'almacen',
        active: u.active !== false,
        createdAt: u.createdAt || new Date().toISOString().split('T')[0]
      };
      if (u.passwordHash) {
        payload.password_hash = u.passwordHash;
      }
      return payload;
    };

    const fromSupabaseUser = (r) => ({
      id: r.id,
      companyId: r.company_id || r.companyId || 'main',
      username: r.username,
      name: r.name,
      email: r.email || '',
      role: r.role || 'almacen',
      active: r.active !== false,
      createdAt: r.createdAt || r.created_at
    });

    const toSupabaseCompany = (c) => ({
      id: currentCompanyId.value || c.id || 'main',
      name: sanitizeInput(c.name || ''),
      nit: sanitizeInput(c.nit || ''),
      warehouse: sanitizeInput(c.warehouse || ''),
      address: sanitizeInput(c.address || ''),
      phone: sanitizeInput(c.phone || ''),
      manager: sanitizeInput(c.manager || '')
    });

    const fromSupabaseCompany = (r) => ({
      id: r.id || 'main',
      name: r.name || '',
      nit: r.nit || '',
      warehouse: r.warehouse || '',
      address: r.address || '',
      phone: r.phone || '',
      manager: r.manager || ''
    });

    // Encabezados de Seguridad y Contexto Multi-Tenant para Supabase PostgREST
    const applyClientHeaders = () => {
      if (!supabaseClient.value) return;
      try {
        const headers = {};
        if (sessionToken.value) {
          headers['x-session-token'] = sessionToken.value;
        }
        if (currentCompanyId.value) {
          headers['x-company-id'] = currentCompanyId.value;
        }
        if (supabaseClient.value.rest && supabaseClient.value.rest.headers) {
          Object.assign(supabaseClient.value.rest.headers, headers);
        }
      } catch (e) {
        console.warn('Error aplicando encabezados de seguridad multi-tenant:', e);
      }
    };

    // Manejador de eventos en tiempo real (WebSockets) con Validación de Tenant
    const handleRealtimeChange = (tableName, payload) => {
      const { eventType, new: newRow, old: oldRow } = payload;
      
      // Escudo de Seguridad: Descartar eventos que no correspondan a la empresa activa
      const eventCompanyId = (newRow && (newRow.company_id || newRow.companyId)) || (oldRow && (oldRow.company_id || oldRow.companyId));
      if (eventCompanyId && eventCompanyId !== currentCompanyId.value) {
        return;
      }

      console.log(`[Supabase Realtime Tenant Room] ${tableName} -> ${eventType}:`, newRow || oldRow);

      if (tableName === 'tools') {
        if (eventType === 'INSERT') {
          const item = fromSupabaseTool(newRow);
          const idx = tools.value.findIndex(t => t.id === item.id);
          if (idx === -1) tools.value.unshift(item);
        } else if (eventType === 'UPDATE') {
          const item = fromSupabaseTool(newRow);
          const idx = tools.value.findIndex(t => t.id === item.id);
          if (idx !== -1) tools.value[idx] = item;
          else tools.value.unshift(item);
        } else if (eventType === 'DELETE') {
          tools.value = tools.value.filter(t => t.id !== oldRow.id);
        }
      } else if (tableName === 'loans') {
        if (eventType === 'INSERT') {
          const item = fromSupabaseLoan(newRow);
          const idx = loans.value.findIndex(l => l.id === item.id);
          if (idx === -1) loans.value.unshift(item);
        } else if (eventType === 'UPDATE') {
          const item = fromSupabaseLoan(newRow);
          const idx = loans.value.findIndex(l => l.id === item.id);
          if (idx !== -1) loans.value[idx] = item;
          else loans.value.unshift(item);
        } else if (eventType === 'DELETE') {
          loans.value = loans.value.filter(l => l.id !== oldRow.id);
        }
      } else if (tableName === 'maintenances') {
        if (eventType === 'INSERT') {
          const item = fromSupabaseMaint(newRow);
          const idx = maintenances.value.findIndex(m => m.id === item.id);
          if (idx === -1) maintenances.value.unshift(item);
        } else if (eventType === 'UPDATE') {
          const item = fromSupabaseMaint(newRow);
          const idx = maintenances.value.findIndex(m => m.id === item.id);
          if (idx !== -1) maintenances.value[idx] = item;
          else maintenances.value.unshift(item);
        } else if (eventType === 'DELETE') {
          maintenances.value = maintenances.value.filter(m => m.id !== oldRow.id);
        }
      } else if (tableName === 'technicians') {
        if (eventType === 'INSERT') {
          const item = fromSupabaseTech(newRow);
          const idx = technicians.value.findIndex(t => t.id === item.id);
          if (idx === -1) technicians.value.unshift(item);
        } else if (eventType === 'UPDATE') {
          const item = fromSupabaseTech(newRow);
          const idx = technicians.value.findIndex(t => t.id === item.id);
          if (idx !== -1) technicians.value[idx] = item;
          else technicians.value.unshift(item);
        } else if (eventType === 'DELETE') {
          technicians.value = technicians.value.filter(t => t.id !== oldRow.id);
        }
      } else if (tableName === 'users') {
        if (eventType === 'INSERT') {
          const item = fromSupabaseUser(newRow);
          const idx = users.value.findIndex(u => u.id === item.id);
          if (idx === -1) users.value.unshift(item);
        } else if (eventType === 'UPDATE') {
          const item = fromSupabaseUser(newRow);
          const idx = users.value.findIndex(u => u.id === item.id);
          if (idx !== -1) {
            users.value[idx] = item;
            if (currentUser.value && currentUser.value.id === item.id) {
              currentUser.value.name = item.name;
              currentUser.value.role = item.role;
            }
          } else {
            users.value.unshift(item);
          }
        } else if (eventType === 'DELETE') {
          users.value = users.value.filter(u => u.id !== oldRow.id);
        }
      } else if (tableName === 'company') {
        if (eventType === 'INSERT' || eventType === 'UPDATE') {
          Object.assign(company, fromSupabaseCompany(newRow));
        }
      }
    };

    // Configurar canales de suscripción en tiempo real estrictamente particionados por Empresa
    const setupRealtimeSubscription = () => {
      if (!supabaseClient.value) return;
      try {
        supabaseClient.value.removeAllChannels();

        const tenantFilter = `company_id=eq.${currentCompanyId.value}`;

        supabaseClient.value
          .channel('toolpro-tenant-room-' + currentCompanyId.value)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'tools', filter: tenantFilter }, (p) => handleRealtimeChange('tools', p))
          .on('postgres_changes', { event: '*', schema: 'public', table: 'loans', filter: tenantFilter }, (p) => handleRealtimeChange('loans', p))
          .on('postgres_changes', { event: '*', schema: 'public', table: 'maintenances', filter: tenantFilter }, (p) => handleRealtimeChange('maintenances', p))
          .on('postgres_changes', { event: '*', schema: 'public', table: 'technicians', filter: tenantFilter }, (p) => handleRealtimeChange('technicians', p))
          .on('postgres_changes', { event: '*', schema: 'public', table: 'users', filter: tenantFilter }, (p) => handleRealtimeChange('users', p))
          .on('postgres_changes', { event: '*', schema: 'public', table: 'company', filter: `id=eq.${currentCompanyId.value}` }, (p) => handleRealtimeChange('company', p))
          .subscribe((status) => {
            console.log('[Supabase Realtime Tenant Room Status]:', status);
            if (status === 'SUBSCRIBED') {
              supabaseRealtimeActive.value = true;
            } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
              supabaseRealtimeActive.value = false;
            }
          });
      } catch (err) {
        console.error('Error suscribiendo a Realtime tenant:', err);
      }
    };

    // Descargar datos scoped al tenant autenticado (NUNCA descarga hashes de contraseñas)
    const fetchAllFromSupabase = async () => {
      if (!supabaseClient.value) return;
      try {
        isSyncingCloud.value = true;
        applyClientHeaders();

        const [compRes, usrRes, toolRes, techRes, loanRes, maintRes] = await Promise.all([
          supabaseClient.value.from('company').select('*').eq('id', currentCompanyId.value).limit(1),
          supabaseClient.value.from('users').select('id, username, name, email, role, active, created_at, company_id').eq('company_id', currentCompanyId.value),
          supabaseClient.value.from('tools').select('*').eq('company_id', currentCompanyId.value),
          supabaseClient.value.from('technicians').select('*').eq('company_id', currentCompanyId.value),
          supabaseClient.value.from('loans').select('*').eq('company_id', currentCompanyId.value),
          supabaseClient.value.from('maintenances').select('*').eq('company_id', currentCompanyId.value)
        ]);

        if (toolRes.data) {
          tools.value = toolRes.data.map(fromSupabaseTool).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        }
        if (techRes.data) {
          technicians.value = techRes.data.map(fromSupabaseTech).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        }
        if (loanRes.data) {
          loans.value = loanRes.data.map(fromSupabaseLoan).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        }
        if (maintRes.data) {
          maintenances.value = maintRes.data.map(fromSupabaseMaint).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        }
        if (usrRes.data) {
          users.value = usrRes.data.map(fromSupabaseUser);
        }
        if (compRes.data && compRes.data.length > 0) {
          Object.assign(company, fromSupabaseCompany(compRes.data[0]));
        }

        saveToStorage();
        setupRealtimeSubscription();
        console.log(`[Supabase Multi-Tenant Sync] Sincronizados con éxito para empresa "${currentCompanyId.value}": ${tools.value.length} equipos, ${loans.value.length} préstamos, ${technicians.value.length} técnicos.`);
      } catch (err) {
        console.error('Error descargando datos de Supabase:', err);
      } finally {
        isSyncingCloud.value = false;
      }
    };

    // Inicializar cliente Supabase
    const initSupabase = async (customUrl = '', customKey = '') => {
      let url = customUrl;
      let key = customKey;

      if (!url || !key) {
        const savedConfig = localStorage.getItem('TOOLMASTER_SUPABASE_CONFIG');
        if (savedConfig) {
          try {
            const parsed = JSON.parse(savedConfig);
            url = parsed.url;
            key = parsed.anonKey;
          } catch (e) {}
        }
      }

      if (!url || !key) {
        if (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.url && window.SUPABASE_CONFIG.anonKey) {
          url = window.SUPABASE_CONFIG.url;
          key = window.SUPABASE_CONFIG.anonKey;
        }
      }

      supabaseForm.url = url || '';
      supabaseForm.anonKey = key || '';

      if (!url || !key || !url.trim() || !key.trim() || url.includes('TU_PROYECTO_AQUI')) {
        supabaseConnected.value = false;
        supabaseForm.status = 'idle';
        return false;
      }

      url = url.trim();
      key = key.trim();

      try {
        supabaseConnecting.value = true;
        supabaseForm.status = 'testing';
        supabaseForm.errorMessage = '';

        const clientFactory = window.supabase?.createClient || window.createClient;
        if (!clientFactory) {
          throw new Error('La librería cliente de Supabase no está disponible en window.supabase.');
        }

        const client = clientFactory(url, key, {
          auth: {
            persistSession: false,
            autoRefreshToken: false
          }
        });

        // Verificar conexión con consulta ligera
        const { data, error } = await client.from('company').select('id').limit(1);
        if (error) {
          throw error;
        }

        supabaseClient.value = client;
        supabaseConnected.value = true;
        supabaseForm.status = 'connected';
        supabaseForm.errorMessage = '';

        localStorage.setItem('TOOLMASTER_SUPABASE_CONFIG', JSON.stringify({ url, anonKey: key }));

        // Cero Fugas de Datos: Solo descargar catálogo y suscribir si el usuario ya está autenticado
        if (currentUser.value) {
          applyClientHeaders();
          await fetchAllFromSupabase();
          setupRealtimeSubscription();
        }

        return true;
      } catch (err) {
        console.error('Error al inicializar Supabase:', err);
        supabaseConnected.value = false;
        supabaseForm.status = 'error';
        supabaseForm.errorMessage = err.message || 'No se pudo conectar a Supabase. Verifica la URL, la anon key y el script SQL.';
        return false;
      } finally {
        supabaseConnecting.value = false;
      }
    };

    // Guardar configuración desde el modal
    const saveSupabaseConfig = async () => {
      if (!supabaseForm.url.trim() || !supabaseForm.anonKey.trim()) {
        notify('Ingresa la URL y la Anon Key de Supabase', 'warning');
        return;
      }
      notify('Comprobando conexión con Supabase...', 'info');
      const ok = await initSupabase(supabaseForm.url.trim(), supabaseForm.anonKey.trim());
      if (ok) {
        notify('¡Conexión exitosa a Supabase! Base de datos en tiempo real activa.', 'success');
        showSupabaseModal.value = false;
      } else {
        notify(supabaseForm.errorMessage || 'Error de conexión con Supabase', 'error');
      }
    };

    // Desconectar Supabase y regresar a Modo Local
    const disconnectSupabase = () => {
      if (supabaseClient.value) {
        try {
          supabaseClient.value.removeAllChannels();
        } catch (e) {}
      }
      supabaseClient.value = null;
      supabaseConnected.value = false;
      supabaseRealtimeActive.value = false;
      supabaseForm.status = 'idle';
      supabaseForm.url = '';
      supabaseForm.anonKey = '';
      supabaseForm.errorMessage = '';
      localStorage.removeItem('TOOLMASTER_SUPABASE_CONFIG');
      notify('Desconectado de Supabase. El sistema ahora opera en Modo Local (offline).', 'info');
    };

    // Migración 1-Clic: Subir todos los datos locales actuales a Supabase (Solo Admin)
    const uploadLocalDataToSupabase = async () => {
      if (!isAdmin.value) {
        notify('Acción restringida: solo un administrador puede subir datos a la nube', 'error');
        return;
      }
      if (!supabaseClient.value) {
        notify('Debes conectar Supabase antes de subir datos', 'error');
        return;
      }
      try {
        isSyncingCloud.value = true;
        applyClientHeaders();
        notify('Sincronizando base de datos local con Supabase...', 'info');

        // 1. Empresa
        await supabaseClient.value.from('company').upsert([toSupabaseCompany(company)]);

        // 2. Usuarios
        if (users.value.length > 0) {
          await supabaseClient.value.from('users').upsert(users.value.map(toSupabaseUser));
        }

        // 3. Herramientas
        if (tools.value.length > 0) {
          await supabaseClient.value.from('tools').upsert(tools.value.map(toSupabaseTool));
        }

        // 4. Técnicos
        if (technicians.value.length > 0) {
          await supabaseClient.value.from('technicians').upsert(technicians.value.map(toSupabaseTech));
        }

        // 5. Préstamos
        if (loans.value.length > 0) {
          await supabaseClient.value.from('loans').upsert(loans.value.map(toSupabaseLoan));
        }

        // 6. Mantenimientos
        if (maintenances.value.length > 0) {
          await supabaseClient.value.from('maintenances').upsert(maintenances.value.map(toSupabaseMaint));
        }

        notify(`¡Sincronización completa! ${tools.value.length} herramientas, ${loans.value.length} préstamos y ${technicians.value.length} técnicos guardados en la nube.`, 'success');
      } catch (err) {
        console.error('Error en uploadLocalDataToSupabase:', err);
        notify('Error al sincronizar con Supabase: ' + (err.message || 'Verifica políticas RLS'), 'error');
      } finally {
        isSyncingCloud.value = false;
      }
    };

    const openSupabaseModal = () => {
      if (!supabaseForm.url || !supabaseForm.anonKey) {
        const saved = localStorage.getItem('TOOLMASTER_SUPABASE_CONFIG');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            supabaseForm.url = parsed.url || '';
            supabaseForm.anonKey = parsed.anonKey || '';
          } catch (e) {}
        }
        if (!supabaseForm.url && window.SUPABASE_CONFIG) {
          supabaseForm.url = window.SUPABASE_CONFIG.url || '';
          supabaseForm.anonKey = window.SUPABASE_CONFIG.anonKey || '';
        }
      }
      showSupabaseModal.value = true;
    };

    // Sincronizar datos de empresa con Supabase al modificarlos (Solo Administrador)
    watch(company, () => {
      saveToStorage();
      if (supabaseConnected.value && supabaseClient.value && isAdmin.value) {
        supabaseClient.value.from('company').upsert([toSupabaseCompany(company)]).then(({ error }) => {
          if (error) console.error('Supabase company sync error:', error);
        });
      }
    }, { deep: true });

    // AUTENTICACIÓN: Login con Rate Limiting & RPC Criptográfica
    const login = async () => {
      loginForm.error = '';

      // 1. Rate Limiting en Cliente
      const now = Date.now();
      if (loginLockoutUntil.value > now) {
        const remainingSecs = Math.ceil((loginLockoutUntil.value - now) / 1000);
        loginForm.error = `Demasiados intentos fallidos. Por seguridad, espera ${remainingSecs} segundos antes de reintentar.`;
        return;
      }

      if (!loginForm.username.trim()) {
        loginForm.error = 'Ingresa tu nombre de usuario o correo electrónico.';
        return;
      }
      if (!loginForm.password) {
        loginForm.error = 'Por favor ingresa tu clave de acceso.';
        return;
      }

      loginForm.loading = true;
      const targetUser = sanitizeInput(loginForm.username.trim().toLowerCase());
      const inputHash = await hashPassword(loginForm.password);

      // 2. Procedimiento Criptográfico en Supabase (app_login)
      if (supabaseConnected.value && supabaseClient.value) {
        try {
          const { data: authResult, error: rpcError } = await supabaseClient.value.rpc('app_login', {
            p_username: targetUser,
            p_password_hash: inputHash,
            p_company_id: currentCompanyId.value || 'main'
          });

          if (!rpcError && authResult) {
            if (!authResult.success) {
              failedLoginAttempts.value++;
              if (failedLoginAttempts.value >= 5) {
                loginLockoutUntil.value = Date.now() + 60000;
              }
              loginForm.error = authResult.error || 'Credenciales inválidas.';
              loginForm.loading = false;
              return;
            }

            // Inicio exitoso autenticado por el servidor
            failedLoginAttempts.value = 0;
            sessionToken.value = authResult.session_token || '';
            currentCompanyId.value = authResult.user.company_id || 'main';
            currentUser.value = {
              id: authResult.user.id,
              username: authResult.user.username,
              name: authResult.user.name,
              email: authResult.user.email,
              role: authResult.user.role,
              companyId: authResult.user.company_id
            };

            if (authResult.company) {
              Object.assign(company, fromSupabaseCompany(authResult.company));
            }

            applyClientHeaders();

            const sessionPayload = {
              userId: authResult.user.id,
              username: authResult.user.username,
              companyId: authResult.user.company_id,
              role: authResult.user.role,
              token: authResult.session_token,
              expiresAt: authResult.expires_at ? new Date(authResult.expires_at).getTime() : (Date.now() + 30 * 86400000),
              loginTime: Date.now()
            };

            if (loginForm.remember) {
              localStorage.setItem(SESSION_KEY, JSON.stringify(sessionPayload));
            } else {
              sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionPayload));
            }

            loginForm.password = '';
            loginForm.error = '';
            loginForm.loading = false;
            notify(`¡Bienvenido/a, ${authResult.user.name}!`);

            await fetchAllFromSupabase();
            return;
          }
        } catch (e) {
          console.warn('RPC app_login falló o no existe aún en la base de datos:', e);
        }
      }

      // 3. Fallback Seguro Offline / PWA
      let found = users.value.find(u => 
        (u.username && u.username.toLowerCase() === targetUser) ||
        (u.email && u.email.toLowerCase() === targetUser)
      );

      // Si no se encuentra en el caché local pero Supabase está conectado
      if (!found && supabaseConnected.value && supabaseClient.value) {
        try {
          const { data, error } = await supabaseClient.value
            .from('users')
            .select('id, username, name, email, role, active, created_at, company_id')
            .eq('company_id', currentCompanyId.value || 'main')
            .or(`username.eq.${targetUser},email.eq.${targetUser}`)
            .limit(1);
          if (data && data.length > 0) {
            const cloudUser = fromSupabaseUser(data[0]);
            users.value.push(cloudUser);
            found = cloudUser;
          }
        } catch (e) {
          console.warn('Error buscando usuario en Supabase:', e);
        }
      }

      if (!found) {
        failedLoginAttempts.value++;
        if (failedLoginAttempts.value >= 5) {
          loginLockoutUntil.value = Date.now() + 60000;
        }
        loginForm.error = 'Usuario no encontrado en el sistema.';
        loginForm.loading = false;
        return;
      }

      if (!found.active) {
        loginForm.error = 'Esta cuenta está desactivada. Consulta con el Administrador.';
        loginForm.loading = false;
        return;
      }

      if (found.passwordHash && found.passwordHash !== inputHash) {
        failedLoginAttempts.value++;
        if (failedLoginAttempts.value >= 5) {
          loginLockoutUntil.value = Date.now() + 60000;
        }
        loginForm.error = 'Clave de acceso incorrecta. Verifica mayúsculas y minúsculas.';
        loginForm.loading = false;
        return;
      }

      // Inicio exitoso modo offline
      failedLoginAttempts.value = 0;
      currentCompanyId.value = found.companyId || 'main';
      currentUser.value = {
        id: found.id,
        username: found.username,
        name: found.name,
        email: found.email,
        role: found.role,
        companyId: found.companyId || 'main'
      };

      const sessionPayload = {
        userId: found.id,
        username: found.username,
        companyId: found.companyId || 'main',
        role: found.role,
        token: '',
        expiresAt: Date.now() + 7 * 86400000,
        loginTime: Date.now()
      };

      if (loginForm.remember) {
        localStorage.setItem(SESSION_KEY, JSON.stringify(sessionPayload));
      } else {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionPayload));
      }

      loginForm.password = '';
      loginForm.error = '';
      loginForm.loading = false;
      notify(`¡Bienvenido/a, ${found.name}!`);

      if (supabaseConnected.value && supabaseClient.value) {
        await fetchAllFromSupabase();
      }
    };

    const logout = async () => {
      if (sessionToken.value && supabaseConnected.value && supabaseClient.value) {
        try {
          await supabaseClient.value.rpc('app_logout', { p_token: sessionToken.value });
        } catch (e) {}
      }
      if (supabaseClient.value) {
        try {
          supabaseClient.value.removeAllChannels();
        } catch (e) {}
      }
      sessionToken.value = '';
      currentUser.value = null;
      tools.value = [];
      loans.value = [];
      maintenances.value = [];
      technicians.value = [];
      users.value = [];
      localStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(SESSION_KEY);
      activeTab.value = 'dashboard';
      notify('Has cerrado sesión correctamente', 'info');
    };

    const checkSavedSession = async () => {
      try {
        const storedSession = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
        if (storedSession) {
          const parsed = JSON.parse(storedSession);
          if (parsed && parsed.userId) {
            // Validar expiración de sesión
            if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
              logout();
              return;
            }

            sessionToken.value = parsed.token || '';
            currentCompanyId.value = parsed.companyId || 'main';

            currentUser.value = {
              id: parsed.userId,
              username: parsed.username,
              name: parsed.name || parsed.username,
              email: parsed.email || '',
              role: parsed.role || 'almacen',
              companyId: parsed.companyId || 'main'
            };

            applyClientHeaders();

            // Validar con la base de datos de forma asíncrona
            if (parsed.token && supabaseConnected.value && supabaseClient.value) {
              try {
                const { data, error } = await supabaseClient.value.rpc('validate_session', { p_token: parsed.token });
                if (!error && data && data.valid === true) {
                  currentUser.value = {
                    ...currentUser.value,
                    ...data.user,
                    companyId: data.user.company_id
                  };
                  currentCompanyId.value = data.user.company_id;
                  if (data.company) {
                    Object.assign(company, fromSupabaseCompany(data.company));
                  }
                  await fetchAllFromSupabase();
                } else if (data && data.valid === false) {
                  console.warn('Sesión de usuario revocada o vencida en el servidor.');
                  logout();
                }
              } catch (err) {
                console.warn('Error verificando sesión en Supabase:', err);
              }
            }
          }
        }
      } catch (e) {
        console.warn('Error validando sesión:', e);
      }
    };

    // GESTIÓN DE USUARIOS
    const showUserModal = ref(false);
    const isEditingUser = ref(false);
    const userSearch = ref('');
    const userRoleFilter = ref('');
    const userForm = reactive({
      id: '',
      name: '',
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'almacen',
      active: true
    });

    const filteredUsers = computed(() => {
      const q = userSearch.value.trim().toLowerCase();
      return users.value.filter(u => {
        const matchQ = !q || (
          (u.name && u.name.toLowerCase().includes(q)) ||
          (u.username && u.username.toLowerCase().includes(q)) ||
          (u.email && u.email.toLowerCase().includes(q))
        );
        const matchR = !userRoleFilter.value || u.role === userRoleFilter.value;
        return matchQ && matchR;
      });
    });

    const openNewUserModal = () => {
      if (!isAdmin.value) {
        notify('Solo los administradores pueden registrar nuevos usuarios', 'warning');
        return;
      }
      isEditingUser.value = false;
      Object.assign(userForm, {
        id: 'usr_' + Date.now(),
        name: '',
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'almacen',
        active: true
      });
      showUserModal.value = true;
    };

    const openEditUserModal = (user) => {
      if (!isAdmin.value && user.id !== currentUser.value?.id) {
        notify('Permisos insuficientes para editar este usuario', 'warning');
        return;
      }
      isEditingUser.value = true;
      Object.assign(userForm, {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        password: '',
        confirmPassword: '',
        role: user.role,
        active: user.active
      });
      showUserModal.value = true;
    };

    const saveUser = async () => {
      if (!isAdmin.value) {
        notify('Permiso denegado: solo administradores pueden gestionar usuarios', 'error');
        return;
      }
      if (!userForm.name.trim() || !userForm.username.trim()) {
        notify('El nombre y el nombre de usuario son obligatorios', 'warning');
        return;
      }

      const normalizedUsername = sanitizeInput(userForm.username.trim().toLowerCase());
      // Validar nombre de usuario único en esta empresa
      const existing = users.value.find(u => u.username.toLowerCase() === normalizedUsername && u.id !== userForm.id);
      if (existing) {
        notify('Ese nombre de usuario ya está registrado en tu empresa. Elige otro.', 'warning');
        return;
      }

      let targetUserObj = null;

      if (!isEditingUser.value) {
        // Nuevo usuario requiere clave
        if (!userForm.password || userForm.password.length < 4) {
          notify('La clave debe tener al menos 4 caracteres', 'warning');
          return;
        }
        if (userForm.password !== userForm.confirmPassword) {
          notify('Las claves de acceso no coinciden', 'warning');
          return;
        }
        const pHash = await hashPassword(userForm.password);
        targetUserObj = {
          id: userForm.id || ('usr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5)),
          companyId: currentCompanyId.value,
          name: sanitizeInput(userForm.name.trim()),
          username: normalizedUsername,
          email: sanitizeInput(userForm.email.trim()),
          passwordHash: pHash,
          role: userForm.role,
          active: userForm.active,
          createdAt: new Date().toISOString().split('T')[0]
        };
        users.value.push(targetUserObj);
        notify(`Usuario "${userForm.name}" creado con éxito`);
      } else {
        // Editando usuario
        const idx = users.value.findIndex(u => u.id === userForm.id);
        if (idx !== -1) {
          let updatedHash = users.value[idx].passwordHash;
          if (userForm.password) {
            if (userForm.password !== userForm.confirmPassword) {
              notify('Las nuevas claves no coinciden', 'warning');
              return;
            }
            updatedHash = await hashPassword(userForm.password);
          }

          users.value[idx] = {
            ...users.value[idx],
            companyId: currentCompanyId.value,
            name: sanitizeInput(userForm.name.trim()),
            username: normalizedUsername,
            email: sanitizeInput(userForm.email.trim()),
            role: userForm.role,
            active: userForm.active,
            ...(updatedHash ? { passwordHash: updatedHash } : {})
          };

          targetUserObj = users.value[idx];

          // Si el usuario editado es el actual en sesión, actualizar sesión
          if (currentUser.value && currentUser.value.id === userForm.id) {
            currentUser.value.name = sanitizeInput(userForm.name.trim());
            currentUser.value.username = normalizedUsername;
            currentUser.value.role = userForm.role;
          }

          notify(`Usuario "${userForm.name}" actualizado`);
        }
      }

      // Sincronizar en Supabase con scope de empresa
      if (supabaseConnected.value && supabaseClient.value && targetUserObj) {
        supabaseClient.value
          .from('users')
          .upsert([toSupabaseUser(targetUserObj)])
          .then(({ error }) => {
            if (error) console.error('Supabase saveUser error:', error);
          });
      }

      showUserModal.value = false;
    };

    const deleteUser = (user) => {
      if (!isAdmin.value) {
        notify('Permiso denegado: solo administradores pueden eliminar usuarios', 'error');
        return;
      }
      if (user.id === currentUser.value?.id) {
        notify('No puedes eliminar tu propia cuenta en uso', 'error');
        return;
      }
      if (user.username === 'admin') {
        notify('El usuario administrador maestro no puede ser eliminado', 'error');
        return;
      }
      if (confirm(`¿Estás seguro de eliminar permanentemente al usuario "${user.name}"?`)) {
        users.value = users.value.filter(u => u.id !== user.id);
        notify(`Usuario eliminado`);
        if (supabaseConnected.value && supabaseClient.value) {
          supabaseClient.value
            .from('users')
            .delete()
            .eq('id', user.id)
            .eq('company_id', currentCompanyId.value)
            .then(({ error }) => {
              if (error) console.error('Supabase deleteUser error:', error);
            });
        }
      }
    };

    const toggleUserStatus = (user) => {
      if (!isAdmin.value) {
        notify('Permiso denegado: solo administradores pueden cambiar estado de usuarios', 'error');
        return;
      }
      if (user.id === currentUser.value?.id) {
        notify('No puedes desactivar tu propia cuenta en sesión', 'warning');
        return;
      }
      if (user.username === 'admin' && user.active) {
        notify('El administrador principal no puede ser desactivado', 'error');
        return;
      }
      user.active = !user.active;
      notify(`Usuario "${user.name}" ${user.active ? 'activado' : 'desactivado'}`);
      if (supabaseConnected.value && supabaseClient.value) {
        supabaseClient.value
          .from('users')
          .upsert([toSupabaseUser(user)])
          .then(({ error }) => {
            if (error) console.error('Supabase toggleUserStatus error:', error);
          });
      }
    };

    const getRoleBadge = (role) => {
      switch (role) {
        case 'admin':
          return 'bg-purple-500/20 text-purple-300 border border-purple-500/40';
        case 'almacen':
          return 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40';
        case 'consulta':
          return 'bg-blue-500/20 text-blue-300 border border-blue-500/40';
        default:
          return 'bg-slate-700 text-slate-300';
      }
    };

    const getRoleLabel = (role) => {
      switch (role) {
        case 'admin': return 'Administrador';
        case 'almacen': return 'Almacenista / Operador';
        case 'consulta': return 'Consulta / Auditor';
        default: return role;
      }
    };

    // Filtros de herramientas
    const toolSearch = ref('');
    const toolCategoryFilter = ref('');
    const toolStatusFilter = ref('');
    const toolSortBy = ref('code');
    const toolViewMode = ref('cards');

    const categories = [
      'Herramienta Eléctrica',
      'Herramienta Manual',
      'Neumática',
      'Maquinaria Pesada',
      'Medición y Precisión',
      'Seguridad y Protección',
      'Soldadura',
      'Generadores y Motores',
      'Otros'
    ];

    // Cálculos de fechas robustos (admiten AAAA-MM-DD y DD/MM/AAAA)
    const isLoanOverdue = (expectedReturnDate, actualReturnDate) => {
      if (actualReturnDate) return false;
      if (!expectedReturnDate) return false;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const due = parseDateObj(expectedReturnDate);
      if (!due) return false;
      due.setHours(23, 59, 59, 999);
      return due < today;
    };

    const getDaysDifference = (targetDate) => {
      if (!targetDate) return 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const target = parseDateObj(targetDate);
      if (!target) return 0;
      target.setHours(0, 0, 0, 0);
      const diffTime = target - today;
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    // Propiedades Computadas de KPIs
    const totalToolsCount = computed(() => tools.value.length);
    const availableToolsCount = computed(() => tools.value.filter(t => t.status === 'disponible').length);
    const loanedToolsCount = computed(() => tools.value.filter(t => t.status === 'prestado').length);
    const inMaintenanceToolsCount = computed(() => tools.value.filter(t => t.status === 'mantenimiento').length);
    const damagedToolsCount = computed(() => tools.value.filter(t => t.status === 'danado' || t.status === 'baja').length);

    const activeLoans = computed(() => loans.value.filter(l => l.status === 'activo'));
    const completedLoans = computed(() => loans.value.filter(l => l.status === 'devuelto' || l.status === 'devuelto_con_danios'));

    const overdueLoans = computed(() => {
      return activeLoans.value.filter(l => isLoanOverdue(l.expectedReturnDate, l.actualReturnDate));
    });

    const pendingMaintenances = computed(() => {
      return maintenances.value.filter(m => m.status === 'programado' || m.status === 'en_proceso');
    });

    const completedMaintenances = computed(() => {
      return maintenances.value.filter(m => m.status === 'completado');
    });

    // Técnicos con estadísticas en vivo
    const techniciansWithStats = computed(() => {
      return technicians.value.map(tech => {
        const currentLoans = activeLoans.value.filter(l => l.technicianId === tech.id);
        const totalItemsInPossession = currentLoans.reduce((acc, l) => acc + (l.toolIds ? l.toolIds.length : 1), 0);
        const hasOverdue = currentLoans.some(l => isLoanOverdue(l.expectedReturnDate, l.actualReturnDate));
        return {
          ...tech,
          activeLoansCount: currentLoans.length,
          itemsCount: totalItemsInPossession,
          hasOverdue
        };
      });
    });

    // Filtro reactivo de Herramientas
    const filteredTools = computed(() => {
      const q = toolSearch.value.trim().toLowerCase();
      return tools.value.filter(t => {
        const matchesQuery = !q || (
          (t.name && t.name.toLowerCase().includes(q)) ||
          (t.code && t.code.toLowerCase().includes(q)) ||
          (t.brand && t.brand.toLowerCase().includes(q)) ||
          (t.model && t.model.toLowerCase().includes(q)) ||
          (t.serialNumber && t.serialNumber.toLowerCase().includes(q)) ||
          (t.location && t.location.toLowerCase().includes(q))
        );
        const matchesCategory = !toolCategoryFilter.value || t.category === toolCategoryFilter.value;
        const matchesStatus = !toolStatusFilter.value || t.status === toolStatusFilter.value;
        return matchesQuery && matchesCategory && matchesStatus;
      }).sort((a, b) => {
        if (toolSortBy.value === 'name') return a.name.localeCompare(b.name);
        if (toolSortBy.value === 'brand') return a.brand.localeCompare(b.brand);
        if (toolSortBy.value === 'status') return a.status.localeCompare(b.status);
        if (toolSortBy.value === 'cost') return (b.cost || 0) - (a.cost || 0);
        return a.code.localeCompare(b.code);
      });
    });

    // Filtros de préstamos
    const loanSearch = ref('');
    const loanTab = ref('activos');
    const filteredActiveLoans = computed(() => {
      const q = loanSearch.value.trim().toLowerCase();
      return activeLoans.value.filter(l => {
        return !q || (
          (l.voucherNumber && l.voucherNumber.toLowerCase().includes(q)) ||
          (l.technicianName && l.technicianName.toLowerCase().includes(q)) ||
          (l.project && l.project.toLowerCase().includes(q)) ||
          (l.toolSnapshot && l.toolSnapshot.some(t => t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q)))
        );
      });
    });

    const filteredCompletedLoans = computed(() => {
      const q = loanSearch.value.trim().toLowerCase();
      return completedLoans.value.filter(l => {
        return !q || (
          (l.voucherNumber && l.voucherNumber.toLowerCase().includes(q)) ||
          (l.technicianName && l.technicianName.toLowerCase().includes(q)) ||
          (l.project && l.project.toLowerCase().includes(q))
        );
      });
    });

    // =========================================================================
    // MÓDULO DE MANTENIMIENTO PERIÓDICO, ALERTAS, PRUEBAS Y CORRECTIVOS
    // =========================================================================
    const maintenanceTab = ref('pendientes'); // 'pendientes' | 'catalogo' | 'correctivos' | 'historial' | 'alertas'
    const maintSubTab = ref('pendientes'); // 'pendientes' | 'catalogo' | 'correctivos' | 'historial'
    const maintenanceSearch = ref('');
    const maintenanceAlertFilter = ref('all'); // 'all' | 'maint_overdue' | 'maint_upcoming' | 'test_overdue' | 'test_upcoming' | 'corrective'

    // Módulo Separado de Pruebas de Calentamiento
    const heatingSubTab = ref('pendientes'); // 'pendientes' | 'catalogo' | 'historial'
    const heatingSearch = ref('');

    // Helpers de periodicidades exactas solicitadas por el usuario
    const getMaintenancePeriodDays = (period) => {
      switch (period) {
        case 'mensual': return 30;
        case 'trimestral': return 90;
        case 'semestral': return 180;
        case 'anual': return 365;
        default: return 90;
      }
    };

    const getMaintenancePeriodLabel = (period) => {
      switch (period) {
        case 'mensual': return 'Mensual (30 días)';
        case 'trimestral': return 'Trimestral (90 días)';
        case 'semestral': return 'Semestral (180 días)';
        case 'anual': return 'Anual (365 días)';
        default: return 'Trimestral (90 días)';
      }
    };

    const getTestingPeriodDays = (period) => {
      switch (period) {
        case '15_dias': return 15;
        case '1_mes': return 30;
        case '3_meses': return 90;
        default: return 15;
      }
    };

    const getTestingPeriodLabel = (period) => {
      switch (period) {
        case '15_dias': return 'Cada 15 días';
        case '1_mes': return 'Cada 1 mes (30 días)';
        case '3_meses': return 'Cada 3 meses (90 días)';
        default: return 'Cada 15 días';
      }
    };

    // Análisis integral de estado de cada equipo (mantenimientos y pruebas)
    const toolsWithMaintenanceInfo = computed(() => {
      return tools.value.map(tool => {
        // Mantenimiento preventivo
        let effectiveNextMaint = tool.nextMaintenanceDate;
        const maintDays = tool.maintenancePeriodDays || getMaintenancePeriodDays(tool.maintenancePeriod || 'trimestral');
        if (!effectiveNextMaint && tool.requiresPeriodicMaintenance && (tool.lastMaintenanceDate || tool.acquisitionDate)) {
          effectiveNextMaint = addDaysToDate(tool.lastMaintenanceDate || tool.acquisitionDate, maintDays);
        }
        let daysToMaint = null;
        let maintStatus = 'none'; // 'none' | 'overdue' | 'urgent' | 'upcoming' | 'ok'
        if (tool.requiresPeriodicMaintenance && effectiveNextMaint) {
          daysToMaint = getDaysDifference(effectiveNextMaint);
          if (daysToMaint < 0) maintStatus = 'overdue';
          else if (daysToMaint <= 7) maintStatus = 'urgent';
          else if (daysToMaint <= 15) maintStatus = 'upcoming';
          else maintStatus = 'ok';
        }

        // Pruebas operativas y calentamiento periódico (arranque de plantas, generadores, motores)
        let effectiveNextTest = tool.nextTestingDate;
        const testDays = tool.testingPeriodDays || getTestingPeriodDays(tool.testingPeriod || '15_dias');
        if (!effectiveNextTest && tool.requiresPeriodicTesting && (tool.lastTestingDate || tool.acquisitionDate)) {
          effectiveNextTest = addDaysToDate(tool.lastTestingDate || tool.acquisitionDate, testDays);
        }
        let daysToTest = null;
        let testStatus = 'none'; // 'none' | 'overdue' | 'urgent' | 'ok'
        if (tool.requiresPeriodicTesting && effectiveNextTest) {
          daysToTest = getDaysDifference(effectiveNextTest);
          if (daysToTest < 0) testStatus = 'overdue';
          else if (daysToTest <= 3) testStatus = 'urgent';
          else testStatus = 'ok';
        }

        // Órdenes correctivas activas
        const activeCorrective = maintenances.value.find(m => m.toolId === tool.id && m.type === 'correctivo' && (m.status === 'programado' || m.status === 'en_proceso'));

        return {
          ...tool,
          effectiveNextMaint,
          daysToMaint,
          maintStatus,
          effectiveNextTest,
          daysToTest,
          testStatus,
          activeCorrective,
          hasAlerts: maintStatus === 'overdue' || maintStatus === 'urgent' || testStatus === 'overdue' || testStatus === 'urgent' || !!activeCorrective
        };
      });
    });

    const overdueMaintenances = computed(() => {
      return toolsWithMaintenanceInfo.value
        .filter(t => t.requiresPeriodicMaintenance && t.maintStatus === 'overdue')
        .sort((a, b) => (a.daysToMaint || 0) - (b.daysToMaint || 0));
    });

    const upcomingMaintenances = computed(() => {
      return toolsWithMaintenanceInfo.value
        .filter(t => t.requiresPeriodicMaintenance && (t.maintStatus === 'urgent' || t.maintStatus === 'upcoming'))
        .sort((a, b) => (a.daysToMaint || 0) - (b.daysToMaint || 0));
    });

    const overdueTests = computed(() => {
      return toolsWithMaintenanceInfo.value
        .filter(t => t.requiresPeriodicTesting && t.testStatus === 'overdue')
        .sort((a, b) => (a.daysToTest || 0) - (b.daysToTest || 0));
    });

    const upcomingTests = computed(() => {
      return toolsWithMaintenanceInfo.value
        .filter(t => t.requiresPeriodicTesting && t.testStatus === 'urgent')
        .sort((a, b) => (a.daysToTest || 0) - (b.daysToTest || 0));
    });

    const activeCorrectives = computed(() => {
      return maintenances.value
        .filter(m => m.type === 'correctivo' && (m.status === 'programado' || m.status === 'en_proceso'))
        .sort((a, b) => {
          const prioOrder = { urgente: 1, alta: 2, media: 3, baja: 4 };
          return (prioOrder[a.priority] || 3) - (prioOrder[b.priority] || 3);
        });
    });

    // Listas y Contadores Separados para Mantenimiento y Calentamiento
    const allPreventiveTools = computed(() => {
      return toolsWithMaintenanceInfo.value.filter(t => t.requiresPeriodicMaintenance);
    });

    const pendingMaintenanceTools = computed(() => {
      return toolsWithMaintenanceInfo.value
        .filter(t => t.requiresPeriodicMaintenance && (t.maintStatus === 'overdue' || t.maintStatus === 'urgent'))
        .sort((a, b) => (a.daysToMaint || 0) - (b.daysToMaint || 0));
    });

    const pendingMaintenanceAlertsCount = computed(() => {
      return overdueMaintenances.value.length + activeCorrectives.value.length;
    });

    const allHeatingTools = computed(() => {
      return toolsWithMaintenanceInfo.value.filter(t => t.requiresPeriodicTesting);
    });

    const pendingHeatingTools = computed(() => {
      return toolsWithMaintenanceInfo.value
        .filter(t => t.requiresPeriodicTesting && (t.testStatus === 'overdue' || t.testStatus === 'urgent'))
        .sort((a, b) => (a.daysToTest || 0) - (b.daysToTest || 0));
    });

    const pendingHeatingAlertsCount = computed(() => {
      return overdueTests.value.length;
    });

    const heatingHistory = computed(() => {
      const q = heatingSearch.value.trim().toLowerCase();
      return maintenances.value.filter(m => {
        const isHeatOrTest = m.type === 'calentamiento' || m.type === 'prueba';
        if (!isHeatOrTest) return false;
        return !q || (
          (m.toolCode && m.toolCode.toLowerCase().includes(q)) ||
          (m.toolName && m.toolName.toLowerCase().includes(q)) ||
          (m.description && m.description.toLowerCase().includes(q)) ||
          (m.workDone && m.workDone.toLowerCase().includes(q)) ||
          (m.responsible && m.responsible.toLowerCase().includes(q))
        );
      });
    });

    const filteredHeatingTools = computed(() => {
      const q = heatingSearch.value.trim().toLowerCase();
      return allHeatingTools.value.filter(t => {
        return !q || (
          t.code.toLowerCase().includes(q) ||
          t.name.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          t.brand.toLowerCase().includes(q)
        );
      });
    });

    const totalMaintenanceAlerts = computed(() => {
      return overdueMaintenances.value.length +
             overdueTests.value.length +
             upcomingMaintenances.value.length +
             activeCorrectives.value.length;
    });

    // Lista consolidada de todas las alertas activas con tipología clara
    const activeAlertsList = computed(() => {
      const list = [];

      // 1. Mantenimientos vencidos (críticos)
      overdueMaintenances.value.forEach(t => {
        list.push({
          id: 'alert_maint_overdue_' + t.id,
          type: 'maint_overdue',
          severity: 'danger',
          badgeText: 'Mantenimiento Vencido',
          title: `${t.code} - ${t.name}`,
          category: t.category,
          tool: t,
          daysText: `Vencido hace ${Math.abs(t.daysToMaint)} día(s)`,
          dueDate: t.effectiveNextMaint,
          periodText: `Cada ${t.maintenancePeriodDays} días`,
          actionType: 'schedule_maint',
          actionText: 'Realizar Mantenimiento'
        });
      });

      // 2. Pruebas operativas vencidas (críticas)
      overdueTests.value.forEach(t => {
        list.push({
          id: 'alert_test_overdue_' + t.id,
          type: 'test_overdue',
          severity: 'danger',
          badgeText: 'Prueba Operativa Vencida',
          title: `${t.code} - ${t.name}`,
          category: t.category,
          tool: t,
          daysText: `Prueba pendiente hace ${Math.abs(t.daysToTest)} día(s)`,
          dueDate: t.effectiveNextTest,
          periodText: `Cada ${t.testingPeriodDays} días`,
          actionType: 'run_test',
          actionText: 'Hacer Prueba Ahora'
        });
      });

      // 3. Mantenimientos correctivos activos (averías reportadas)
      activeCorrectives.value.forEach(m => {
        list.push({
          id: 'alert_corrective_' + m.id,
          type: 'corrective',
          severity: m.priority === 'urgente' ? 'danger' : 'warning',
          badgeText: m.priority === 'urgente' ? 'Avería Crítica / Urgente' : 'Avería / Correctivo en Taller',
          title: `${m.toolCode} - ${m.toolName}`,
          category: 'Mantenimiento Correctivo',
          maintenance: m,
          tool: tools.value.find(t => t.id === m.toolId),
          daysText: m.estimatedCost ? `Costo estimado: $${m.estimatedCost.toLocaleString()}` : 'En proceso de cotización',
          dueDate: m.scheduledDate,
          periodText: m.provider || 'Taller Autorizado',
          actionType: 'complete_maint',
          actionText: 'Finalizar Reparación'
        });
      });

      // 4. Mantenimientos próximos (preventivos en los próximos 15 días)
      upcomingMaintenances.value.forEach(t => {
        list.push({
          id: 'alert_maint_upcoming_' + t.id,
          type: 'maint_upcoming',
          severity: 'warning',
          badgeText: 'Mantenimiento Próximo',
          title: `${t.code} - ${t.name}`,
          category: t.category,
          tool: t,
          daysText: t.daysToMaint === 0 ? 'Vence HOY' : `Vence en ${t.daysToMaint} día(s)`,
          dueDate: t.effectiveNextMaint,
          periodText: `Cada ${t.maintenancePeriodDays} días`,
          actionType: 'schedule_maint',
          actionText: 'Programar Servicio'
        });
      });

      // 5. Pruebas operativas próximas
      upcomingTests.value.forEach(t => {
        list.push({
          id: 'alert_test_upcoming_' + t.id,
          type: 'test_upcoming',
          severity: 'info',
          badgeText: 'Prueba Próxima',
          title: `${t.code} - ${t.name}`,
          category: t.category,
          tool: t,
          daysText: t.daysToTest === 0 ? 'Prueba HOY' : `Prueba en ${t.daysToTest} día(s)`,
          dueDate: t.effectiveNextTest,
          periodText: `Cada ${t.testingPeriodDays} días`,
          actionType: 'run_test',
          actionText: 'Registrar Prueba'
        });
      });

      // Filtrado por buscador y tipo de alerta
      const q = maintenanceSearch.value.trim().toLowerCase();
      return list.filter(item => {
        const matchesQ = !q || (
          item.title.toLowerCase().includes(q) ||
          item.badgeText.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q)
        );
        const matchesFilter = maintenanceAlertFilter.value === 'all' || item.type === maintenanceAlertFilter.value;
        return matchesQ && matchesFilter;
      });
    });

    // Filtros de herramientas periódicas
    const filteredPeriodicTools = computed(() => {
      const q = maintenanceSearch.value.trim().toLowerCase();
      return toolsWithMaintenanceInfo.value.filter(t => {
        const isPeriodic = t.requiresPeriodicMaintenance || t.requiresPeriodicTesting;
        if (!isPeriodic) return false;
        return !q || (
          t.code.toLowerCase().includes(q) ||
          t.name.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          t.brand.toLowerCase().includes(q)
        );
      });
    });

    // Filtros de correctivos
    const filteredCorrectiveMaintenances = computed(() => {
      const q = maintenanceSearch.value.trim().toLowerCase();
      return activeCorrectives.value.filter(m => {
        return !q || (
          (m.code && m.code.toLowerCase().includes(q)) ||
          (m.toolName && m.toolName.toLowerCase().includes(q)) ||
          (m.toolCode && m.toolCode.toLowerCase().includes(q)) ||
          (m.failureDescription && m.failureDescription.toLowerCase().includes(q)) ||
          (m.workToDo && m.workToDo.toLowerCase().includes(q)) ||
          (m.provider && m.provider.toLowerCase().includes(q))
        );
      });
    });

    // Filtros de mantenimientos pendientes tradicionales
    const filteredPendingMaintenances = computed(() => {
      const q = maintenanceSearch.value.trim().toLowerCase();
      return pendingMaintenances.value.filter(m => {
        return !q || (
          (m.code && m.code.toLowerCase().includes(q)) ||
          (m.toolName && m.toolName.toLowerCase().includes(q)) ||
          (m.toolCode && m.toolCode.toLowerCase().includes(q)) ||
          (m.provider && m.provider.toLowerCase().includes(q)) ||
          (m.responsible && m.responsible.toLowerCase().includes(q))
        );
      });
    });

    // Filtros de completados
    const filteredCompletedMaintenances = computed(() => {
      const q = maintenanceSearch.value.trim().toLowerCase();
      return completedMaintenances.value.filter(m => {
        return !q || (
          (m.code && m.code.toLowerCase().includes(q)) ||
          (m.toolName && m.toolName.toLowerCase().includes(q)) ||
          (m.toolCode && m.toolCode.toLowerCase().includes(q)) ||
          (m.provider && m.provider.toLowerCase().includes(q)) ||
          (m.workDone && m.workDone.toLowerCase().includes(q))
        );
      });
    });

    // GESTIÓN DE MODALES
    // 1. Modal Herramienta (Crear / Editar)
    const showToolModal = ref(false);
    const isEditingTool = ref(false);
    const toolForm = reactive({
      id: '',
      code: '',
      name: '',
      category: 'Herramienta Eléctrica',
      brand: '',
      model: '',
      serialNumber: '',
      status: 'disponible',
      location: '',
      acquisitionDate: new Date().toISOString().split('T')[0],
      cost: 0,
      notes: '',
      // Mantenimiento preventivo periódico
      requiresPeriodicMaintenance: false,
      maintenancePeriod: 'trimestral', // 'mensual' | 'trimestral' | 'semestral' | 'anual'
      maintenancePeriodDays: 90,
      lastMaintenanceDate: '',
      nextMaintenanceDate: '',
      // Pruebas y calentamiento periódico (plantas, generadores, motores)
      requiresPeriodicTesting: false,
      testingPeriod: '15_dias', // '15_dias' | '1_mes' | '3_meses'
      testingPeriodDays: 15,
      lastTestingDate: '',
      nextTestingDate: ''
    });

    const setMaintenancePeriod = (period) => {
      toolForm.maintenancePeriod = period;
      toolForm.maintenancePeriodDays = getMaintenancePeriodDays(period);
      updateToolCalculatedDates();
    };

    const setTestingPeriod = (period) => {
      toolForm.testingPeriod = period;
      toolForm.testingPeriodDays = getTestingPeriodDays(period);
      updateToolCalculatedDates();
    };

    const updateToolCalculatedDates = () => {
      if (toolForm.requiresPeriodicMaintenance) {
        if (!toolForm.maintenancePeriod) toolForm.maintenancePeriod = 'trimestral';
        toolForm.maintenancePeriodDays = getMaintenancePeriodDays(toolForm.maintenancePeriod);
        if (toolForm.lastMaintenanceDate) {
          toolForm.nextMaintenanceDate = addDaysToDate(toolForm.lastMaintenanceDate, toolForm.maintenancePeriodDays);
        }
      }
      if (toolForm.requiresPeriodicTesting) {
        if (!toolForm.testingPeriod) toolForm.testingPeriod = '15_dias';
        toolForm.testingPeriodDays = getTestingPeriodDays(toolForm.testingPeriod);
        if (toolForm.lastTestingDate) {
          toolForm.nextTestingDate = addDaysToDate(toolForm.lastTestingDate, toolForm.testingPeriodDays);
        }
      }
    };

    const openNewToolModal = () => {
      if (isConsulta.value) {
        notify('Tu rol es de solo lectura. No puedes registrar herramientas.', 'warning');
        return;
      }
      isEditingTool.value = false;
      const nextNum = tools.value.length + 1;
      const codePrefix = 'EQP-';
      Object.assign(toolForm, {
        id: 'tool_' + Date.now(),
        code: codePrefix + String(nextNum).padStart(3, '0'),
        name: '',
        category: 'Herramienta Eléctrica',
        brand: '',
        model: '',
        serialNumber: '',
        status: 'disponible',
        location: 'Almacén Central',
        acquisitionDate: new Date().toISOString().split('T')[0],
        cost: 0,
        notes: '',
        requiresPeriodicMaintenance: false,
        maintenancePeriod: 'trimestral',
        maintenancePeriodDays: 90,
        lastMaintenanceDate: '',
        nextMaintenanceDate: '',
        requiresPeriodicTesting: false,
        testingPeriod: '15_dias',
        testingPeriodDays: 15,
        lastTestingDate: '',
        nextTestingDate: ''
      });
      showToolModal.value = true;
    };

    const openEditToolModal = (tool) => {
      if (isConsulta.value) {
        notify('Tu rol es de solo lectura. No puedes editar equipos.', 'warning');
        return;
      }
      isEditingTool.value = true;
      const maintP = tool.maintenancePeriod || (tool.maintenancePeriodDays === 30 ? 'mensual' : tool.maintenancePeriodDays === 180 ? 'semestral' : tool.maintenancePeriodDays === 365 ? 'anual' : 'trimestral');
      const testP = tool.testingPeriod || (tool.testingPeriodDays === 30 ? '1_mes' : tool.testingPeriodDays === 90 ? '3_meses' : '15_dias');
      Object.assign(toolForm, {
        requiresPeriodicMaintenance: false,
        maintenancePeriod: maintP,
        maintenancePeriodDays: tool.maintenancePeriodDays || getMaintenancePeriodDays(maintP),
        lastMaintenanceDate: '',
        nextMaintenanceDate: '',
        requiresPeriodicTesting: false,
        testingPeriod: testP,
        testingPeriodDays: tool.testingPeriodDays || getTestingPeriodDays(testP),
        lastTestingDate: '',
        nextTestingDate: '',
        ...JSON.parse(JSON.stringify(tool))
      });
      showToolModal.value = true;
    };

    // =========================================================================
    // ACCIONES RÁPIDAS "REALIZAR": CUADRO SENCILLO PARA HOJA DE VIDA
    // =========================================================================
    // 1. Modal Cuadro Sencillo: Realizar Mantenimiento Preventivo
    const showPerformMaintenanceModal = ref(false);
    const performMaintForm = reactive({
      tool: null,
      date: '',
      description: '',
      responsible: '',
      cost: 0,
      calculatedNextDate: ''
    });

    const openPerformMaintenance = (tool) => {
      if (isConsulta.value) {
        notify('Tu rol es de solo lectura. No puedes registrar mantenimientos.', 'warning');
        return;
      }
      const today = new Date().toISOString().split('T')[0];
      const period = tool.maintenancePeriod || 'trimestral';
      const days = tool.maintenancePeriodDays || getMaintenancePeriodDays(period);
      const nextDate = addDaysToDate(today, days);

      performMaintForm.tool = tool;
      performMaintForm.date = today;
      performMaintForm.description = '';
      performMaintForm.responsible = currentUser.value?.name || company.manager;
      performMaintForm.cost = 0;
      performMaintForm.calculatedNextDate = nextDate;
      showPerformMaintenanceModal.value = true;
    };

    const updatePerformMaintNextDate = () => {
      if (!performMaintForm.tool || !performMaintForm.date) return;
      const period = performMaintForm.tool.maintenancePeriod || 'trimestral';
      const days = performMaintForm.tool.maintenancePeriodDays || getMaintenancePeriodDays(period);
      performMaintForm.calculatedNextDate = addDaysToDate(performMaintForm.date, days);
    };

    const savePerformMaintenance = () => {
      if (isConsulta.value) {
        notify('Permiso denegado: tu rol es de solo lectura', 'error');
        return;
      }
      if (!performMaintForm.tool) return;
      if (!performMaintForm.description.trim()) {
        notify('Por favor describe brevemente cómo encontró o cómo funcionó el equipo', 'warning');
        return;
      }
      if (!performMaintForm.date) {
        notify('Selecciona la fecha en la que se realizó el mantenimiento', 'warning');
        return;
      }

      const tool = tools.value.find(t => t.id === performMaintForm.tool.id);
      if (!tool) return;

      const period = tool.maintenancePeriod || 'trimestral';
      const days = tool.maintenancePeriodDays || getMaintenancePeriodDays(period);
      const nextDate = addDaysToDate(performMaintForm.date, days);

      tool.lastMaintenanceDate = performMaintForm.date;
      tool.nextMaintenanceDate = nextDate;
      if (tool.status === 'mantenimiento') {
        tool.status = 'disponible';
      }

      const maintCode = 'MNT-' + new Date().getFullYear() + '-' + String(maintenances.value.length + 1).padStart(3, '0');
      const maintRecord = {
        id: 'maint_' + Date.now(),
        code: maintCode,
        toolId: tool.id,
        toolCode: tool.code,
        toolName: tool.name,
        type: 'preventivo',
        status: 'completado',
        priority: 'media',
        scheduledDate: performMaintForm.date,
        completedDate: performMaintForm.date,
        provider: 'Mantenimiento Preventivo (' + getMaintenancePeriodLabel(tool.maintenancePeriod) + ')',
        responsible: performMaintForm.responsible || currentUser.value?.name || company.manager,
        cost: Number(performMaintForm.cost) || 0,
        estimatedCost: 0,
        description: `Mantenimiento Preventivo Periódico (${getMaintenancePeriodLabel(tool.maintenancePeriod)}). Diagnóstico / Estado: ${performMaintForm.description.trim()}`,
        workDone: performMaintForm.description.trim(),
        partsReplaced: '',
        nextMaintenanceDate: nextDate,
        createdAt: Date.now()
      };

      maintenances.value.unshift(maintRecord);
      showPerformMaintenanceModal.value = false;
      saveToStorage();
      notify(`Mantenimiento registrado y guardado en Hoja de Vida de ${tool.code}. Próximo: ${formatDate(nextDate)}`, 'success');

      if (supabaseConnected.value && supabaseClient.value) {
        supabaseClient.value.from('maintenances').upsert([toSupabaseMaint(maintRecord)]).then(({ error }) => {
          if (error) console.error('Supabase savePerformMaintenance error:', error);
        });
        supabaseClient.value.from('tools').upsert([toSupabaseTool(tool)]).then(({ error }) => {
          if (error) console.error('Supabase tool update error:', error);
        });
      }
    };

    // 2. Modal Cuadro Sencillo: Realizar Prueba y Calentamiento Periódico
    const showPerformHeatingModal = ref(false);
    const performHeatingForm = reactive({
      tool: null,
      date: '',
      description: '',
      responsible: '',
      result: 'satisfactorio', // 'satisfactorio' | 'con_novedad'
      calculatedNextDate: ''
    });

    const openPerformHeating = (tool) => {
      if (isConsulta.value) {
        notify('Tu rol es de solo lectura. No puedes registrar pruebas.', 'warning');
        return;
      }
      const today = new Date().toISOString().split('T')[0];
      const period = tool.testingPeriod || '15_dias';
      const days = tool.testingPeriodDays || getTestingPeriodDays(period);
      const nextDate = addDaysToDate(today, days);

      performHeatingForm.tool = tool;
      performHeatingForm.date = today;
      performHeatingForm.description = '';
      performHeatingForm.responsible = currentUser.value?.name || company.manager;
      performHeatingForm.result = 'satisfactorio';
      performHeatingForm.calculatedNextDate = nextDate;
      showPerformHeatingModal.value = true;
    };

    const updatePerformHeatingNextDate = () => {
      if (!performHeatingForm.tool || !performHeatingForm.date) return;
      const period = performHeatingForm.tool.testingPeriod || '15_dias';
      const days = performHeatingForm.tool.testingPeriodDays || getTestingPeriodDays(period);
      performHeatingForm.calculatedNextDate = addDaysToDate(performHeatingForm.date, days);
    };

    const savePerformHeating = () => {
      if (isConsulta.value) {
        notify('Permiso denegado: tu rol es de solo lectura', 'error');
        return;
      }
      if (!performHeatingForm.tool) return;
      if (!performHeatingForm.description.trim()) {
        notify('Por favor describe brevemente cómo encontró o cómo funcionó el equipo', 'warning');
        return;
      }
      if (!performHeatingForm.date) {
        notify('Selecciona la fecha de la prueba de calentamiento', 'warning');
        return;
      }

      const tool = tools.value.find(t => t.id === performHeatingForm.tool.id);
      if (!tool) return;

      const period = tool.testingPeriod || '15_dias';
      const days = tool.testingPeriodDays || getTestingPeriodDays(period);
      const nextDate = addDaysToDate(performHeatingForm.date, days);

      tool.lastTestingDate = performHeatingForm.date;
      tool.nextTestingDate = nextDate;

      const isSuccess = performHeatingForm.result === 'satisfactorio';
      if (!isSuccess) {
        tool.status = 'mantenimiento';
      }

      const heatCode = 'CAL-' + new Date().getFullYear() + '-' + String(maintenances.value.length + 1).padStart(3, '0');
      const testRecord = {
        id: 'heat_' + Date.now(),
        code: heatCode,
        toolId: tool.id,
        toolCode: tool.code,
        toolName: tool.name,
        type: 'calentamiento',
        status: 'completado',
        priority: isSuccess ? 'media' : 'alta',
        scheduledDate: performHeatingForm.date,
        completedDate: performHeatingForm.date,
        provider: 'Prueba y Calentamiento Periódico (' + getTestingPeriodLabel(tool.testingPeriod) + ')',
        responsible: performHeatingForm.responsible || currentUser.value?.name || company.manager,
        cost: 0,
        estimatedCost: 0,
        description: `Prueba y Calentamiento Periódico (${getTestingPeriodLabel(tool.testingPeriod)}) - ${isSuccess ? 'SATISFACTORIO' : 'CON NOVEDAD'}: ${performHeatingForm.description.trim()}`,
        workDone: performHeatingForm.description.trim(),
        partsReplaced: '',
        testingResult: isSuccess ? 'satisfactorio' : 'con_novedad',
        nextMaintenanceDate: nextDate,
        createdAt: Date.now()
      };

      maintenances.value.unshift(testRecord);
      showPerformHeatingModal.value = false;
      saveToStorage();

      if (isSuccess) {
        notify(`Prueba de calentamiento registrada y guardada en Hoja de Vida de ${tool.code}. Próxima prueba: ${formatDate(nextDate)}`, 'success');
      } else {
        notify(`Prueba registrada con NOVEDAD para ${tool.code}. Equipo marcado en Mantenimiento.`, 'warning');
      }

      if (supabaseConnected.value && supabaseClient.value) {
        supabaseClient.value.from('maintenances').upsert([toSupabaseMaint(testRecord)]).then(({ error }) => {
          if (error) console.error('Supabase savePerformHeating error:', error);
        });
        supabaseClient.value.from('tools').upsert([toSupabaseTool(tool)]).then(({ error }) => {
          if (error) console.error('Supabase tool update error:', error);
        });
      }
    };

    const saveTool = () => {
      if (isConsulta.value) {
        notify('Permiso denegado: tu rol es de solo lectura', 'error');
        return;
      }
      if (!toolForm.name || !toolForm.code) {
        notify('Por favor completa el código y el nombre de la herramienta', 'warning');
        return;
      }
      if (isEditingTool.value) {
        const index = tools.value.findIndex(t => t.id === toolForm.id);
        if (index !== -1) {
          tools.value[index] = { ...toolForm };
          notify(`Herramienta ${toolForm.code} actualizada correctamente`);
          saveToStorage();
          if (supabaseConnected.value && supabaseClient.value) {
            supabaseClient.value.from('tools').upsert([toSupabaseTool(tools.value[index])]).then(({ error }) => {
              if (error) console.error('Supabase saveTool error:', error);
            });
          }
        }
      } else {
        const newTool = {
          ...toolForm,
          id: toolForm.id || ('tool_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6)),
          createdAt: Date.now()
        };
        tools.value.unshift(newTool);
        notify(`Equipo ${toolForm.code} registrado con éxito`);
        saveToStorage();
        if (supabaseConnected.value && supabaseClient.value) {
          supabaseClient.value.from('tools').upsert([toSupabaseTool(newTool)]).then(({ error }) => {
            if (error) console.error('Supabase saveTool error:', error);
          });
        }
      }
      showToolModal.value = false;
    };

    // Modal Detalle de Herramienta e Historial
    const showToolDetailModal = ref(false);
    const selectedToolForDetail = ref(null);
    const toolHistoryLoans = computed(() => {
      if (!selectedToolForDetail.value) return [];
      return loans.value.filter(l => l.toolIds && l.toolIds.includes(selectedToolForDetail.value.id));
    });
    const toolHistoryMaintenances = computed(() => {
      if (!selectedToolForDetail.value) return [];
      return maintenances.value.filter(m => m.toolId === selectedToolForDetail.value.id);
    });

    const openToolDetail = (tool) => {
      selectedToolForDetail.value = tool;
      showToolDetailModal.value = true;
    };

    // 2. Modal Nueva Entrega / Préstamo (Check-out)
    const showLoanModal = ref(false);
    const loanForm = reactive({
      technicianId: '',
      selectedToolIds: [],
      expectedReturnDate: '',
      project: '',
      deliveryCondition: 'Excelente',
      deliveryNotes: ''
    });

    const availableToolsForLoan = computed(() => {
      return tools.value.filter(t => t.status === 'disponible');
    });

    const openNewLoanModal = (preselectedTool = null) => {
      if (isConsulta.value) {
        notify('Tu rol es de solo lectura. No puedes despachar herramientas.', 'warning');
        return;
      }
      if (technicians.value.length === 0) {
        notify('Primero debes registrar al menos un técnico', 'warning');
        activeTab.value = 'technicians';
        return;
      }
      if (availableToolsForLoan.value.length === 0 && !preselectedTool) {
        notify('No hay herramientas o maquinaria en estado disponible actualmente', 'warning');
        return;
      }

      const returnDate = new Date();
      returnDate.setDate(returnDate.getDate() + 3);

      loanForm.technicianId = technicians.value[0]?.id || '';
      loanForm.selectedToolIds = preselectedTool ? [preselectedTool.id] : [];
      loanForm.expectedReturnDate = returnDate.toISOString().split('T')[0];
      loanForm.project = '';
      loanForm.deliveryCondition = 'Excelente';
      loanForm.deliveryNotes = '';
      showLoanModal.value = true;
    };

    const toggleToolSelection = (toolId) => {
      const index = loanForm.selectedToolIds.indexOf(toolId);
      if (index > -1) {
        loanForm.selectedToolIds.splice(index, 1);
      } else {
        loanForm.selectedToolIds.push(toolId);
      }
    };

    const saveLoan = () => {
      if (isConsulta.value) {
        notify('Permiso denegado: tu rol es de solo lectura', 'error');
        return;
      }
      if (!loanForm.technicianId) {
        notify('Selecciona el técnico responsable', 'warning');
        return;
      }
      if (loanForm.selectedToolIds.length === 0) {
        notify('Debes seleccionar al menos una herramienta o maquinaria', 'warning');
        return;
      }
      if (!loanForm.expectedReturnDate) {
        notify('Ingresa la fecha prevista de devolución', 'warning');
        return;
      }

      const tech = technicians.value.find(t => t.id === loanForm.technicianId);
      const selectedTools = tools.value.filter(t => loanForm.selectedToolIds.includes(t.id));

      const now = new Date();
      const dateFormatted = formatDateTime(now);
      const voucherNum = 'VAL-' + now.getFullYear() + '-' + String(loans.value.length + 1).padStart(3, '0');

      const newLoan = {
        id: 'loan_' + Date.now(),
        voucherNumber: voucherNum,
        technicianId: tech.id,
        technicianName: tech.name,
        technicianDni: tech.dni,
        toolIds: [...loanForm.selectedToolIds],
        toolSnapshot: selectedTools.map(t => ({
          id: t.id,
          code: t.code,
          name: t.name,
          serialNumber: t.serialNumber,
          category: t.category
        })),
        loanDate: dateFormatted,
        expectedReturnDate: loanForm.expectedReturnDate,
        actualReturnDate: null,
        status: 'activo',
        project: loanForm.project || 'General / Mantenimiento',
        deliveryCondition: loanForm.deliveryCondition,
        returnCondition: null,
        deliveryNotes: loanForm.deliveryNotes,
        returnNotes: '',
        dispatcher: currentUser.value?.name || company.manager,
        createdAt: Date.now()
      };

      selectedTools.forEach(t => {
        t.status = 'prestado';
      });

      loans.value.unshift(newLoan);
      showLoanModal.value = false;
      saveToStorage();
      notify(`Préstamo registrado exitosamente con Vale ${voucherNum}`);
      openPrintVoucher(newLoan);

      if (supabaseConnected.value && supabaseClient.value) {
        supabaseClient.value.from('loans').upsert([toSupabaseLoan(newLoan)]).then(({ error }) => {
          if (error) console.error('Supabase saveLoan error:', error);
        });
        const affectedTools = tools.value.filter(t => loanForm.selectedToolIds.includes(t.id)).map(toSupabaseTool);
        if (affectedTools.length > 0) {
          supabaseClient.value.from('tools').upsert(affectedTools).then(({ error }) => {
            if (error) console.error('Supabase loan tools sync error:', error);
          });
        }
      }
    };

    // 3. Modal Devolución (Check-in)
    const showReturnModal = ref(false);
    const returnForm = reactive({
      loan: null,
      returnDate: '',
      returnCondition: 'Buena',
      returnNotes: '',
      sendToMaintenance: false,
      maintenanceNotes: ''
    });

    const openReturnModal = (loan) => {
      if (isConsulta.value) {
        notify('Tu rol es de solo lectura. No puedes registrar devoluciones.', 'warning');
        return;
      }
      const now = new Date();
      returnForm.loan = loan;
      returnForm.returnDate = formatDateTime(now);
      returnForm.returnCondition = 'Buena';
      returnForm.returnNotes = '';
      returnForm.sendToMaintenance = false;
      returnForm.maintenanceNotes = '';
      showReturnModal.value = true;
    };

    const processReturn = () => {
      if (isConsulta.value) {
        notify('Permiso denegado: tu rol es de solo lectura', 'error');
        return;
      }
      const loan = returnForm.loan;
      if (!loan) return;

      loan.actualReturnDate = returnForm.returnDate;
      loan.returnCondition = returnForm.returnCondition;
      loan.returnNotes = returnForm.returnNotes;
      loan.receiver = currentUser.value?.name || company.manager;
      loan.status = (returnForm.returnCondition.toLowerCase().includes('dañad') || returnForm.sendToMaintenance)
        ? 'devuelto_con_danios'
        : 'devuelto';

      loan.toolIds.forEach(tId => {
        const tool = tools.value.find(t => t.id === tId);
        if (tool) {
          if (returnForm.sendToMaintenance) {
            tool.status = 'mantenimiento';
            const maintCode = 'MNT-' + new Date().getFullYear() + '-' + String(maintenances.value.length + 1).padStart(3, '0');
            maintenances.value.unshift({
              id: 'maint_' + Date.now() + '_' + tool.id,
              code: maintCode,
              toolId: tool.id,
              toolCode: tool.code,
              toolName: tool.name,
              type: 'correctivo',
              status: 'en_proceso',
              scheduledDate: new Date().toISOString().split('T')[0],
              completedDate: null,
              provider: 'Taller Interno / Por asignar',
              responsible: currentUser.value?.name || company.manager,
              cost: 0,
              description: `Reportado con daños durante la devolución del vale ${loan.voucherNumber}. Notas: ${returnForm.maintenanceNotes || returnForm.returnNotes || 'Revisión técnica requerida.'}`,
              workDone: '',
              partsReplaced: '',
              nextMaintenanceDate: '',
              createdAt: Date.now()
            });
          } else {
            tool.status = 'disponible';
          }
        }
      });

      showReturnModal.value = false;
      saveToStorage();
      notify(`Devolución de ${loan.voucherNumber} registrada con éxito`);

      if (supabaseConnected.value && supabaseClient.value) {
        supabaseClient.value.from('loans').upsert([toSupabaseLoan(loan)]).then(({ error }) => {
          if (error) console.error('Supabase return loan error:', error);
        });
        const affectedTools = tools.value.filter(t => loan.toolIds.includes(t.id)).map(toSupabaseTool);
        if (affectedTools.length > 0) {
          supabaseClient.value.from('tools').upsert(affectedTools).then(({ error }) => {
            if (error) console.error('Supabase return tools error:', error);
          });
        }
        if (returnForm.sendToMaintenance && maintenances.value.length > 0) {
          const newMaints = maintenances.value.filter(m => m.description && m.description.includes(loan.voucherNumber)).map(toSupabaseMaint);
          if (newMaints.length > 0) {
            supabaseClient.value.from('maintenances').upsert(newMaints).then(({ error }) => {
              if (error) console.error('Supabase return maint error:', error);
            });
          }
        }
      }
    };

    // 4. Modal Mantenimientos
    const showMaintenanceModal = ref(false);
    const isEditingMaint = ref(false);
    const maintForm = reactive({
      id: '',
      code: '',
      toolId: '',
      type: 'preventivo',
      status: 'programado',
      scheduledDate: new Date().toISOString().split('T')[0],
      provider: '',
      responsible: '',
      cost: 0,
      description: '',
      nextMaintenanceDate: ''
    });

    const openNewMaintenanceModal = (preselectedTool = null) => {
      if (isConsulta.value) {
        notify('Tu rol es de solo lectura. No puedes programar mantenimientos.', 'warning');
        return;
      }
      isEditingMaint.value = false;
      const nextNum = maintenances.value.length + 1;
      const maintCode = 'MNT-' + new Date().getFullYear() + '-' + String(nextNum).padStart(3, '0');
      
      Object.assign(maintForm, {
        id: 'maint_' + Date.now(),
        code: maintCode,
        toolId: preselectedTool ? preselectedTool.id : (tools.value[0]?.id || ''),
        type: 'preventivo',
        status: 'en_proceso',
        scheduledDate: new Date().toISOString().split('T')[0],
        provider: 'Taller de Servicio Autorizado',
        responsible: currentUser.value?.name || company.manager,
        cost: 0,
        description: '',
        nextMaintenanceDate: ''
      });
      showMaintenanceModal.value = true;
    };

    const saveMaintenance = () => {
      if (isConsulta.value) {
        notify('Permiso denegado: tu rol es de solo lectura', 'error');
        return;
      }
      if (!maintForm.toolId) {
        notify('Selecciona el equipo para mantenimiento', 'warning');
        return;
      }
      if (!maintForm.description) {
        notify('Describe el motivo o trabajo a realizar', 'warning');
        return;
      }

      const tool = tools.value.find(t => t.id === maintForm.toolId);
      if (!tool) return;

      const record = {
        ...maintForm,
        toolCode: tool.code,
        toolName: tool.name,
        createdAt: Date.now()
      };

      if (isEditingMaint.value) {
        const idx = maintenances.value.findIndex(m => m.id === maintForm.id);
        if (idx !== -1) maintenances.value[idx] = record;
      } else {
        maintenances.value.unshift(record);
        if (tool.status !== 'prestado') {
          tool.status = 'mantenimiento';
        }
      }

      showMaintenanceModal.value = false;
      saveToStorage();
      notify(`Mantenimiento ${record.code} guardado`);

      if (supabaseConnected.value && supabaseClient.value) {
        supabaseClient.value.from('maintenances').upsert([toSupabaseMaint(record)]).then(({ error }) => {
          if (error) console.error('Supabase saveMaintenance error:', error);
        });
        if (tool) {
          supabaseClient.value.from('tools').upsert([toSupabaseTool(tool)]).then(({ error }) => {
            if (error) console.error('Supabase maint tool error:', error);
          });
        }
      }
    };

    // Modal Mantenimiento Correctivo / Reporte de Avería
    const showCorrectiveModal = ref(false);
    const correctiveForm = reactive({
      id: '',
      code: '',
      toolId: '',
      priority: 'alta',
      failureDescription: '',
      workToDo: '',
      estimatedCost: 0,
      provider: 'Taller Especializado Autorizado',
      responsible: '',
      setToolInMaintenance: true
    });

    const openCorrectiveModal = (preselectedTool = null) => {
      if (isConsulta.value) {
        notify('Tu rol es de solo lectura. No puedes reportar averías.', 'warning');
        return;
      }
      const nextNum = maintenances.value.length + 1;
      const code = 'CORR-' + new Date().getFullYear() + '-' + String(nextNum).padStart(3, '0');
      
      Object.assign(correctiveForm, {
        id: 'maint_corr_' + Date.now(),
        code,
        toolId: preselectedTool ? preselectedTool.id : (tools.value[0]?.id || ''),
        priority: 'alta',
        failureDescription: '',
        workToDo: '',
        estimatedCost: 0,
        provider: 'Taller Especializado Autorizado',
        responsible: currentUser.value?.name || company.manager,
        setToolInMaintenance: true
      });
      showCorrectiveModal.value = true;
    };

    const saveCorrectiveMaintenance = () => {
      if (isConsulta.value) {
        notify('Permiso denegado: tu rol es de solo lectura', 'error');
        return;
      }
      if (!correctiveForm.toolId) {
        notify('Por favor selecciona el equipo averiado', 'warning');
        return;
      }
      if (!correctiveForm.failureDescription) {
        notify('Por favor describe la falla o daño presentado en el equipo', 'warning');
        return;
      }
      if (!correctiveForm.workToDo) {
        notify('Por favor describe el trabajo a realizar o reparación requerida', 'warning');
        return;
      }

      const tool = tools.value.find(t => t.id === correctiveForm.toolId);
      if (!tool) return;

      const record = {
        id: correctiveForm.id,
        code: correctiveForm.code,
        toolId: tool.id,
        toolCode: tool.code,
        toolName: tool.name,
        type: 'correctivo',
        status: 'en_proceso',
        priority: correctiveForm.priority,
        scheduledDate: new Date().toISOString().split('T')[0],
        completedDate: null,
        provider: correctiveForm.provider || 'Taller Interno',
        responsible: correctiveForm.responsible || currentUser.value?.name || company.manager,
        cost: 0,
        estimatedCost: Number(correctiveForm.estimatedCost) || 0,
        description: correctiveForm.failureDescription,
        failureDescription: correctiveForm.failureDescription,
        workToDo: correctiveForm.workToDo,
        workDone: '',
        partsReplaced: '',
        nextMaintenanceDate: '',
        testingResult: '',
        createdAt: Date.now()
      };

      maintenances.value.unshift(record);

      if (correctiveForm.setToolInMaintenance) {
        tool.status = 'mantenimiento';
      }

      showCorrectiveModal.value = false;
      saveToStorage();
      notify(`Avería registrada: Orden ${record.code} para ${tool.code} (Costo est. $${(record.estimatedCost || 0).toLocaleString()})`, 'success');

      if (supabaseConnected.value && supabaseClient.value) {
        supabaseClient.value.from('maintenances').upsert([toSupabaseMaint(record)]).then(({ error }) => {
          if (error) console.error('Supabase saveCorrective error:', error);
        });
        supabaseClient.value.from('tools').upsert([toSupabaseTool(tool)]).then(({ error }) => {
          if (error) console.error('Supabase tool status error:', error);
        });
      }
    };

    // Modal Prueba Operativa Periódica (Generadores, Plantas, Motores, Bombas)
    const showTestModal = ref(false);
    const testForm = reactive({
      toolId: '',
      testDate: new Date().toISOString().split('T')[0],
      tester: '',
      result: 'satisfactorio',
      notes: '',
      triggerCorrectiveIfFailed: true
    });

    const openTestModal = (preselectedTool = null) => {
      if (isConsulta.value) {
        notify('Tu rol es de solo lectura. No puedes registrar pruebas operativas.', 'warning');
        return;
      }
      testForm.toolId = preselectedTool ? preselectedTool.id : (tools.value.find(t => t.requiresPeriodicTesting)?.id || tools.value[0]?.id || '');
      testForm.testDate = new Date().toISOString().split('T')[0];
      testForm.tester = currentUser.value?.name || company.manager;
      testForm.result = 'satisfactorio';
      testForm.notes = '';
      testForm.triggerCorrectiveIfFailed = true;
      showTestModal.value = true;
    };

    const saveOperationalTest = () => {
      if (isConsulta.value) {
        notify('Permiso denegado: tu rol es de solo lectura', 'error');
        return;
      }
      if (!testForm.toolId) {
        notify('Selecciona el equipo al que se le realizó la prueba', 'warning');
        return;
      }

      const tool = tools.value.find(t => t.id === testForm.toolId);
      if (!tool) return;

      const nextTestDate = addDaysToDate(testForm.testDate, tool.testingPeriodDays || 15);
      tool.lastTestingDate = testForm.testDate;
      tool.nextTestingDate = nextTestDate;

      const testRecord = {
        id: 'test_' + Date.now(),
        code: 'TEST-' + new Date().getFullYear() + '-' + String(maintenances.value.length + 1).padStart(3, '0'),
        toolId: tool.id,
        toolCode: tool.code,
        toolName: tool.name,
        type: 'prueba',
        status: 'completado',
        priority: 'media',
        scheduledDate: testForm.testDate,
        completedDate: testForm.testDate,
        provider: 'Inspección Interna en Almacén',
        responsible: testForm.tester,
        cost: 0,
        estimatedCost: 0,
        description: `Prueba Operativa Periódica (${testForm.result.toUpperCase()}): ${testForm.notes || 'Arranque y funcionamiento verificado'}`,
        failureDescription: '',
        workToDo: '',
        workDone: testForm.notes || 'Prueba de encendido y verificación de parámetros',
        partsReplaced: '',
        testingResult: testForm.result,
        nextMaintenanceDate: nextTestDate,
        createdAt: Date.now()
      };

      maintenances.value.unshift(testRecord);
      showTestModal.value = false;
      saveToStorage();

      if (testForm.result === 'fallido') {
        tool.status = 'mantenimiento';
        notify(`Prueba FALLIDA registrada para ${tool.code}. Equipo marcado en mantenimiento.`, 'error');
        if (testForm.triggerCorrectiveIfFailed) {
          openCorrectiveModal(tool);
          correctiveForm.failureDescription = `Falla detectada durante prueba operativa periódica del ${formatDate(testForm.testDate)}: ${testForm.notes}`;
          correctiveForm.priority = 'urgente';
        }
      } else {
        notify(`Prueba operativa registrada para ${tool.code}. Próxima prueba programada para: ${formatDate(nextTestDate)}`, 'success');
      }

      if (supabaseConnected.value && supabaseClient.value) {
        supabaseClient.value.from('maintenances').upsert([toSupabaseMaint(testRecord)]).then(({ error }) => {
          if (error) console.error('Supabase test error:', error);
        });
        supabaseClient.value.from('tools').upsert([toSupabaseTool(tool)]).then(({ error }) => {
          if (error) console.error('Supabase tool test error:', error);
        });
      }
    };

    // Modal Finalizar Mantenimiento
    const showCompleteMaintModal = ref(false);
    const completeMaintForm = reactive({
      maint: null,
      completedDate: new Date().toISOString().split('T')[0],
      finalCost: 0,
      workDone: '',
      partsReplaced: '',
      nextMaintenanceDate: '',
      setToolAvailable: true
    });

    const openCompleteMaintenanceModal = (maint) => {
      if (isConsulta.value) {
        notify('Tu rol es de solo lectura. No puedes finalizar órdenes de taller.', 'warning');
        return;
      }
      completeMaintForm.maint = maint;
      completeMaintForm.completedDate = new Date().toISOString().split('T')[0];
      completeMaintForm.finalCost = maint.cost || maint.estimatedCost || 0;
      completeMaintForm.workDone = maint.workToDo || '';
      completeMaintForm.partsReplaced = '';
      
      const tool = tools.value.find(t => t.id === maint.toolId);
      const period = (tool && tool.maintenancePeriodDays) ? tool.maintenancePeriodDays : 90;
      completeMaintForm.nextMaintenanceDate = addDaysToDate(completeMaintForm.completedDate, period);
      completeMaintForm.setToolAvailable = true;
      showCompleteMaintModal.value = true;
    };

    const finalizeMaintenance = () => {
      if (isConsulta.value) {
        notify('Permiso denegado: tu rol es de solo lectura', 'error');
        return;
      }
      const m = completeMaintForm.maint;
      if (!m) return;

      m.status = 'completado';
      m.completedDate = completeMaintForm.completedDate;
      m.cost = Number(completeMaintForm.finalCost) || 0;
      m.workDone = completeMaintForm.workDone;
      m.partsReplaced = completeMaintForm.partsReplaced;
      m.nextMaintenanceDate = completeMaintForm.nextMaintenanceDate;

      let tool = tools.value.find(t => t.id === m.toolId);
      if (tool) {
        if (m.type === 'preventivo') {
          tool.lastMaintenanceDate = completeMaintForm.completedDate;
          if (tool.maintenancePeriodDays > 0) {
            tool.nextMaintenanceDate = completeMaintForm.nextMaintenanceDate || addDaysToDate(completeMaintForm.completedDate, tool.maintenancePeriodDays);
          }
        }
        if (completeMaintForm.setToolAvailable && tool.status === 'mantenimiento') {
          tool.status = 'disponible';
        }
      }

      showCompleteMaintModal.value = false;
      saveToStorage();
      notify(`Mantenimiento ${m.code} finalizado y equipo liberado`);

      if (supabaseConnected.value && supabaseClient.value) {
        supabaseClient.value.from('maintenances').upsert([toSupabaseMaint(m)]).then(({ error }) => {
          if (error) console.error('Supabase finalizeMaintenance error:', error);
        });
        if (tool) {
          supabaseClient.value.from('tools').upsert([toSupabaseTool(tool)]).then(({ error }) => {
            if (error) console.error('Supabase finalize tool error:', error);
          });
        }
      }
    };

    // 5. Modal Técnico (Crear / Editar)
    const showTechModal = ref(false);
    const isEditingTech = ref(false);
    const techForm = reactive({
      id: '',
      dni: '',
      name: '',
      phone: '',
      email: '',
      role: 'Técnico Especialista',
      active: true
    });

    const openNewTechModal = () => {
      if (isConsulta.value) {
        notify('Tu rol es de solo lectura. No puedes registrar técnicos.', 'warning');
        return;
      }
      isEditingTech.value = false;
      Object.assign(techForm, {
        id: 'tech_' + Date.now(),
        dni: '',
        name: '',
        phone: '',
        email: '',
        role: 'Técnico Especialista',
        active: true
      });
      showTechModal.value = true;
    };

    const openEditTechModal = (tech) => {
      if (isConsulta.value) {
        notify('Tu rol es de solo lectura. No puedes editar técnicos.', 'warning');
        return;
      }
      isEditingTech.value = true;
      Object.assign(techForm, JSON.parse(JSON.stringify(tech)));
      showTechModal.value = true;
    };

    const saveTechnician = () => {
      if (isConsulta.value) {
        notify('Permiso denegado: tu rol es de solo lectura', 'error');
        return;
      }
      if (!techForm.name || !techForm.dni) {
        notify('Ingresa el nombre y la identificación del técnico', 'warning');
        return;
      }
      if (isEditingTech.value) {
        const idx = technicians.value.findIndex(t => t.id === techForm.id);
        if (idx !== -1) {
          technicians.value[idx] = { ...techForm };
          notify(`Técnico ${techForm.name} actualizado`);
          saveToStorage();
          if (supabaseConnected.value && supabaseClient.value) {
            supabaseClient.value.from('technicians').upsert([toSupabaseTech(technicians.value[idx])]).then(({ error }) => {
              if (error) console.error('Supabase saveTechnician error:', error);
            });
          }
        }
      } else {
        const newTech = {
          ...techForm,
          id: techForm.id || ('tech_' + Date.now()),
          createdAt: new Date().toISOString().split('T')[0]
        };
        technicians.value.push(newTech);
        notify(`Técnico ${techForm.name} registrado con éxito`);
        saveToStorage();
        if (supabaseConnected.value && supabaseClient.value) {
          supabaseClient.value.from('technicians').upsert([toSupabaseTech(newTech)]).then(({ error }) => {
            if (error) console.error('Supabase saveTechnician error:', error);
          });
        }
      }
      showTechModal.value = false;
    };

    // Modal Detalle e Historial de Técnico
    const showTechDetailModal = ref(false);
    const selectedTechForDetail = ref(null);
    const techActiveLoansList = computed(() => {
      if (!selectedTechForDetail.value) return [];
      return activeLoans.value.filter(l => l.technicianId === selectedTechForDetail.value.id);
    });
    const techCompletedLoansList = computed(() => {
      if (!selectedTechForDetail.value) return [];
      return completedLoans.value.filter(l => l.technicianId === selectedTechForDetail.value.id);
    });

    const openTechDetail = (tech) => {
      selectedTechForDetail.value = tech;
      showTechDetailModal.value = true;
    };

    // 6. VALE DE ENTREGA IMPRIMIBLE
    const showVoucherModal = ref(false);
    const currentVoucher = ref(null);

    const openPrintVoucher = (loan) => {
      currentVoucher.value = loan;
      showVoucherModal.value = true;
    };

    const triggerPrint = () => {
      window.print();
    };

    // ELIMINACIONES SEGURAS (PROTECCIÓN IDOR & ROW-LEVEL-SECURITY)
    const deleteTool = (tool) => {
      if (isConsulta.value) {
        notify('Permiso denegado: solo lectura', 'error');
        return;
      }
      if (!isAdmin.value && !isAlmacen.value) {
        notify('Permiso denegado', 'error');
        return;
      }
      if (tool.status === 'prestado') {
        notify('No puedes eliminar un equipo que está prestado a un técnico actualmente', 'error');
        return;
      }
      if (confirm(`¿Estás seguro de eliminar el equipo "${tool.code} - ${tool.name}"?`)) {
        tools.value = tools.value.filter(t => t.id !== tool.id);
        notify(`Equipo eliminado del catálogo`);
        if (supabaseConnected.value && supabaseClient.value) {
          supabaseClient.value
            .from('tools')
            .delete()
            .eq('id', tool.id)
            .eq('company_id', currentCompanyId.value)
            .then(({ error }) => {
              if (error) console.error('Supabase deleteTool error:', error);
            });
        }
      }
    };

    const deleteTechnician = (tech) => {
      if (isConsulta.value) {
        notify('Permiso denegado: solo lectura', 'error');
        return;
      }
      if (!isAdmin.value) {
        notify('Solo administradores pueden eliminar técnicos', 'error');
        return;
      }
      const hasActive = activeLoans.value.some(l => l.technicianId === tech.id);
      if (hasActive) {
        notify('No puedes eliminar un técnico que tiene herramientas prestadas activas', 'error');
        return;
      }
      if (confirm(`¿Eliminar al técnico "${tech.name}"?`)) {
        technicians.value = technicians.value.filter(t => t.id !== tech.id);
        notify(`Técnico eliminado`);
        if (supabaseConnected.value && supabaseClient.value) {
          supabaseClient.value
            .from('technicians')
            .delete()
            .eq('id', tech.id)
            .eq('company_id', currentCompanyId.value)
            .then(({ error }) => {
              if (error) console.error('Supabase deleteTechnician error:', error);
            });
        }
      }
    };

    // REPORTES Y EXPORTACIÓN A EXCEL
    const downloadCSV = (content, filename) => {
      const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    };

    const exportToolsToExcel = () => {
      let csv = 'Código;Nombre;Categoría;Marca;Modelo;Número de Serie;Estado;Ubicación;Costo ($);Fecha Adquisición;Notas\n';
      tools.value.forEach(t => {
        csv += `"${t.code}";"${t.name}";"${t.category}";"${t.brand}";"${t.model}";"${t.serialNumber}";"${t.status}";"${t.location}";"${t.cost || 0}";"${formatDate(t.acquisitionDate)}";"${(t.notes || '').replace(/"/g, '""')}"\n`;
      });
      downloadCSV(csv, `Inventario_Herramientas_${new Date().toISOString().split('T')[0]}.csv`);
      notify('Catálogo de herramientas exportado para Excel (CSV)');
    };

    const exportLoansToExcel = () => {
      let csv = 'No. Vale;Técnico;DNI Técnico;Herramientas;Fecha Entrega;Fecha Estimada Devolución;Fecha Real Devolución;Estado;Proyecto;Condición Entrega;Condición Retorno;Observaciones\n';
      loans.value.forEach(l => {
        const toolList = l.toolSnapshot ? l.toolSnapshot.map(t => `${t.code} - ${t.name}`).join(' | ') : '';
        csv += `"${l.voucherNumber}";"${l.technicianName}";"${l.technicianDni}";"${toolList}";"${formatDateTime(l.loanDate)}";"${formatDate(l.expectedReturnDate)}";"${l.actualReturnDate ? formatDateTime(l.actualReturnDate) : 'Pendiente'}";"${l.status}";"${l.project}";"${l.deliveryCondition}";"${l.returnCondition || ''}";"${(l.deliveryNotes || '') + ' ' + (l.returnNotes || '')}"\n`;
      });
      downloadCSV(csv, `Historial_Prestamos_${new Date().toISOString().split('T')[0]}.csv`);
      notify('Historial de préstamos exportado para Excel (CSV)');
    };

    const exportMaintenancesToExcel = () => {
      let csv = 'Código;Equipo;Código Equipo;Tipo;Estado;Fecha Programada;Fecha Realización;Taller/Proveedor;Responsable;Costo Total ($);Trabajo Realizado;Repuestos;Próximo Mantenimiento\n';
      maintenances.value.forEach(m => {
        csv += `"${m.code}";"${m.toolName}";"${m.toolCode}";"${m.type}";"${m.status}";"${formatDate(m.scheduledDate)}";"${m.completedDate ? formatDate(m.completedDate) : 'Pendiente'}";"${m.provider}";"${m.responsible}";"${m.cost || 0}";"${(m.workDone || m.description || '').replace(/"/g, '""')}";"${(m.partsReplaced || '').replace(/"/g, '""')}";"${formatDate(m.nextMaintenanceDate)}"\n`;
      });
      downloadCSV(csv, `Control_Mantenimientos_${new Date().toISOString().split('T')[0]}.csv`);
      notify('Control de mantenimientos exportado para Excel (CSV)');
    };

    // =========================================================================
    // CARGA MASIVA MEDIANTE PLANTILLA EXCEL (CSV UTF-8) - SOLO ADMINISTRADOR
    // =========================================================================
    const showImportModal = ref(false);
    const importType = ref('tools'); // 'tools' | 'techs'
    const importState = reactive({
      fileName: '',
      rawCount: 0,
      validCount: 0,
      invalidCount: 0,
      errors: [],
      previewRows: [],
      updateExisting: true,
      isImporting: false
    });

    // Generación y descarga de plantillas oficiales con BOM UTF-8 y delimitador punto y coma
    const downloadToolsTemplate = () => {
      if (!isAdmin.value) {
        notify('Acceso denegado: Solo los administradores pueden descargar plantillas de carga masiva', 'error');
        return;
      }
      const headers = 'Código;Nombre;Categoría;Marca;Modelo;Número de Serie;Ubicación;Costo;Fecha Adquisición (DD/MM/AAAA);Notas';
      const sample1 = 'TAL-101;Taladro Percutor Inalámbrico 20V Max;Herramienta Eléctrica;DeWalt;DCD796D2;DW-88291;Almacén Central - Estante A3;185;10/05/2025;Incluye cargador rápido y 2 baterías 4Ah';
      const sample2 = 'GEN-102;Generador Portátil a Gasolina 3500W;Generadores y Motores;Honda;EU30is;HN-99412;Bodega de Maquinaria Norte;1450;15/02/2025;Mantenimiento de aceite cada 100 horas';
      const sample3 = 'NIV-103;Nivel Óptico de Precisión 32X con Trípode;Medición y Precisión;Leica;NA332;LC-77215;Armario de Instrumentos;420;01/06/2025;Incluye mira telescópica de 5 metros';
      const content = `${headers}\n${sample1}\n${sample2}\n${sample3}\n`;
      downloadCSV(content, 'Plantilla_Equipos_TOOLPRO.csv');
      notify('Plantilla oficial de equipos descargada (Compatible con Excel)');
    };

    const downloadTechsTemplate = () => {
      if (!isAdmin.value) {
        notify('Acceso denegado: Solo los administradores pueden descargar plantillas de carga masiva', 'error');
        return;
      }
      const headers = 'Identificación (DNI/Cédula);Nombre Completo;Teléfono;Correo Electrónico;Especialidad / Cargo';
      const sample1 = 'CC-10984562;Alejandro Restrepo Ríos;310-555-1234;alejandro.restrepo@empresa.com;Técnico Electricista Industrial';
      const sample2 = 'CC-71283940;Mauricio Cardona Zapata;315-444-9876;mauricio.cardona@empresa.com;Mecánico de Maquinaria Pesada';
      const sample3 = 'CC-10234567;Valeria Monsalve Soto;320-333-4567;valeria.monsalve@empresa.com;Supervisora de Mantenimiento';
      const content = `${headers}\n${sample1}\n${sample2}\n${sample3}\n`;
      downloadCSV(content, 'Plantilla_Tecnicos_TOOLPRO.csv');
      notify('Plantilla oficial de técnicos descargada (Compatible con Excel)');
    };

    // Parser universal de CSV/TXT respetando comillas, comas, puntos y comas y saltos de línea
    const parseCSVRows = (text) => {
      if (!text) return [];
      if (text.charCodeAt(0) === 0xFEFF) {
        text = text.slice(1);
      }

      const firstLine = text.split(/\r\n|\n|\r/)[0] || '';
      const semicolonCount = (firstLine.match(/;/g) || []).length;
      const commaCount = (firstLine.match(/,/g) || []).length;
      const delimiter = semicolonCount >= commaCount ? ';' : ',';

      const rows = [];
      let currentRow = [];
      let currentVal = '';
      let insideQuotes = false;

      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];

        if (char === '"') {
          if (insideQuotes && nextChar === '"') {
            currentVal += '"';
            i++;
          } else {
            insideQuotes = !insideQuotes;
          }
        } else if (char === delimiter && !insideQuotes) {
          currentRow.push(currentVal.trim());
          currentVal = '';
        } else if ((char === '\r' || char === '\n') && !insideQuotes) {
          if (char === '\r' && nextChar === '\n') {
            i++;
          }
          currentRow.push(currentVal.trim());
          currentVal = '';
          if (currentRow.some(cell => cell.length > 0)) {
            rows.push(currentRow);
          }
          currentRow = [];
        } else {
          currentVal += char;
        }
      }

      if (currentVal.length > 0 || currentRow.length > 0) {
        currentRow.push(currentVal.trim());
        if (currentRow.some(cell => cell.length > 0)) {
          rows.push(currentRow);
        }
      }

      return rows;
    };

    // Normalizador de cabeceras para emparejar columnas sin importar acentos ni mayúsculas
    const normalizeHeader = (str) => {
      return (str || '')
        .toString()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '');
    };

    const mapToolHeaders = (headerRow) => {
      const map = {
        code: -1,
        name: -1,
        category: -1,
        brand: -1,
        model: -1,
        serialNumber: -1,
        location: -1,
        cost: -1,
        acquisitionDate: -1,
        notes: -1
      };

      headerRow.forEach((col, idx) => {
        const norm = normalizeHeader(col);
        if (norm.includes('cod') || norm === 'id') map.code = idx;
        else if (norm.includes('nom') || norm.includes('descrip') || norm.includes('equipo') || norm.includes('herramienta')) map.name = idx;
        else if (norm.includes('cat')) map.category = idx;
        else if (norm.includes('mar')) map.brand = idx;
        else if (norm.includes('mod')) map.model = idx;
        else if (norm.includes('ser') || norm.includes('serial')) map.serialNumber = idx;
        else if (norm.includes('ubi') || norm.includes('locat')) map.location = idx;
        else if (norm.includes('cost') || norm.includes('prec') || norm.includes('valor')) map.cost = idx;
        else if (norm.includes('fec') || norm.includes('adquis') || norm.includes('date')) map.acquisitionDate = idx;
        else if (norm.includes('not') || norm.includes('obs')) map.notes = idx;
      });

      // Posiciones de respaldo de la plantilla estándar
      if (map.code === -1 && headerRow.length >= 2) map.code = 0;
      if (map.name === -1 && headerRow.length >= 2) map.name = 1;
      if (map.category === -1 && headerRow.length >= 3) map.category = 2;
      if (map.brand === -1 && headerRow.length >= 4) map.brand = 3;
      if (map.model === -1 && headerRow.length >= 5) map.model = 4;
      if (map.serialNumber === -1 && headerRow.length >= 6) map.serialNumber = 5;
      if (map.location === -1 && headerRow.length >= 7) map.location = 6;
      if (map.cost === -1 && headerRow.length >= 8) map.cost = 7;
      if (map.acquisitionDate === -1 && headerRow.length >= 9) map.acquisitionDate = 8;
      if (map.notes === -1 && headerRow.length >= 10) map.notes = 9;

      return map;
    };

    const mapTechHeaders = (headerRow) => {
      const map = {
        dni: -1,
        name: -1,
        phone: -1,
        email: -1,
        role: -1
      };

      headerRow.forEach((col, idx) => {
        const norm = normalizeHeader(col);
        if (norm.includes('dni') || norm.includes('cedula') || norm.includes('ident') || norm.includes('doc')) map.dni = idx;
        else if (norm.includes('nom')) map.name = idx;
        else if (norm.includes('tel') || norm.includes('cel') || norm.includes('phone')) map.phone = idx;
        else if (norm.includes('cor') || norm.includes('email') || norm.includes('mail')) map.email = idx;
        else if (norm.includes('esp') || norm.includes('carg') || norm.includes('rol') || norm.includes('puesto')) map.role = idx;
      });

      if (map.dni === -1 && headerRow.length >= 2) map.dni = 0;
      if (map.name === -1 && headerRow.length >= 2) map.name = 1;
      if (map.phone === -1 && headerRow.length >= 3) map.phone = 2;
      if (map.email === -1 && headerRow.length >= 4) map.email = 3;
      if (map.role === -1 && headerRow.length >= 5) map.role = 4;

      return map;
    };

    const openImportModal = (type = 'tools') => {
      if (!isAdmin.value) {
        notify('Acceso denegado: Solo los administradores pueden realizar importaciones masivas', 'error');
        return;
      }
      importType.value = type;
      importState.fileName = '';
      importState.rawCount = 0;
      importState.validCount = 0;
      importState.invalidCount = 0;
      importState.errors = [];
      importState.previewRows = [];
      importState.updateExisting = true;
      importState.isImporting = false;
      showImportModal.value = true;
    };

    const handleImportFile = (event) => {
      if (!isAdmin.value) {
        notify('Acceso denegado: Se requieren permisos de Administrador', 'error');
        return;
      }
      const file = event.target.files[0];
      if (!file) return;

      importState.fileName = file.name;
      importState.previewRows = [];
      importState.errors = [];

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target.result;
          const rows = parseCSVRows(text);
          if (!rows || rows.length < 2) {
            notify('El archivo no contiene suficientes filas o datos legibles', 'error');
            return;
          }

          const headerRow = rows[0];
          const dataRows = rows.slice(1);
          importState.rawCount = dataRows.length;

          let valid = 0;
          let invalid = 0;
          const previews = [];

          if (importType.value === 'tools') {
            const colMap = mapToolHeaders(headerRow);
            const existingCodes = new Set(tools.value.map(t => (t.code || '').trim().toUpperCase()));

            dataRows.forEach((r, idx) => {
              const rowNum = idx + 2;
              const code = (colMap.code >= 0 && r[colMap.code] ? r[colMap.code].trim() : '');
              const name = (colMap.name >= 0 && r[colMap.name] ? r[colMap.name].trim() : '');
              const category = (colMap.category >= 0 && r[colMap.category] ? r[colMap.category].trim() : 'Herramienta General');
              const brand = (colMap.brand >= 0 && r[colMap.brand] ? r[colMap.brand].trim() : 'Genérica');
              const model = (colMap.model >= 0 && r[colMap.model] ? r[colMap.model].trim() : '');
              const serialNumber = (colMap.serialNumber >= 0 && r[colMap.serialNumber] ? r[colMap.serialNumber].trim() : '');
              const location = (colMap.location >= 0 && r[colMap.location] ? r[colMap.location].trim() : 'Almacén Central');
              const costRaw = colMap.cost >= 0 && r[colMap.cost] ? r[colMap.cost].replace(/[^0-9.,]/g, '').replace(',', '.') : '0';
              const cost = parseFloat(costRaw) || 0;
              const rawAcqDate = colMap.acquisitionDate >= 0 && r[colMap.acquisitionDate] ? r[colMap.acquisitionDate].trim() : '';
              let acquisitionDate = new Date().toISOString().split('T')[0];
              if (rawAcqDate) {
                const parsedD = parseDateObj(rawAcqDate);
                if (parsedD) {
                  const y = parsedD.getFullYear();
                  const m = String(parsedD.getMonth() + 1).padStart(2, '0');
                  const d = String(parsedD.getDate()).padStart(2, '0');
                  acquisitionDate = `${y}-${m}-${d}`;
                } else {
                  acquisitionDate = rawAcqDate;
                }
              }
              const notes = colMap.notes >= 0 && r[colMap.notes] ? r[colMap.notes].trim() : '';

              let isValid = true;
              let errorMsg = '';
              if (!code) {
                isValid = false;
                errorMsg = 'Falta el código del equipo';
              } else if (!name) {
                isValid = false;
                errorMsg = 'Falta el nombre/descripción del equipo';
              }

              const isExisting = existingCodes.has(code.toUpperCase());

              if (isValid) {
                valid++;
              } else {
                invalid++;
              }

              previews.push({
                rowNum,
                isValid,
                errorMsg,
                isExisting,
                data: {
                  code,
                  name,
                  category,
                  brand,
                  model,
                  serialNumber,
                  location,
                  cost,
                  acquisitionDate,
                  notes,
                  status: 'disponible'
                }
              });
            });
          } else {
            // Técnicos
            const colMap = mapTechHeaders(headerRow);
            const existingDnis = new Set(technicians.value.map(t => (t.dni || '').trim().toUpperCase()));

            dataRows.forEach((r, idx) => {
              const rowNum = idx + 2;
              const dni = (colMap.dni >= 0 && r[colMap.dni] ? r[colMap.dni].trim() : '');
              const name = (colMap.name >= 0 && r[colMap.name] ? r[colMap.name].trim() : '');
              const phone = (colMap.phone >= 0 && r[colMap.phone] ? r[colMap.phone].trim() : '');
              const email = (colMap.email >= 0 && r[colMap.email] ? r[colMap.email].trim() : '');
              const role = (colMap.role >= 0 && r[colMap.role] ? r[colMap.role].trim() : 'Técnico Operativo');

              let isValid = true;
              let errorMsg = '';
              if (!dni) {
                isValid = false;
                errorMsg = 'Falta la Identificación (DNI / Cédula)';
              } else if (!name) {
                isValid = false;
                errorMsg = 'Falta el nombre completo';
              }

              const isExisting = existingDnis.has(dni.toUpperCase());

              if (isValid) {
                valid++;
              } else {
                invalid++;
              }

              previews.push({
                rowNum,
                isValid,
                errorMsg,
                isExisting,
                data: {
                  dni,
                  name,
                  phone,
                  email,
                  role,
                  active: true
                }
              });
            });
          }

          importState.validCount = valid;
          importState.invalidCount = invalid;
          importState.previewRows = previews;
          notify(`Archivo procesado: ${valid} registros válidos, ${invalid} con observaciones`);
        } catch (err) {
          console.error('Error parseando archivo CSV:', err);
          notify('Error al procesar el archivo CSV: ' + err.message, 'error');
        }
      };
      reader.readAsText(file, 'UTF-8');
      event.target.value = '';
    };

    const executeImport = async () => {
      if (!isAdmin.value) {
        notify('Acceso denegado: Solo el Administrador puede importar datos', 'error');
        return;
      }
      if (!importState.validCount) {
        notify('No hay registros válidos para importar', 'warning');
        return;
      }

      importState.isImporting = true;
      let addedCount = 0;
      let updatedCount = 0;
      const itemsToSync = [];

      try {
        if (importType.value === 'tools') {
          const validRows = importState.previewRows.filter(r => r.isValid);

          for (const row of validRows) {
            const d = row.data;
            const existingIndex = tools.value.findIndex(t => (t.code || '').trim().toUpperCase() === d.code.toUpperCase());

            if (existingIndex >= 0) {
              if (importState.updateExisting) {
                const current = tools.value[existingIndex];
                const updated = {
                  ...current,
                  name: d.name || current.name,
                  category: d.category || current.category,
                  brand: d.brand || current.brand,
                  model: d.model || current.model,
                  serialNumber: d.serialNumber || current.serialNumber,
                  location: d.location || current.location,
                  cost: d.cost !== undefined ? d.cost : current.cost,
                  acquisitionDate: d.acquisitionDate || current.acquisitionDate,
                  notes: d.notes ? (current.notes ? `${current.notes} | ${d.notes}` : d.notes) : current.notes
                };
                tools.value[existingIndex] = updated;
                itemsToSync.push(updated);
                updatedCount++;
              }
            } else {
              const newTool = {
                id: 'tool_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                code: d.code,
                name: d.name,
                category: d.category || 'Herramienta General',
                brand: d.brand || '',
                model: d.model || '',
                serialNumber: d.serialNumber || '',
                status: 'disponible',
                location: d.location || 'Almacén Central',
                acquisitionDate: d.acquisitionDate || new Date().toISOString().split('T')[0],
                cost: d.cost || 0,
                notes: d.notes || '',
                createdAt: Date.now()
              };
              tools.value.push(newTool);
              itemsToSync.push(newTool);
              addedCount++;
            }
          }

          saveToStorage();

          // Sincronización en tiempo real con Supabase si está conectado
          if (supabaseConnected.value && supabaseClient.value && itemsToSync.length > 0) {
            try {
              const rows = itemsToSync.map(toSupabaseTool);
              const { error } = await supabaseClient.value.from('tools').upsert(rows);
              if (error) {
                console.error('Error sincronizando importación con Supabase:', error);
                notify(`Importados localmente (${addedCount} nuevos, ${updatedCount} actualizados), aviso en Supabase: ${error.message}`, 'warning');
              } else {
                console.log('[Supabase] Carga masiva de equipos sincronizada con éxito');
              }
            } catch (sErr) {
              console.error('Error enviando a Supabase:', sErr);
            }
          }

          notify(`¡Carga masiva completada! ${addedCount} equipo(s) creado(s) y ${updatedCount} actualizado(s)`, 'success');
          showImportModal.value = false;

        } else {
          // Importación de Técnicos
          const validRows = importState.previewRows.filter(r => r.isValid);

          for (const row of validRows) {
            const d = row.data;
            const existingIndex = technicians.value.findIndex(t => (t.dni || '').trim().toUpperCase() === d.dni.toUpperCase());

            if (existingIndex >= 0) {
              if (importState.updateExisting) {
                const current = technicians.value[existingIndex];
                const updated = {
                  ...current,
                  name: d.name || current.name,
                  phone: d.phone || current.phone,
                  email: d.email || current.email,
                  role: d.role || current.role
                };
                technicians.value[existingIndex] = updated;
                itemsToSync.push(updated);
                updatedCount++;
              }
            } else {
              const newTech = {
                id: 'tech_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                dni: d.dni,
                name: d.name,
                phone: d.phone || '',
                email: d.email || '',
                role: d.role || 'Técnico Operativo',
                active: true,
                createdAt: new Date().toISOString().split('T')[0]
              };
              technicians.value.push(newTech);
              itemsToSync.push(newTech);
              addedCount++;
            }
          }

          saveToStorage();

          // Sincronización en tiempo real con Supabase si está conectado
          if (supabaseConnected.value && supabaseClient.value && itemsToSync.length > 0) {
            try {
              const rows = itemsToSync.map(toSupabaseTech);
              const { error } = await supabaseClient.value.from('technicians').upsert(rows);
              if (error) {
                console.error('Error sincronizando técnicos con Supabase:', error);
                notify(`Importados localmente (${addedCount} nuevos, ${updatedCount} actualizados), aviso en Supabase: ${error.message}`, 'warning');
              } else {
                console.log('[Supabase] Técnicos sincronizados con éxito');
              }
            } catch (sErr) {
              console.error('Error enviando a Supabase:', sErr);
            }
          }

          notify(`¡Carga masiva completada! ${addedCount} técnico(s) creado(s) y ${updatedCount} actualizado(s)`, 'success');
          showImportModal.value = false;
        }
      } catch (err) {
        console.error('Error en executeImport:', err);
        notify('Error durante la importación: ' + err.message, 'error');
      } finally {
        importState.isImporting = false;
      }
    };

    // COPIA DE SEGURIDAD (BACKUP JSON) Y RESTAURACIÓN
    const exportBackupJSON = () => {
      if (!isAdmin.value) {
        notify('Solo los administradores pueden descargar respaldos completos del sistema', 'warning');
        return;
      }
      const data = {
        app: 'TOOLPRO',
        version: '1.2',
        exportedAt: new Date().toISOString(),
        company,
        users: users.value,
        tools: tools.value,
        technicians: technicians.value,
        loans: loans.value,
        maintenances: maintenances.value
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `TOOLPRO_Respaldo_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(a);
      notify('Copia de seguridad descargada en formato JSON');
    };

    const restoreBackupJSON = (event) => {
      if (!isAdmin.value) {
        notify('Solo los administradores pueden restaurar copias de seguridad', 'error');
        return;
      }
      const file = event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const parsed = JSON.parse(e.target.result);
          if (parsed.tools && parsed.technicians) {
            tools.value = parsed.tools;
            technicians.value = parsed.technicians;
            loans.value = parsed.loans || [];
            maintenances.value = parsed.maintenances || [];
            if (parsed.users && parsed.users.length > 0) users.value = parsed.users;
            if (parsed.company) Object.assign(company, parsed.company);
            saveToStorage();
            notify('¡Copia de seguridad restaurada exitosamente!');
          } else {
            notify('El archivo JSON no tiene la estructura esperada de ToolMaster', 'error');
          }
        } catch (err) {
          notify('Error al leer el archivo JSON: ' + err.message, 'error');
        }
      };
      reader.readAsText(file);
      event.target.value = '';
    };

    // RESTABLECER DATOS DE EJEMPLO
    const cargarDatosEjemplo = (confirmar = true) => {
      if (confirmar && !confirm('¿Deseas recargar los datos de demostración? Se reemplazarán los datos actuales con el catálogo y usuarios de prueba.')) {
        return;
      }
      Object.assign(company, JSON.parse(JSON.stringify(SEED_DATA.company)));
      users.value = JSON.parse(JSON.stringify(SEED_DATA.users));
      tools.value = JSON.parse(JSON.stringify(SEED_DATA.tools));
      technicians.value = JSON.parse(JSON.stringify(SEED_DATA.technicians));
      loans.value = JSON.parse(JSON.stringify(SEED_DATA.loans));
      maintenances.value = JSON.parse(JSON.stringify(SEED_DATA.maintenances));
      saveToStorage();
      if (confirmar) notify('Datos y usuarios de demostración recargados con éxito');
    };

    const limpiarBaseDatos = () => {
      if (!isAdmin.value) {
        notify('Solo los administradores pueden vaciar la base de datos', 'error');
        return;
      }
      if (confirm('ADVERTENCIA CRÍTICA: ¿Estás seguro de que deseas vaciar toda la base de datos? Se eliminarán todas las herramientas, préstamos y mantenimientos.')) {
        tools.value = [];
        technicians.value = [];
        loans.value = [];
        maintenances.value = [];
        saveToStorage();
        notify('Base de datos vaciada por completo', 'warning');
      }
    };

    // Helpers de Formato Visual
    const getStatusBadge = (status) => {
      switch (status) {
        case 'disponible':
          return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30';
        case 'prestado':
          return 'bg-amber-500/15 text-amber-400 border border-amber-500/30';
        case 'mantenimiento':
          return 'bg-blue-500/15 text-blue-400 border border-blue-500/30';
        case 'danado':
          return 'bg-rose-500/15 text-rose-400 border border-rose-500/30';
        case 'baja':
          return 'bg-slate-600/30 text-slate-400 border border-slate-600/50';
        case 'activo':
          return 'bg-amber-500/15 text-amber-400 border border-amber-500/30';
        case 'devuelto':
          return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30';
        case 'devuelto_con_danios':
          return 'bg-rose-500/15 text-rose-400 border border-rose-500/30';
        case 'programado':
          return 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30';
        case 'en_proceso':
          return 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30';
        case 'completado':
          return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30';
        default:
          return 'bg-slate-700 text-slate-300';
      }
    };

    const getStatusLabel = (status) => {
      const map = {
        disponible: 'Disponible',
        prestado: 'En Préstamo',
        mantenimiento: 'En Mantenimiento',
        danado: 'Dañada / Con Falla',
        baja: 'De Baja',
        activo: 'Activo / Prestado',
        devuelto: 'Devuelto (Ok)',
        devuelto_con_danios: 'Devuelto con Daños',
        programado: 'Programado',
        en_proceso: 'En Taller / Proceso',
        completado: 'Completado'
      };
      return map[status] || status;
    };

    // Control del Tema de Fondo (Verde Claro por defecto según solicitud)
    const currentTheme = ref(localStorage.getItem('TOOLMASTER_THEME_V1') || 'verde-claro');

    const applyTheme = (themeName) => {
      if (themeName === 'verde-claro') {
        document.documentElement.classList.add('theme-verde-claro');
        document.body.classList.add('theme-verde-claro');
      } else {
        document.documentElement.classList.remove('theme-verde-claro');
        document.body.classList.remove('theme-verde-claro');
      }
    };

    const toggleTheme = () => {
      currentTheme.value = currentTheme.value === 'verde-claro' ? 'oscuro' : 'verde-claro';
      applyTheme(currentTheme.value);
      localStorage.setItem('TOOLMASTER_THEME_V1', currentTheme.value);
      notify(`Fondo cambiado a ${currentTheme.value === 'verde-claro' ? 'Verde Claro' : 'Modo Oscuro'}`, 'info');
    };

    // =========================================================================
    // SOPORTE PWA (PROGRESSIVE WEB APP - APLICACIÓN WEB PROGRESIVA)
    // =========================================================================
    const canInstallPwa = ref(false);
    const deferredPrompt = ref(null);

    const installPwa = async () => {
      if (!deferredPrompt.value) {
        notify('Para instalar en iPhone/iPad: pulsa "Compartir" en Safari y luego "Agregar a pantalla de inicio". En Android/PC usa el menú del navegador "Instalar aplicación".', 'info');
        return;
      }
      try {
        deferredPrompt.value.prompt();
        const { outcome } = await deferredPrompt.value.userChoice;
        if (outcome === 'accepted') {
          notify('¡Instalando TOOLPRO en tu dispositivo!', 'success');
          canInstallPwa.value = false;
        }
        deferredPrompt.value = null;
      } catch (e) {
        console.warn('Error al ejecutar installPwa:', e);
      }
    };

    const registerServiceWorker = () => {
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
          navigator.serviceWorker.register('./sw.js')
            .then(reg => {
              console.log('[PWA] Service Worker registrado exitosamente con alcance:', reg.scope);
            })
            .catch(err => {
              console.warn('[PWA] Error registrando Service Worker:', err);
            });
        });
      }

      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt.value = e;
        canInstallPwa.value = true;
        console.log('[PWA] Evento beforeinstallprompt detectado: listo para instalar');
      });

      window.addEventListener('appinstalled', () => {
        canInstallPwa.value = false;
        deferredPrompt.value = null;
        notify('¡TOOLPRO ha sido instalada exitosamente en tu dispositivo!', 'success');
        console.log('[PWA] App instalada con éxito');
      });
    };

    onMounted(() => {
      loadFromStorage();
      applyTheme(currentTheme.value);
      initSupabase();
      registerServiceWorker();
    });

    return {
      activeTab,
      icons,
      toast,
      company,
      users,
      tools,
      // Tema de Fondo
      currentTheme,
      toggleTheme,
      // Supabase Nube & Sincronización en Tiempo Real
      supabaseConnected,
      supabaseConnecting,
      supabaseRealtimeActive,
      isSyncingCloud,
      showSupabaseModal,
      supabaseForm,
      openSupabaseModal,
      saveSupabaseConfig,
      disconnectSupabase,
      uploadLocalDataToSupabase,
      fetchAllFromSupabase,
      // PWA (Progressive Web App)
      canInstallPwa,
      installPwa,
      technicians,
      loans,
      maintenances,
      categories,
      // Autenticación
      currentUser,
      loginForm,
      isAuthenticated,
      isAdmin,
      isAlmacen,
      isConsulta,
      login,
      logout,
      // Gestión de Usuarios
      showUserModal,
      isEditingUser,
      userSearch,
      userRoleFilter,
      userForm,
      filteredUsers,
      openNewUserModal,
      openEditUserModal,
      saveUser,
      deleteUser,
      toggleUserStatus,
      getRoleBadge,
      getRoleLabel,
      // Filtros
      toolSearch,
      toolCategoryFilter,
      toolStatusFilter,
      toolSortBy,
      toolViewMode,
      loanSearch,
      loanTab,
      maintenanceTab,
      maintenanceSearch,
      // Computadas
      totalToolsCount,
      availableToolsCount,
      loanedToolsCount,
      inMaintenanceToolsCount,
      damagedToolsCount,
      activeLoans,
      completedLoans,
      overdueLoans,
      pendingMaintenances,
      completedMaintenances,
      techniciansWithStats,
      filteredTools,
      filteredActiveLoans,
      filteredCompletedLoans,
      filteredPendingMaintenances,
      filteredCompletedMaintenances,
      availableToolsForLoan,
      // Modales & Formularios
      showToolModal,
      isEditingTool,
      toolForm,
      openNewToolModal,
      openEditToolModal,
      saveTool,
      deleteTool,
      showToolDetailModal,
      selectedToolForDetail,
      toolHistoryLoans,
      toolHistoryMaintenances,
      openToolDetail,
      // Préstamos
      showLoanModal,
      loanForm,
      openNewLoanModal,
      toggleToolSelection,
      saveLoan,
      showReturnModal,
      returnForm,
      openReturnModal,
      processReturn,
      // Mantenimientos Periódicos, Alertas, Pruebas y Correctivos
      maintenanceTab,
      maintSubTab,
      maintenanceSearch,
      maintenanceAlertFilter,
      toolsWithMaintenanceInfo,
      overdueMaintenances,
      upcomingMaintenances,
      overdueTests,
      upcomingTests,
      activeCorrectives,
      totalMaintenanceAlerts,
      activeAlertsList,
      filteredPeriodicTools,
      filteredCorrectiveMaintenances,
      showCorrectiveModal,
      correctiveForm,
      openCorrectiveModal,
      saveCorrectiveMaintenance,
      showTestModal,
      testForm,
      openTestModal,
      saveOperationalTest,
      updateToolCalculatedDates,
      addDaysToDate,
      showMaintenanceModal,
      isEditingMaint,
      maintForm,
      openNewMaintenanceModal,
      saveMaintenance,
      showCompleteMaintModal,
      completeMaintForm,
      openCompleteMaintenanceModal,
      finalizeMaintenance,
      // Nuevos Módulos Separados: Mantenimiento y Calentamiento Periódico
      heatingSubTab,
      heatingSearch,
      getMaintenancePeriodDays,
      getMaintenancePeriodLabel,
      getTestingPeriodDays,
      getTestingPeriodLabel,
      setMaintenancePeriod,
      setTestingPeriod,
      allPreventiveTools,
      pendingMaintenanceTools,
      pendingMaintenanceAlertsCount,
      allHeatingTools,
      pendingHeatingTools,
      pendingHeatingAlertsCount,
      heatingHistory,
      filteredHeatingTools,
      // Modales Sencillos: Realizar Mantenimiento y Realizar Calentamiento
      showPerformMaintenanceModal,
      performMaintForm,
      openPerformMaintenance,
      updatePerformMaintNextDate,
      savePerformMaintenance,
      showPerformHeatingModal,
      performHeatingForm,
      openPerformHeating,
      updatePerformHeatingNextDate,
      savePerformHeating,
      // Técnicos
      showTechModal,
      isEditingTech,
      techForm,
      openNewTechModal,
      openEditTechModal,
      saveTechnician,
      deleteTechnician,
      showTechDetailModal,
      selectedTechForDetail,
      techActiveLoansList,
      techCompletedLoansList,
      openTechDetail,
      // Vales & Impresión
      showVoucherModal,
      currentVoucher,
      openPrintVoucher,
      triggerPrint,
      // Exportación & Carga Masiva (Excel / CSV)
      exportToolsToExcel,
      exportLoansToExcel,
      exportMaintenancesToExcel,
      showImportModal,
      importType,
      importState,
      downloadToolsTemplate,
      downloadTechsTemplate,
      openImportModal,
      handleImportFile,
      executeImport,
      exportBackupJSON,
      restoreBackupJSON,
      cargarDatosEjemplo,
      limpiarBaseDatos,
      // Utilidades
      formatDate,
      formatDateTime,
      parseDateObj,
      isLoanOverdue,
      getDaysDifference,
      getStatusBadge,
      getStatusLabel,
      // Contexto Multi-Tenant y Sesión
      currentCompanyId,
      sessionToken
    };
  }
});

app.mount('#app');

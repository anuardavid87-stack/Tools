-- ==============================================================================
-- TOOLMASTER PRO - SCRIPT DE INSTALACIÓN Y CONFIGURACIÓN EN SUPABASE (POSTGRESQL)
-- ==============================================================================
-- Instrucciones:
-- 1. Entra a tu proyecto en https://supabase.com
-- 2. Ve al menú "SQL Editor" en la barra lateral izquierda.
-- 3. Crea una "New query", pega todo el contenido de este archivo y pulsa "Run" (Ejecutar).
-- 4. ¡Listo! Todas las tablas, permisos y eventos en tiempo real quedarán activos.
-- ==============================================================================

-- 1. TABLA: EMPRESA / ALMACÉN
CREATE TABLE IF NOT EXISTS public.company (
    id TEXT PRIMARY KEY DEFAULT 'main',
    name TEXT NOT NULL,
    nit TEXT,
    warehouse TEXT,
    address TEXT,
    phone TEXT,
    manager TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABLA: USUARIOS Y ACCESOS
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'almacen', -- 'admin', 'almacen', 'consulta'
    active BOOLEAN DEFAULT TRUE,
    created_at TEXT DEFAULT TO_CHAR(NOW(), 'YYYY-MM-DD')
);

-- 3. TABLA: HERRAMIENTAS Y MAQUINARIA
CREATE TABLE IF NOT EXISTS public.tools (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT,
    brand TEXT,
    model TEXT,
    serial_number TEXT,
    status TEXT DEFAULT 'disponible', -- 'disponible', 'prestado', 'mantenimiento', 'danado', 'baja'
    location TEXT,
    acquisition_date TEXT,
    cost NUMERIC DEFAULT 0,
    notes TEXT,
    -- Campos para mantenimiento periódico y pruebas operativas
    requires_periodic_maintenance BOOLEAN DEFAULT FALSE,
    maintenance_period TEXT DEFAULT 'trimestral', -- 'mensual', 'trimestral', 'semestral', 'anual'
    maintenance_period_days INTEGER DEFAULT 90,
    last_maintenance_date TEXT,
    next_maintenance_date TEXT,
    requires_periodic_testing BOOLEAN DEFAULT FALSE,
    testing_period TEXT DEFAULT '15_dias', -- '15_dias', '1_mes', '3_meses'
    testing_period_days INTEGER DEFAULT 15,
    last_testing_date TEXT,
    next_testing_date TEXT,
    created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
);

-- 4. TABLA: PERSONAL TÉCNICO Y OPERADORES
CREATE TABLE IF NOT EXISTS public.technicians (
    id TEXT PRIMARY KEY,
    dni TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    role TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TEXT DEFAULT TO_CHAR(NOW(), 'YYYY-MM-DD')
);

-- 5. TABLA: PRÉSTAMOS, ENTREGAS Y DEVOLUCIONES
CREATE TABLE IF NOT EXISTS public.loans (
    id TEXT PRIMARY KEY,
    voucher_number TEXT NOT NULL,
    technician_id TEXT,
    technician_name TEXT,
    technician_dni TEXT,
    tool_ids JSONB DEFAULT '[]'::jsonb,
    tool_snapshot JSONB DEFAULT '[]'::jsonb,
    loan_date TEXT,
    expected_return_date TEXT,
    actual_return_date TEXT,
    status TEXT DEFAULT 'activo', -- 'activo', 'devuelto', 'devuelto_con_danios'
    project TEXT,
    delivery_condition TEXT,
    return_condition TEXT,
    delivery_notes TEXT,
    return_notes TEXT,
    dispatcher TEXT,
    receiver TEXT,
    created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
);

-- 6. TABLA: GESTIÓN DE MANTENIMIENTOS
CREATE TABLE IF NOT EXISTS public.maintenances (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    tool_id TEXT,
    tool_code TEXT,
    tool_name TEXT,
    type TEXT DEFAULT 'preventivo', -- 'preventivo', 'correctivo', 'prueba'
    status TEXT DEFAULT 'programado', -- 'programado', 'en_proceso', 'completado', 'cancelado'
    priority TEXT DEFAULT 'media', -- 'urgente', 'alta', 'media', 'baja'
    scheduled_date TEXT,
    completed_date TEXT,
    provider TEXT,
    responsible TEXT,
    cost NUMERIC DEFAULT 0,
    estimated_cost NUMERIC DEFAULT 0,
    description TEXT,
    failure_description TEXT,
    work_to_do TEXT,
    work_done TEXT,
    parts_replaced TEXT,
    next_maintenance_date TEXT,
    testing_result TEXT, -- 'satisfactorio', 'fallido'
    created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
);

-- Migraciones automáticas para tablas ya creadas previamente
ALTER TABLE public.tools ADD COLUMN IF NOT EXISTS requires_periodic_maintenance BOOLEAN DEFAULT FALSE;
ALTER TABLE public.tools ADD COLUMN IF NOT EXISTS maintenance_period TEXT DEFAULT 'trimestral';
ALTER TABLE public.tools ADD COLUMN IF NOT EXISTS maintenance_period_days INTEGER DEFAULT 90;
ALTER TABLE public.tools ADD COLUMN IF NOT EXISTS last_maintenance_date TEXT;
ALTER TABLE public.tools ADD COLUMN IF NOT EXISTS next_maintenance_date TEXT;
ALTER TABLE public.tools ADD COLUMN IF NOT EXISTS requires_periodic_testing BOOLEAN DEFAULT FALSE;
ALTER TABLE public.tools ADD COLUMN IF NOT EXISTS testing_period TEXT DEFAULT '15_dias';
ALTER TABLE public.tools ADD COLUMN IF NOT EXISTS testing_period_days INTEGER DEFAULT 15;
ALTER TABLE public.tools ADD COLUMN IF NOT EXISTS last_testing_date TEXT;
ALTER TABLE public.tools ADD COLUMN IF NOT EXISTS next_testing_date TEXT;

ALTER TABLE public.maintenances ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'media';
ALTER TABLE public.maintenances ADD COLUMN IF NOT EXISTS estimated_cost NUMERIC DEFAULT 0;
ALTER TABLE public.maintenances ADD COLUMN IF NOT EXISTS failure_description TEXT;
ALTER TABLE public.maintenances ADD COLUMN IF NOT EXISTS work_to_do TEXT;
ALTER TABLE public.maintenances ADD COLUMN IF NOT EXISTS testing_result TEXT;

-- ==============================================================================
-- POLÍTICAS DE SEGURIDAD (ROW LEVEL SECURITY - RLS)
-- Permitir acceso público con la Anon Key para frontend autónomo
-- ==============================================================================

ALTER TABLE public.company ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenances ENABLE ROW LEVEL SECURITY;

-- Crear políticas permisivas para lectura y escritura desde la aplicación web
DROP POLICY IF EXISTS "Acceso total anon company" ON public.company;
CREATE POLICY "Acceso total anon company" ON public.company FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso total anon users" ON public.users;
CREATE POLICY "Acceso total anon users" ON public.users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso total anon tools" ON public.tools;
CREATE POLICY "Acceso total anon tools" ON public.tools FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso total anon technicians" ON public.technicians;
CREATE POLICY "Acceso total anon technicians" ON public.technicians FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso total anon loans" ON public.loans;
CREATE POLICY "Acceso total anon loans" ON public.loans FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso total anon maintenances" ON public.maintenances;
CREATE POLICY "Acceso total anon maintenances" ON public.maintenances FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- ACTIVACIÓN DE SUPABASE REALTIME (WEBSOCKETS EN VIVO)
-- ==============================================================================

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.company;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tools;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.technicians;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.loans;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.maintenances;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- ==============================================================================
-- DATOS INICIALES (SEMILLA INDUSTRIAL)
-- ==============================================================================

-- Empresa inicial
INSERT INTO public.company (id, name, nit, warehouse, address, phone, manager)
VALUES ('main', 'MECATRÓNICA & CONSTRUCCIONES INDUSTRIALES S.A.', '900.854.120-4', 'Bodega Principal & Patio de Maquinaria Norte', 'Zona Industrial Calle 45 # 12-80', '+57 (601) 745-9000', 'Ing. Roberto Méndez (Jefe de Almacén)')
ON CONFLICT (id) DO NOTHING;

-- Usuarios iniciales con contraseñas cifradas SHA-256 (admin123, almacen123, consulta123)
INSERT INTO public.users (id, username, name, email, password_hash, role, active, created_at)
VALUES 
  ('usr_admin', 'admin', 'Administrador Principal', 'admin@empresa.com', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'admin', true, '2026-01-01'),
  ('usr_operador', 'operador', 'Carlos Almacén (Operador)', 'almacen@empresa.com', '7439033334ff7f5d2d164c47fe54b5819c0f7cd1225ecbc3bbac5bc80206b01f', 'almacen', true, '2026-02-10'),
  ('usr_supervisor', 'supervisor', 'Ing. Diana Gómez (Auditor)', 'auditoria@empresa.com', '7fa95c704c2defa7b1295d28bcddfd752bf9b594db18886dd64721183cfc47a5', 'consulta', true, '2026-03-05')
ON CONFLICT (id) DO NOTHING;

-- Herramientas y maquinaria de ejemplo
INSERT INTO public.tools (id, code, name, category, brand, model, serial_number, status, location, acquisition_date, cost, notes)
VALUES
  ('tool_1', 'ROT-001', 'Rotomartillo SDS-Plus 800W Profesional', 'Herramienta Eléctrica', 'DeWalt', 'D25133K', 'DW-904821', 'prestado', 'Almacén Central - Estante A1', '2025-03-15', 210, 'Incluye maletín y juego de 3 brocas de impacto'),
  ('tool_2', 'GEN-002', 'Generador Eléctrico Diésel 15 kVA Insonorizado', 'Generadores y Motores', 'Cummins', 'C15D5P', 'CM-8837190', 'disponible', 'Patio de Maquinaria - Bahía 3', '2024-11-10', 4500, 'Mantenimiento de aceite cada 250 horas de uso'),
  ('tool_3', 'MIN-003', 'Minicargador Frontal con Orugas', 'Maquinaria Pesada', 'Bobcat', 'T590', 'BC-T590-7712', 'prestado', 'Obra Autopista Oriente', '2023-08-20', 38000, 'Requiere operador certificado con licencia C2'),
  ('tool_4', 'SOL-004', 'Soldadora Inverter Multiproceso 250A', 'Soldadura', 'Lincoln Electric', 'Powercraft 250', 'LE-250-9941', 'mantenimiento', 'Taller de Mantenimiento Eléctrico', '2024-05-12', 1100, 'En revisión por recalentamiento de tarjeta de potencia'),
  ('tool_5', 'FLU-005', 'Multímetro Digital Industrial True-RMS', 'Medición y Precisión', 'Fluke', '87V Max', 'FLK-87V-4421', 'disponible', 'Almacén Central - Armario Calibrados', '2025-01-20', 580, 'Calibración certificada vigente hasta Noviembre 2026'),
  ('tool_6', 'COR-006', 'Cortadora de Concreto a Gasolina 14"', 'Maquinaria Pesada', 'Husqvarna', 'K770', 'HQ-K770-3321', 'prestado', 'Obra San Pedro', '2024-09-05', 1350, 'Filtro de aire recién reemplazado. Usa mezcla 2T 50:1'),
  ('tool_7', 'LLV-007', 'Llave de Impacto Neumática 1/2" 1350 Nm', 'Neumática', 'Ingersoll Rand', '2235TiMAX', 'IR-2235-512', 'disponible', 'Almacén Central - Estante B3', '2025-02-18', 340, 'Lubricar a diario con aceite neumático antes de cada uso'),
  ('tool_8', 'BAI-008', 'Apisonador Tipo Bailarina 4 Tiempos', 'Maquinaria Pesada', 'Wacker Neuson', 'BS50-4s', 'WN-BS50-801', 'disponible', 'Patio de Maquinaria - Bahía 1', '2024-06-30', 2900, 'Equipo clave para compactación en zanjas'),
  ('tool_9', 'ESM-009', 'Esmeriladora Angular 9" 2600W de Alta Potencia', 'Herramienta Eléctrica', 'Bosch Professional', 'GWS 26-230 LVI', 'BOSH-230-661', 'disponible', 'Almacén Central - Estante A2', '2025-04-10', 240, 'Sistema de reducción de vibración KickBack Control'),
  ('tool_10', 'LAS-010', 'Nivel Láser Autonivelante de 3 Líneas 360°', 'Medición y Precisión', 'Bosch', 'GLL 3-80 C', 'BOSH-LAS-1029', 'disponible', 'Almacén Central - Armario Calibrados', '2025-06-14', 620, 'Incluye trípode de aluminio y receptor láser'),
  ('tool_11', 'COM-011', 'Compresor de Aire Bicilíndrico 60 Galones 5 HP', 'Neumática', 'Campbell Hausfeld', 'VT6275', 'CH-60G-4410', 'mantenimiento', 'Taller Central', '2023-10-15', 1450, 'Mantenimiento preventivo anual y cambio de aceite de cabezal'),
  ('tool_12', 'AND-012', 'Juego de Andamio Multidireccional Certificado (2 Cuerpos)', 'Seguridad y Protección', 'Layher', 'Allround Steel', 'LAY-AL-2004', 'disponible', 'Bodega de Estructuras', '2024-02-11', 1200, 'Incluye 4 plataformas con escotilla y rodapiés')
ON CONFLICT (id) DO NOTHING;

-- Técnicos de ejemplo
INSERT INTO public.technicians (id, dni, name, phone, email, role, active, created_at)
VALUES
  ('tech_1', 'CC-10948271', 'Carlos Andrés Morales', '312-845-9201', 'carlos.morales@empresa.com', 'Técnico Mecánico Líder', true, '2024-01-10'),
  ('tech_2', 'CC-79845112', 'Jorge Eliécer Peña', '315-992-1450', 'jorge.pena@empresa.com', 'Operador de Maquinaria Pesada', true, '2024-02-15'),
  ('tech_3', 'CC-10178492', 'Diana Marcela Gómez', '320-641-3329', 'diana.gomez@empresa.com', 'Especialista en Instrumentación Eléctrica', true, '2024-03-01'),
  ('tech_4', 'CC-80345678', 'Mauricio Silva Rivas', '318-774-8890', 'mauricio.silva@empresa.com', 'Oficial de Obras Civiles y Estructuras', true, '2024-04-12')
ON CONFLICT (id) DO NOTHING;

-- Préstamos de ejemplo
INSERT INTO public.loans (id, voucher_number, technician_id, technician_name, technician_dni, tool_ids, tool_snapshot, loan_date, expected_return_date, actual_return_date, status, project, delivery_condition, return_condition, delivery_notes, return_notes)
VALUES
  ('loan_1', 'VAL-2026-001', 'tech_1', 'Carlos Andrés Morales', 'CC-10948271', '["tool_1"]'::jsonb, '[{"id": "tool_1", "code": "ROT-001", "name": "Rotomartillo SDS-Plus 800W Profesional", "serialNumber": "DW-904821"}]'::jsonb, '2026-08-25 08:30', '2026-09-02', null, 'activo', 'Mantenimiento Preventivo Planta Papelera San José', 'Excelente', null, 'Se entrega con juego de brocas de 1/2 y 3/8"', ''),
  ('loan_2', 'VAL-2026-002', 'tech_2', 'Jorge Eliécer Peña', 'CC-79845112', '["tool_3"]'::jsonb, '[{"id": "tool_3", "code": "MIN-003", "name": "Minicargador Frontal con Orugas", "serialNumber": "BC-T590-7712"}]'::jsonb, '2026-09-03 07:00', '2026-09-12', null, 'activo', 'Movimiento de Tierras Obra Autopista Oriente Tramo 4', 'Excelente', null, 'Tanque de combustible lleno al 100%, horómetro en 1.450 hrs.', ''),
  ('loan_3', 'VAL-2026-003', 'tech_4', 'Mauricio Silva Rivas', 'CC-80345678', '["tool_6"]'::jsonb, '[{"id": "tool_6", "code": "COR-006", "name": "Cortadora de Concreto a Gasolina 14\"", "serialNumber": "HQ-K770-3321"}]'::jsonb, '2026-09-05 09:15', '2026-09-08', null, 'activo', 'Corte de losas en Bodega San Pedro', 'Buena', null, 'Disco diamantado con 70% de vida útil restante.', '')
ON CONFLICT (id) DO NOTHING;

-- Mantenimientos de ejemplo
INSERT INTO public.maintenances (id, code, tool_id, tool_code, tool_name, type, status, scheduled_date, completed_date, provider, responsible, cost, description, work_done, parts_replaced, next_maintenance_date)
VALUES
  ('maint_1', 'MNT-2026-001', 'tool_4', 'SOL-004', 'Soldadora Inverter Multiproceso 250A', 'correctivo', 'en_proceso', '2026-09-04', null, 'Servicio Autorizado Lincoln Electric', 'Ing. Carlos Morales', 180, 'Sobrecalentamiento tras 20 min de uso continuo en obra y testigo de alarma activado', '', '', '2027-03-01'),
  ('maint_2', 'MNT-2026-002', 'tool_11', 'COM-011', 'Compresor de Aire Bicilíndrico 60 Galones 5 HP', 'preventivo', 'en_proceso', '2026-09-05', null, 'Taller de Mantenimiento Interno', 'Tec. Andrés Pérez', 65, 'Cambio anual de aceite ISO 100 de cabezal, purga de tanque y verificación de presostato', '', 'Filtro de admisión de aire, aceite sintético', '2027-09-05')
ON CONFLICT (id) DO NOTHING;

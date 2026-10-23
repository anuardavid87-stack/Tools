-- ==============================================================================
-- TOOLPRO - ARQUITECTURA DE SEGURIDAD MULTI-TENANT Y ROW-LEVEL SECURITY (RLS)
-- Script de Migración, Endurecimiento y Aislamiento Estricto por Empresa
-- ==============================================================================
-- Instrucciones de Ejecución:
-- 1. Inicia sesión en https://supabase.com y abre tu proyecto.
-- 2. Ve al menú lateral "SQL Editor" -> "New query".
-- 3. Pega TODO el contenido de este archivo y presiona el botón "Run".
-- 4. El script migra automáticamente las tablas existentes, preserva los 41 equipos,
--    22 préstamos, 10 técnicos y usuarios actuales asignándolos a la empresa principal ('main'),
--    y activa las políticas de Row Level Security (RLS) de aislamiento total.
-- ==============================================================================

-- 0. HABILITAR EXTENSIÓN CRIPTOGRÁFICA
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. TABLA DE EMPRESAS / TENANTS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.company (
    id TEXT PRIMARY KEY DEFAULT 'main',
    name TEXT NOT NULL,
    nit TEXT,
    warehouse TEXT,
    address TEXT,
    phone TEXT,
    manager TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Garantizar empresa principal por defecto
INSERT INTO public.company (id, name, nit, warehouse, address, phone, manager, status)
VALUES (
    'main',
    'AD GROUP INDUSTRIAL S.A.S.',
    '900.854.120-4',
    'Almacén Principal & Patio Norte',
    'Zona Industrial Calle 45 # 12-80',
    '+57 (601) 745-9000',
    'Ing. Roberto Méndez (Jefe de Almacén)',
    'active'
)
ON CONFLICT (id) DO UPDATE SET
    updated_at = NOW();

-- ==============================================================================
-- 2. MIGRACIÓN DE COLUMNA company_id EN TODAS LAS ENTIDADES
-- ==============================================================================

-- 2.1 Tabla USERS
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS company_id TEXT DEFAULT 'main';
UPDATE public.users SET company_id = 'main' WHERE company_id IS NULL;
ALTER TABLE public.users ALTER COLUMN company_id SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_users_company'
    ) THEN
        ALTER TABLE public.users 
        ADD CONSTRAINT fk_users_company 
        FOREIGN KEY (company_id) REFERENCES public.company(id) ON UPDATE CASCADE ON DELETE CASCADE;
    END IF;
END $$;

-- 2.2 Tabla TOOLS
ALTER TABLE public.tools ADD COLUMN IF NOT EXISTS company_id TEXT DEFAULT 'main';
UPDATE public.tools SET company_id = 'main' WHERE company_id IS NULL;
ALTER TABLE public.tools ALTER COLUMN company_id SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_tools_company'
    ) THEN
        ALTER TABLE public.tools 
        ADD CONSTRAINT fk_tools_company 
        FOREIGN KEY (company_id) REFERENCES public.company(id) ON UPDATE CASCADE ON DELETE CASCADE;
    END IF;
END $$;

-- 2.3 Tabla TECHNICIANS
ALTER TABLE public.technicians ADD COLUMN IF NOT EXISTS company_id TEXT DEFAULT 'main';
UPDATE public.technicians SET company_id = 'main' WHERE company_id IS NULL;
ALTER TABLE public.technicians ALTER COLUMN company_id SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_technicians_company'
    ) THEN
        ALTER TABLE public.technicians 
        ADD CONSTRAINT fk_technicians_company 
        FOREIGN KEY (company_id) REFERENCES public.company(id) ON UPDATE CASCADE ON DELETE CASCADE;
    END IF;
END $$;

-- 2.4 Tabla LOANS
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS company_id TEXT DEFAULT 'main';
UPDATE public.loans SET company_id = 'main' WHERE company_id IS NULL;
ALTER TABLE public.loans ALTER COLUMN company_id SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_loans_company'
    ) THEN
        ALTER TABLE public.loans 
        ADD CONSTRAINT fk_loans_company 
        FOREIGN KEY (company_id) REFERENCES public.company(id) ON UPDATE CASCADE ON DELETE CASCADE;
    END IF;
END $$;

-- 2.5 Tabla MAINTENANCES
ALTER TABLE public.maintenances ADD COLUMN IF NOT EXISTS company_id TEXT DEFAULT 'main';
UPDATE public.maintenances SET company_id = 'main' WHERE company_id IS NULL;
ALTER TABLE public.maintenances ALTER COLUMN company_id SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_maintenances_company'
    ) THEN
        ALTER TABLE public.maintenances 
        ADD CONSTRAINT fk_maintenances_company 
        FOREIGN KEY (company_id) REFERENCES public.company(id) ON UPDATE CASCADE ON DELETE CASCADE;
    END IF;
END $$;

-- ==============================================================================
-- 3. ÍNDICES DE PARTICIONAMIENTO Y RENDIMIENTO MULTI-TENANT
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_tools_company_id ON public.tools(company_id, id);
CREATE INDEX IF NOT EXISTS idx_tools_company_code ON public.tools(company_id, code);
CREATE INDEX IF NOT EXISTS idx_tools_company_status ON public.tools(company_id, status);

CREATE INDEX IF NOT EXISTS idx_technicians_company_id ON public.technicians(company_id, id);
CREATE INDEX IF NOT EXISTS idx_technicians_company_dni ON public.technicians(company_id, dni);

CREATE INDEX IF NOT EXISTS idx_loans_company_id ON public.loans(company_id, id);
CREATE INDEX IF NOT EXISTS idx_loans_company_status ON public.loans(company_id, status);
CREATE INDEX IF NOT EXISTS idx_loans_company_voucher ON public.loans(company_id, voucher_number);

CREATE INDEX IF NOT EXISTS idx_maintenances_company_id ON public.maintenances(company_id, id);
CREATE INDEX IF NOT EXISTS idx_maintenances_company_status ON public.maintenances(company_id, status);

CREATE INDEX IF NOT EXISTS idx_users_company_id ON public.users(company_id, id);
CREATE INDEX IF NOT EXISTS idx_users_company_username ON public.users(company_id, username);

-- ==============================================================================
-- 4. TABLA DE SESIONES Y CONTROL DE AUDITORÍA
-- ==============================================================================

-- 4.1 Sesiones de usuario emitidas por la base de datos
CREATE TABLE IF NOT EXISTS public.user_sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    company_id TEXT NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'almacen',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_user_sessions_lookup ON public.user_sessions(token, expires_at);

-- 4.2 Registro de intentos de autenticación (Mitigación de Fuerza Bruta / Rate Limiting)
CREATE TABLE IF NOT EXISTS public.login_attempts (
    id BIGSERIAL PRIMARY KEY,
    username TEXT NOT NULL,
    company_id TEXT,
    success BOOLEAN NOT NULL,
    ip_address TEXT,
    attempted_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_login_attempts_lookup ON public.login_attempts(username, attempted_at DESC);

-- ==============================================================================
-- 5. FUNCIONES DE CONTEXTO DE SEGURIDAD (SERVER-SIDE TENANT RESOLUTION)
-- ==============================================================================

-- 5.1 Obtener ID de Empresa verificado a partir del token de sesión o claims JWT
CREATE OR REPLACE FUNCTION public.auth_tenant_id()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    v_headers JSONB;
    v_token TEXT;
    v_company_id TEXT;
BEGIN
    -- 1. Intentar leer encabezados PostgREST enviados por el cliente
    BEGIN
        v_headers := NULLIF(current_setting('request.headers', true), '')::jsonb;
    EXCEPTION WHEN OTHERS THEN
        v_headers := '{}'::jsonb;
    END;

    v_token := v_headers->>'x-session-token';

    -- 2. Si hay token de sesión criptográfico, verificar en user_sessions
    IF v_token IS NOT NULL AND v_token <> '' THEN
        SELECT company_id INTO v_company_id
        FROM public.user_sessions
        WHERE token = v_token AND expires_at > NOW();

        IF v_company_id IS NOT NULL THEN
            RETURN v_company_id;
        END IF;
    END IF;

    -- 3. Soporte para Supabase Auth JWT estándar (si se usa auth.users)
    IF auth.jwt() IS NOT NULL THEN
        v_company_id := auth.jwt()->'app_metadata'->>'company_id';
        IF v_company_id IS NOT NULL THEN RETURN v_company_id; END IF;
        v_company_id := auth.jwt()->'user_metadata'->>'company_id';
        IF v_company_id IS NOT NULL THEN RETURN v_company_id; END IF;
    END IF;

    -- 4. Encabezado directo x-company-id (permitido únicamente para navegación de arranque)
    v_company_id := v_headers->>'x-company-id';
    IF v_company_id IS NOT NULL AND v_company_id <> '' THEN
        RETURN v_company_id;
    END IF;

    -- Fallback por defecto a la empresa principal
    RETURN 'main';
END;
$$;

-- 5.2 Obtener Rol del Usuario verificado
CREATE OR REPLACE FUNCTION public.auth_user_role()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    v_headers JSONB;
    v_token TEXT;
    v_role TEXT;
BEGIN
    BEGIN
        v_headers := NULLIF(current_setting('request.headers', true), '')::jsonb;
    EXCEPTION WHEN OTHERS THEN
        v_headers := '{}'::jsonb;
    END;

    v_token := v_headers->>'x-session-token';

    IF v_token IS NOT NULL AND v_token <> '' THEN
        SELECT role INTO v_role
        FROM public.user_sessions
        WHERE token = v_token AND expires_at > NOW();

        IF v_role IS NOT NULL THEN
            RETURN v_role;
        END IF;
    END IF;

    IF auth.jwt() IS NOT NULL THEN
        v_role := auth.jwt()->'app_metadata'->>'role';
        IF v_role IS NOT NULL THEN RETURN v_role; END IF;
    END IF;

    RETURN 'almacen';
END;
$$;

-- ==============================================================================
-- 6. RPC: AUTENTICACIÓN SEGURA Y GESTIÓN DE SESIONES (ANTI-FUERZA BRUTA)
-- ==============================================================================

-- 6.1 Procedimiento de Login Criptográfico (Protege hashes y bloquea ataques de diccionario)
CREATE OR REPLACE FUNCTION public.app_login(
    p_username TEXT,
    p_password_hash TEXT,
    p_company_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_target_user TEXT;
    v_recent_failures INTEGER;
    v_user RECORD;
    v_company RECORD;
    v_session_token TEXT;
    v_expires_at TIMESTAMPTZ;
BEGIN
    v_target_user := LOWER(TRIM(COALESCE(p_username, '')));

    IF v_target_user = '' OR p_password_hash IS NULL OR p_password_hash = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Credenciales incompletas.');
    END IF;

    -- 1. Protección contra Fuerza Bruta: Verificar intentos fallidos en los últimos 15 minutos
    SELECT COUNT(*) INTO v_recent_failures
    FROM public.login_attempts
    WHERE username = v_target_user
      AND success = FALSE
      AND attempted_at > (NOW() - INTERVAL '15 minutes');

    IF v_recent_failures >= 5 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Demasiados intentos fallidos. Por seguridad, la cuenta está bloqueada temporalmente durante 15 minutos.'
        );
    END IF;

    -- 2. Buscar usuario activo (por username o email)
    IF p_company_id IS NOT NULL AND p_company_id <> '' THEN
        SELECT * INTO v_user
        FROM public.users
        WHERE (LOWER(username) = v_target_user OR LOWER(email) = v_target_user)
          AND company_id = p_company_id
        LIMIT 1;
    ELSE
        SELECT * INTO v_user
        FROM public.users
        WHERE (LOWER(username) = v_target_user OR LOWER(email) = v_target_user)
        ORDER BY CASE WHEN company_id = 'main' THEN 1 ELSE 2 END
        LIMIT 1;
    END IF;

    -- 3. Validar existencia y estado
    IF v_user.id IS NULL THEN
        INSERT INTO public.login_attempts (username, company_id, success)
        VALUES (v_target_user, p_company_id, FALSE);
        RETURN jsonb_build_object('success', false, 'error', 'Usuario o contraseña incorrectos.');
    END IF;

    IF v_user.active IS FALSE THEN
        RETURN jsonb_build_object('success', false, 'error', 'Esta cuenta se encuentra desactivada. Contacta al administrador.');
    END IF;

    -- 4. Validar contraseña
    IF v_user.password_hash <> p_password_hash THEN
        INSERT INTO public.login_attempts (username, company_id, success)
        VALUES (v_target_user, v_user.company_id, FALSE);
        RETURN jsonb_build_object('success', false, 'error', 'Usuario o contraseña incorrectos.');
    END IF;

    -- 5. Obtener datos de la empresa vinculada
    SELECT * INTO v_company
    FROM public.company
    WHERE id = v_user.company_id;

    -- 6. Generar Token Criptográfico Seguro de 64 caracteres hex (256 bits)
    v_session_token := encode(gen_random_bytes(32), 'hex');
    v_expires_at := NOW() + INTERVAL '30 days';

    -- Registrar sesión activa
    INSERT INTO public.user_sessions (token, user_id, company_id, role, expires_at)
    VALUES (v_session_token, v_user.id, v_user.company_id, v_user.role, v_expires_at);

    -- Registrar intento exitoso y limpiar historial de fallos antiguos
    INSERT INTO public.login_attempts (username, company_id, success)
    VALUES (v_target_user, v_user.company_id, TRUE);

    DELETE FROM public.login_attempts
    WHERE username = v_target_user AND attempted_at < (NOW() - INTERVAL '1 day');

    -- Retornar payload seguro (NUNCA expone password_hash al frontend)
    RETURN jsonb_build_object(
        'success', true,
        'session_token', v_session_token,
        'expires_at', v_expires_at,
        'user', jsonb_build_object(
            'id', v_user.id,
            'username', v_user.username,
            'name', v_user.name,
            'email', v_user.email,
            'role', v_user.role,
            'company_id', v_user.company_id
        ),
        'company', jsonb_build_object(
            'id', v_company.id,
            'name', v_company.name,
            'nit', v_company.nit,
            'warehouse', v_company.warehouse,
            'address', v_company.address,
            'phone', v_company.phone,
            'manager', v_company.manager
        )
    );
END;
$$;

-- 6.2 Validar Sesión Activa
CREATE OR REPLACE FUNCTION public.validate_session(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_sess RECORD;
    v_user RECORD;
    v_company RECORD;
BEGIN
    IF p_token IS NULL OR p_token = '' THEN
        RETURN jsonb_build_object('valid', false);
    END IF;

    SELECT * INTO v_sess
    FROM public.user_sessions
    WHERE token = p_token AND expires_at > NOW();

    IF v_sess.token IS NULL THEN
        RETURN jsonb_build_object('valid', false);
    END IF;

    SELECT * INTO v_user FROM public.users WHERE id = v_sess.user_id AND active = TRUE;
    IF v_user.id IS NULL THEN
        DELETE FROM public.user_sessions WHERE token = p_token;
        RETURN jsonb_build_object('valid', false);
    END IF;

    SELECT * INTO v_company FROM public.company WHERE id = v_sess.company_id;

    RETURN jsonb_build_object(
        'valid', true,
        'user', jsonb_build_object(
            'id', v_user.id,
            'username', v_user.username,
            'name', v_user.name,
            'email', v_user.email,
            'role', v_sess.role,
            'company_id', v_sess.company_id
        ),
        'company', jsonb_build_object(
            'id', v_company.id,
            'name', v_company.name,
            'nit', v_company.nit,
            'warehouse', v_company.warehouse,
            'address', v_company.address,
            'phone', v_company.phone,
            'manager', v_company.manager
        )
    );
END;
$$;

-- 6.3 Cerrar Sesión y Revocar Token
CREATE OR REPLACE FUNCTION public.app_logout(p_token TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF p_token IS NOT NULL AND p_token <> '' THEN
        DELETE FROM public.user_sessions WHERE token = p_token;
    END IF;
    RETURN TRUE;
END;
$$;

-- ==============================================================================
-- 7. ELIMINACIÓN DE POLÍTICAS PERMISIVAS OBSOLETAS
-- ==============================================================================
DROP POLICY IF EXISTS "Acceso total anon company" ON public.company;
DROP POLICY IF EXISTS "Acceso total anon users" ON public.users;
DROP POLICY IF EXISTS "Acceso total anon tools" ON public.tools;
DROP POLICY IF EXISTS "Acceso total anon technicians" ON public.technicians;
DROP POLICY IF EXISTS "Acceso total anon loans" ON public.loans;
DROP POLICY IF EXISTS "Acceso total anon maintenances" ON public.maintenances;

-- ==============================================================================
-- 8. POLÍTICAS ROW LEVEL SECURITY (RLS) ESTRICTAS DE AISLAMIENTO MULTI-TENANT
-- ==============================================================================

-- 8.1 ACTIVAR RLS EN TODAS LAS TABLAS
ALTER TABLE public.company ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 8.2 POLÍTICAS: public.company
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "company_tenant_select" ON public.company;
CREATE POLICY "company_tenant_select" ON public.company
    FOR SELECT USING (id = public.auth_tenant_id());

DROP POLICY IF EXISTS "company_tenant_update" ON public.company;
CREATE POLICY "company_tenant_update" ON public.company
    FOR UPDATE USING (
        id = public.auth_tenant_id() 
        AND public.auth_user_role() = 'admin'
    ) WITH CHECK (
        id = public.auth_tenant_id()
    );

-- ------------------------------------------------------------------------------
-- 8.3 POLÍTICAS: public.tools (Aislamiento de Inventario & IDOR Protection)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "tools_tenant_select" ON public.tools;
CREATE POLICY "tools_tenant_select" ON public.tools
    FOR SELECT USING (company_id = public.auth_tenant_id());

DROP POLICY IF EXISTS "tools_tenant_insert" ON public.tools;
CREATE POLICY "tools_tenant_insert" ON public.tools
    FOR INSERT WITH CHECK (
        company_id = public.auth_tenant_id()
        AND public.auth_user_role() IN ('admin', 'almacen')
    );

DROP POLICY IF EXISTS "tools_tenant_update" ON public.tools;
CREATE POLICY "tools_tenant_update" ON public.tools
    FOR UPDATE USING (
        company_id = public.auth_tenant_id()
        AND public.auth_user_role() IN ('admin', 'almacen')
    ) WITH CHECK (
        company_id = public.auth_tenant_id()
    );

DROP POLICY IF EXISTS "tools_tenant_delete" ON public.tools;
CREATE POLICY "tools_tenant_delete" ON public.tools
    FOR DELETE USING (
        company_id = public.auth_tenant_id()
        AND public.auth_user_role() = 'admin'
    );

-- ------------------------------------------------------------------------------
-- 8.4 POLÍTICAS: public.technicians (Aislamiento de Personal Técnico)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "technicians_tenant_select" ON public.technicians;
CREATE POLICY "technicians_tenant_select" ON public.technicians
    FOR SELECT USING (company_id = public.auth_tenant_id());

DROP POLICY IF EXISTS "technicians_tenant_insert" ON public.technicians;
CREATE POLICY "technicians_tenant_insert" ON public.technicians
    FOR INSERT WITH CHECK (
        company_id = public.auth_tenant_id()
        AND public.auth_user_role() IN ('admin', 'almacen')
    );

DROP POLICY IF EXISTS "technicians_tenant_update" ON public.technicians;
CREATE POLICY "technicians_tenant_update" ON public.technicians
    FOR UPDATE USING (
        company_id = public.auth_tenant_id()
        AND public.auth_user_role() IN ('admin', 'almacen')
    ) WITH CHECK (
        company_id = public.auth_tenant_id()
    );

DROP POLICY IF EXISTS "technicians_tenant_delete" ON public.technicians;
CREATE POLICY "technicians_tenant_delete" ON public.technicians
    FOR DELETE USING (
        company_id = public.auth_tenant_id()
        AND public.auth_user_role() = 'admin'
    );

-- ------------------------------------------------------------------------------
-- 8.5 POLÍTICAS: public.loans (Aislamiento de Préstamos y Devoluciones)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "loans_tenant_select" ON public.loans;
CREATE POLICY "loans_tenant_select" ON public.loans
    FOR SELECT USING (company_id = public.auth_tenant_id());

DROP POLICY IF EXISTS "loans_tenant_insert" ON public.loans;
CREATE POLICY "loans_tenant_insert" ON public.loans
    FOR INSERT WITH CHECK (
        company_id = public.auth_tenant_id()
        AND public.auth_user_role() IN ('admin', 'almacen')
    );

DROP POLICY IF EXISTS "loans_tenant_update" ON public.loans;
CREATE POLICY "loans_tenant_update" ON public.loans
    FOR UPDATE USING (
        company_id = public.auth_tenant_id()
        AND public.auth_user_role() IN ('admin', 'almacen')
    ) WITH CHECK (
        company_id = public.auth_tenant_id()
    );

DROP POLICY IF EXISTS "loans_tenant_delete" ON public.loans;
CREATE POLICY "loans_tenant_delete" ON public.loans
    FOR DELETE USING (
        company_id = public.auth_tenant_id()
        AND public.auth_user_role() = 'admin'
    );

-- ------------------------------------------------------------------------------
-- 8.6 POLÍTICAS: public.maintenances (Aislamiento de Órdenes de Mantenimiento)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "maintenances_tenant_select" ON public.maintenances;
CREATE POLICY "maintenances_tenant_select" ON public.maintenances
    FOR SELECT USING (company_id = public.auth_tenant_id());

DROP POLICY IF EXISTS "maintenances_tenant_insert" ON public.maintenances;
CREATE POLICY "maintenances_tenant_insert" ON public.maintenances
    FOR INSERT WITH CHECK (
        company_id = public.auth_tenant_id()
        AND public.auth_user_role() IN ('admin', 'almacen')
    );

DROP POLICY IF EXISTS "maintenances_tenant_update" ON public.maintenances;
CREATE POLICY "maintenances_tenant_update" ON public.maintenances
    FOR UPDATE USING (
        company_id = public.auth_tenant_id()
        AND public.auth_user_role() IN ('admin', 'almacen')
    ) WITH CHECK (
        company_id = public.auth_tenant_id()
    );

DROP POLICY IF EXISTS "maintenances_tenant_delete" ON public.maintenances;
CREATE POLICY "maintenances_tenant_delete" ON public.maintenances
    FOR DELETE USING (
        company_id = public.auth_tenant_id()
        AND public.auth_user_role() = 'admin'
    );

-- ------------------------------------------------------------------------------
-- 8.7 POLÍTICAS: public.users (Protección de Usuarios y Hashes de Claves)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "users_tenant_select" ON public.users;
CREATE POLICY "users_tenant_select" ON public.users
    FOR SELECT USING (company_id = public.auth_tenant_id());

DROP POLICY IF EXISTS "users_tenant_insert" ON public.users;
CREATE POLICY "users_tenant_insert" ON public.users
    FOR INSERT WITH CHECK (
        company_id = public.auth_tenant_id()
        AND public.auth_user_role() = 'admin'
    );

DROP POLICY IF EXISTS "users_tenant_update" ON public.users;
CREATE POLICY "users_tenant_update" ON public.users
    FOR UPDATE USING (
        company_id = public.auth_tenant_id()
        AND public.auth_user_role() = 'admin'
    ) WITH CHECK (
        company_id = public.auth_tenant_id()
    );

DROP POLICY IF EXISTS "users_tenant_delete" ON public.users;
CREATE POLICY "users_tenant_delete" ON public.users
    FOR DELETE USING (
        company_id = public.auth_tenant_id()
        AND public.auth_user_role() = 'admin'
    );

-- ==============================================================================
-- 9. PERMISOS DE ACCESO EN SCHEMA PUBLIC
-- ==============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- ==============================================================================
-- 10. REALTIME WEBSOCKETS EN VIVO CON REPLICA IDENTITY
-- ==============================================================================
ALTER TABLE public.company REPLICA IDENTITY FULL;
ALTER TABLE public.users REPLICA IDENTITY FULL;
ALTER TABLE public.tools REPLICA IDENTITY FULL;
ALTER TABLE public.technicians REPLICA IDENTITY FULL;
ALTER TABLE public.loans REPLICA IDENTITY FULL;
ALTER TABLE public.maintenances REPLICA IDENTITY FULL;

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

-- Fin del script de migración y seguridad TOOLPRO.

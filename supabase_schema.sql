-- ==============================================================================
-- TOOLPRO - SCHEMA OFICIAL MULTI-TENANT & ROW LEVEL SECURITY (RLS)
-- Base de Datos PostgreSQL en Supabase para Múltiples Empresas Autónomas
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. TABLA: EMPRESAS / ORGANIZACIONES (TENANTS)
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

-- 2. TABLA: USUARIOS Y ACCESOS (PARTICIONADO POR EMPRESA)
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL DEFAULT 'main' REFERENCES public.company(id) ON UPDATE CASCADE ON DELETE CASCADE,
    username TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'almacen', -- 'admin', 'almacen', 'consulta'
    active BOOLEAN DEFAULT TRUE,
    created_at TEXT DEFAULT TO_CHAR(NOW(), 'YYYY-MM-DD'),
    CONSTRAINT uq_company_username UNIQUE (company_id, username)
);

-- 3. TABLA: HERRAMIENTAS Y MAQUINARIA (PARTICIONADO POR EMPRESA)
CREATE TABLE IF NOT EXISTS public.tools (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL DEFAULT 'main' REFERENCES public.company(id) ON UPDATE CASCADE ON DELETE CASCADE,
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
    requires_periodic_maintenance BOOLEAN DEFAULT FALSE,
    maintenance_period TEXT DEFAULT 'trimestral',
    maintenance_period_days INTEGER DEFAULT 90,
    last_maintenance_date TEXT,
    next_maintenance_date TEXT,
    requires_periodic_testing BOOLEAN DEFAULT FALSE,
    testing_period TEXT DEFAULT '15_dias',
    testing_period_days INTEGER DEFAULT 15,
    last_testing_date TEXT,
    next_testing_date TEXT,
    created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
);

-- 4. TABLA: PERSONAL TÉCNICO Y OPERADORES
CREATE TABLE IF NOT EXISTS public.technicians (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL DEFAULT 'main' REFERENCES public.company(id) ON UPDATE CASCADE ON DELETE CASCADE,
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
    company_id TEXT NOT NULL DEFAULT 'main' REFERENCES public.company(id) ON UPDATE CASCADE ON DELETE CASCADE,
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

-- 6. TABLA: GESTIÓN DE MANTENIMIENTOS Y ÓRDENES DE TALLER
CREATE TABLE IF NOT EXISTS public.maintenances (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL DEFAULT 'main' REFERENCES public.company(id) ON UPDATE CASCADE ON DELETE CASCADE,
    code TEXT NOT NULL,
    tool_id TEXT,
    tool_code TEXT,
    tool_name TEXT,
    type TEXT DEFAULT 'preventivo', -- 'preventivo', 'correctivo', 'prueba', 'calentamiento'
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
    testing_result TEXT, -- 'satisfactorio', 'fallido', 'con_novedad'
    created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
);

-- 7. TABLA DE SESIONES ACTIVAS
CREATE TABLE IF NOT EXISTS public.user_sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    company_id TEXT NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'almacen',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

-- 8. TABLA DE AUDITORÍA Y PROTECCIÓN CONTRA FUERZA BRUTA
CREATE TABLE IF NOT EXISTS public.login_attempts (
    id BIGSERIAL PRIMARY KEY,
    username TEXT NOT NULL,
    company_id TEXT,
    success BOOLEAN NOT NULL,
    ip_address TEXT,
    attempted_at TIMESTAMPTZ DEFAULT NOW()
);

-- ÍNDICES COMPUESTOS MULTI-TENANT
CREATE INDEX IF NOT EXISTS idx_tools_tenant ON public.tools(company_id, id);
CREATE INDEX IF NOT EXISTS idx_tools_code ON public.tools(company_id, code);
CREATE INDEX IF NOT EXISTS idx_loans_tenant ON public.loans(company_id, id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON public.loans(company_id, status);
CREATE INDEX IF NOT EXISTS idx_maints_tenant ON public.maintenances(company_id, id);
CREATE INDEX IF NOT EXISTS idx_techs_tenant ON public.technicians(company_id, id);
CREATE INDEX IF NOT EXISTS idx_users_tenant ON public.users(company_id, id);
CREATE INDEX IF NOT EXISTS idx_sessions_lookup ON public.user_sessions(token, expires_at);

-- ==============================================================================
-- FUNCIONES DE SEGURIDAD SERVER-SIDE
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.auth_tenant_id()
RETURNS TEXT LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
    v_headers JSONB;
    v_token TEXT;
    v_company_id TEXT;
BEGIN
    BEGIN
        v_headers := NULLIF(current_setting('request.headers', true), '')::jsonb;
    EXCEPTION WHEN OTHERS THEN
        v_headers := '{}'::jsonb;
    END;

    v_token := v_headers->>'x-session-token';

    IF v_token IS NOT NULL AND v_token <> '' THEN
        SELECT company_id INTO v_company_id
        FROM public.user_sessions
        WHERE token = v_token AND expires_at > NOW();

        IF v_company_id IS NOT NULL THEN
            RETURN v_company_id;
        END IF;
    END IF;

    IF auth.jwt() IS NOT NULL THEN
        v_company_id := auth.jwt()->'app_metadata'->>'company_id';
        IF v_company_id IS NOT NULL THEN RETURN v_company_id; END IF;
        v_company_id := auth.jwt()->'user_metadata'->>'company_id';
        IF v_company_id IS NOT NULL THEN RETURN v_company_id; END IF;
    END IF;

    v_company_id := v_headers->>'x-company-id';
    IF v_company_id IS NOT NULL AND v_company_id <> '' THEN
        RETURN v_company_id;
    END IF;

    RETURN 'main';
END;
$$;

CREATE OR REPLACE FUNCTION public.auth_user_role()
RETURNS TEXT LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
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

-- AUTENTICACIÓN SEGURA (app_login)
CREATE OR REPLACE FUNCTION public.app_login(
    p_username TEXT,
    p_password_hash TEXT,
    p_company_id TEXT DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
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

    -- Brute force check (5 fallos en 15 min)
    SELECT COUNT(*) INTO v_recent_failures
    FROM public.login_attempts
    WHERE username = v_target_user
      AND success = FALSE
      AND attempted_at > (NOW() - INTERVAL '15 minutes');

    IF v_recent_failures >= 5 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Demasiados intentos fallidos. Cuenta bloqueada temporalmente durante 15 minutos.'
        );
    END IF;

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

    IF v_user.id IS NULL THEN
        INSERT INTO public.login_attempts (username, company_id, success)
        VALUES (v_target_user, p_company_id, FALSE);
        RETURN jsonb_build_object('success', false, 'error', 'Usuario o contraseña incorrectos.');
    END IF;

    IF v_user.active IS FALSE THEN
        RETURN jsonb_build_object('success', false, 'error', 'Esta cuenta está desactivada.');
    END IF;

    IF v_user.password_hash <> p_password_hash THEN
        INSERT INTO public.login_attempts (username, company_id, success)
        VALUES (v_target_user, v_user.company_id, FALSE);
        RETURN jsonb_build_object('success', false, 'error', 'Usuario o contraseña incorrectos.');
    END IF;

    SELECT * INTO v_company FROM public.company WHERE id = v_user.company_id;

    v_session_token := encode(gen_random_bytes(32), 'hex');
    v_expires_at := NOW() + INTERVAL '30 days';

    INSERT INTO public.user_sessions (token, user_id, company_id, role, expires_at)
    VALUES (v_session_token, v_user.id, v_user.company_id, v_user.role, v_expires_at);

    INSERT INTO public.login_attempts (username, company_id, success)
    VALUES (v_target_user, v_user.company_id, TRUE);

    DELETE FROM public.login_attempts
    WHERE username = v_target_user AND attempted_at < (NOW() - INTERVAL '1 day');

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

-- VALIDACIÓN Y LOGOUT
CREATE OR REPLACE FUNCTION public.validate_session(p_token TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_sess RECORD;
    v_user RECORD;
    v_company RECORD;
BEGIN
    IF p_token IS NULL OR p_token = '' THEN
        RETURN jsonb_build_object('valid', false);
    END IF;

    SELECT * INTO v_sess FROM public.user_sessions WHERE token = p_token AND expires_at > NOW();
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

CREATE OR REPLACE FUNCTION public.app_logout(p_token TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF p_token IS NOT NULL AND p_token <> '' THEN
        DELETE FROM public.user_sessions WHERE token = p_token;
    END IF;
    RETURN TRUE;
END;
$$;

-- ==============================================================================
-- POLÍTICAS ROW LEVEL SECURITY (RLS) ESTRICTAS
-- ==============================================================================

ALTER TABLE public.company ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- company
DROP POLICY IF EXISTS "company_tenant_select" ON public.company;
CREATE POLICY "company_tenant_select" ON public.company FOR SELECT USING (id = public.auth_tenant_id());

DROP POLICY IF EXISTS "company_tenant_update" ON public.company;
CREATE POLICY "company_tenant_update" ON public.company FOR UPDATE USING (id = public.auth_tenant_id() AND public.auth_user_role() = 'admin') WITH CHECK (id = public.auth_tenant_id());

-- tools
DROP POLICY IF EXISTS "tools_tenant_select" ON public.tools;
CREATE POLICY "tools_tenant_select" ON public.tools FOR SELECT USING (company_id = public.auth_tenant_id());

DROP POLICY IF EXISTS "tools_tenant_insert" ON public.tools;
CREATE POLICY "tools_tenant_insert" ON public.tools FOR INSERT WITH CHECK (company_id = public.auth_tenant_id() AND public.auth_user_role() IN ('admin', 'almacen'));

DROP POLICY IF EXISTS "tools_tenant_update" ON public.tools;
CREATE POLICY "tools_tenant_update" ON public.tools FOR UPDATE USING (company_id = public.auth_tenant_id() AND public.auth_user_role() IN ('admin', 'almacen')) WITH CHECK (company_id = public.auth_tenant_id());

DROP POLICY IF EXISTS "tools_tenant_delete" ON public.tools;
CREATE POLICY "tools_tenant_delete" ON public.tools FOR DELETE USING (company_id = public.auth_tenant_id() AND public.auth_user_role() = 'admin');

-- technicians
DROP POLICY IF EXISTS "technicians_tenant_select" ON public.technicians;
CREATE POLICY "technicians_tenant_select" ON public.technicians FOR SELECT USING (company_id = public.auth_tenant_id());

DROP POLICY IF EXISTS "technicians_tenant_insert" ON public.technicians;
CREATE POLICY "technicians_tenant_insert" ON public.technicians FOR INSERT WITH CHECK (company_id = public.auth_tenant_id() AND public.auth_user_role() IN ('admin', 'almacen'));

DROP POLICY IF EXISTS "technicians_tenant_update" ON public.technicians;
CREATE POLICY "technicians_tenant_update" ON public.technicians FOR UPDATE USING (company_id = public.auth_tenant_id() AND public.auth_user_role() IN ('admin', 'almacen')) WITH CHECK (company_id = public.auth_tenant_id());

DROP POLICY IF EXISTS "technicians_tenant_delete" ON public.technicians;
CREATE POLICY "technicians_tenant_delete" ON public.technicians FOR DELETE USING (company_id = public.auth_tenant_id() AND public.auth_user_role() = 'admin');

-- loans
DROP POLICY IF EXISTS "loans_tenant_select" ON public.loans;
CREATE POLICY "loans_tenant_select" ON public.loans FOR SELECT USING (company_id = public.auth_tenant_id());

DROP POLICY IF EXISTS "loans_tenant_insert" ON public.loans;
CREATE POLICY "loans_tenant_insert" ON public.loans FOR INSERT WITH CHECK (company_id = public.auth_tenant_id() AND public.auth_user_role() IN ('admin', 'almacen'));

DROP POLICY IF EXISTS "loans_tenant_update" ON public.loans;
CREATE POLICY "loans_tenant_update" ON public.loans FOR UPDATE USING (company_id = public.auth_tenant_id() AND public.auth_user_role() IN ('admin', 'almacen')) WITH CHECK (company_id = public.auth_tenant_id());

DROP POLICY IF EXISTS "loans_tenant_delete" ON public.loans;
CREATE POLICY "loans_tenant_delete" ON public.loans FOR DELETE USING (company_id = public.auth_tenant_id() AND public.auth_user_role() = 'admin');

-- maintenances
DROP POLICY IF EXISTS "maintenances_tenant_select" ON public.maintenances;
CREATE POLICY "maintenances_tenant_select" ON public.maintenances FOR SELECT USING (company_id = public.auth_tenant_id());

DROP POLICY IF EXISTS "maintenances_tenant_insert" ON public.maintenances;
CREATE POLICY "maintenances_tenant_insert" ON public.maintenances FOR INSERT WITH CHECK (company_id = public.auth_tenant_id() AND public.auth_user_role() IN ('admin', 'almacen'));

DROP POLICY IF EXISTS "maintenances_tenant_update" ON public.maintenances;
CREATE POLICY "maintenances_tenant_update" ON public.maintenances FOR UPDATE USING (company_id = public.auth_tenant_id() AND public.auth_user_role() IN ('admin', 'almacen')) WITH CHECK (company_id = public.auth_tenant_id());

DROP POLICY IF EXISTS "maintenances_tenant_delete" ON public.maintenances;
CREATE POLICY "maintenances_tenant_delete" ON public.maintenances FOR DELETE USING (company_id = public.auth_tenant_id() AND public.auth_user_role() = 'admin');

-- users
DROP POLICY IF EXISTS "users_tenant_select" ON public.users;
CREATE POLICY "users_tenant_select" ON public.users FOR SELECT USING (company_id = public.auth_tenant_id());

DROP POLICY IF EXISTS "users_tenant_insert" ON public.users;
CREATE POLICY "users_tenant_insert" ON public.users FOR INSERT WITH CHECK (company_id = public.auth_tenant_id() AND public.auth_user_role() = 'admin');

DROP POLICY IF EXISTS "users_tenant_update" ON public.users;
CREATE POLICY "users_tenant_update" ON public.users FOR UPDATE USING (company_id = public.auth_tenant_id() AND public.auth_user_role() = 'admin') WITH CHECK (company_id = public.auth_tenant_id());

DROP POLICY IF EXISTS "users_tenant_delete" ON public.users;
CREATE POLICY "users_tenant_delete" ON public.users FOR DELETE USING (company_id = public.auth_tenant_id() AND public.auth_user_role() = 'admin');

-- PERMISOS
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- REALTIME REPLICA
ALTER TABLE public.company REPLICA IDENTITY FULL;
ALTER TABLE public.users REPLICA IDENTITY FULL;
ALTER TABLE public.tools REPLICA IDENTITY FULL;
ALTER TABLE public.technicians REPLICA IDENTITY FULL;
ALTER TABLE public.loans REPLICA IDENTITY FULL;
ALTER TABLE public.maintenances REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.company; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.users; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.tools; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.technicians; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.loans; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.maintenances; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

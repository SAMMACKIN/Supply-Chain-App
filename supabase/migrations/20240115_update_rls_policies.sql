-- Update RLS policies for quotas table
DROP POLICY IF EXISTS "Enable read access for all users" ON public.quotas;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.quotas;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.quotas;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.quotas;

-- Quotas: All authenticated users can read
CREATE POLICY "Authenticated users can read quotas" ON public.quotas
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Quotas: Only OPS, TRADE, PLANNER, ADMIN can insert
CREATE POLICY "Authorized roles can insert quotas" ON public.quotas
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid() 
      AND role IN ('OPS', 'TRADE', 'PLANNER', 'ADMIN')
    )
  );

-- Quotas: Only OPS, TRADE, PLANNER, ADMIN can update
CREATE POLICY "Authorized roles can update quotas" ON public.quotas
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid() 
      AND role IN ('OPS', 'TRADE', 'PLANNER', 'ADMIN')
    )
  );

-- Quotas: Only ADMIN can delete
CREATE POLICY "Only admins can delete quotas" ON public.quotas
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid() 
      AND role = 'ADMIN'
    )
  );

-- Update RLS policies for call_offs table
DROP POLICY IF EXISTS "Enable read access for all users" ON public.call_offs;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.call_offs;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.call_offs;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.call_offs;

-- Call-offs: All authenticated users can read
CREATE POLICY "Authenticated users can read call-offs" ON public.call_offs
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Call-offs: Only OPS, TRADE, PLANNER, ADMIN can insert
CREATE POLICY "Authorized roles can insert call-offs" ON public.call_offs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid() 
      AND role IN ('OPS', 'TRADE', 'PLANNER', 'ADMIN')
    )
  );

-- Call-offs: Only OPS, TRADE, PLANNER, ADMIN can update
CREATE POLICY "Authorized roles can update call-offs" ON public.call_offs
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid() 
      AND role IN ('OPS', 'TRADE', 'PLANNER', 'ADMIN')
    )
  );

-- Call-offs: Only ADMIN can delete
CREATE POLICY "Only admins can delete call-offs" ON public.call_offs
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid() 
      AND role = 'ADMIN'
    )
  );

-- Update RLS policies for counterparty table
DROP POLICY IF EXISTS "Enable read access for all users" ON public.counterparty;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.counterparty;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.counterparty;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.counterparty;

-- Counterparty: All authenticated users can read
CREATE POLICY "Authenticated users can read counterparty" ON public.counterparty
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Counterparty: Only ADMIN can insert
CREATE POLICY "Only admins can insert counterparty" ON public.counterparty
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid() 
      AND role = 'ADMIN'
    )
  );

-- Counterparty: Only ADMIN can update
CREATE POLICY "Only admins can update counterparty" ON public.counterparty
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid() 
      AND role = 'ADMIN'
    )
  );

-- Counterparty: Only ADMIN can delete
CREATE POLICY "Only admins can delete counterparty" ON public.counterparty
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid() 
      AND role = 'ADMIN'
    )
  );
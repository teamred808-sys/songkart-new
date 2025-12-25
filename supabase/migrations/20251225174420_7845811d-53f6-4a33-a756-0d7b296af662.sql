-- Allow anyone to view seller roles for the public sellers listing
CREATE POLICY "Anyone can view seller roles" 
ON public.user_roles 
FOR SELECT 
USING (role = 'seller');
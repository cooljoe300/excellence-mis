-- Enable M-Pesa STK push for student portal by default
INSERT INTO public.system_settings(key, value)
VALUES ('mpesa_stk_enabled', 'true')
ON CONFLICT (key) DO UPDATE SET value = 'true';

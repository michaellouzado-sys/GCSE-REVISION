import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://heemscfymlyxcfhmndug.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlZW1zY2Z5bWx5eGNmaG1uZHVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyOTMxMjMsImV4cCI6MjA5MDg2OTEyM30.E3V8MFER2NHIxh830O0-WTKD5uqokwqViJr_LrmP0IE'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export const PARENT_EMAIL = 'michaellouzado@hotmail.com'

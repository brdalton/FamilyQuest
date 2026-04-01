// supabaseClient.js
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const supabase = createClient(
  'https://kwwbpxbcykpqunpukuwu.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3d2JweGJjeWtwcXVucHVrdXd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NzMxNDUsImV4cCI6MjA4OTM0OTE0NX0.CfFh0o5CrQp-zpmXYzhrYQjsqCbiaEYmK7WSqLv9mkE'
);
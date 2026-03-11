import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://iqrbjooojjoevpvfmzde.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxcmJqb29vampvZXZwdmZtemRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMTg2NDAsImV4cCI6MjA4ODc5NDY0MH0.Iqoxp28ws91KpVpeqhHMjCpBe7T-BXf4RMG13WgBtUw';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data, error } = await supabase.from('lessons').select('id, title, content');
    if (error) {
        console.error('Error fetching lessons:', error);
    } else {
        console.log(JSON.stringify(data, null, 2));
    }
}

check();

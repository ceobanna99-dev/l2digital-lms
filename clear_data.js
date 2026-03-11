import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://iqrbjooojjoevpvfmzde.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxcmJqb29vampvZXZwdmZtemRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMTg2NDAsImV4cCI6MjA4ODc5NDY0MH0.Iqoxp28ws91KpVpeqhHMjCpBe7T-BXf4RMG13WgBtUw';
const supabase = createClient(supabaseUrl, supabaseKey);

async function clearSupabaseData() {
  console.log('Clearing Supabase Database (Keeping Admins)...');

  try {
    // 1. Clear Tracking Data (They reference courses/lessons/users)
    console.log('Deleting from lessonRatings...');
    await supabase.from('lessonRatings').delete().neq('id', 0); // Delete all
    
    console.log('Deleting from lessonProgress...');
    await supabase.from('lessonProgress').delete().neq('id', 0);
    
    console.log('Deleting from quizResults...');
    await supabase.from('quizResults').delete().neq('id', 0);

    // 2. Clear Content Data
    console.log('Deleting from quizzes...');
    await supabase.from('quizzes').delete().neq('id', 0);
    
    console.log('Deleting from lessons...');
    await supabase.from('lessons').delete().neq('id', 0);
    
    console.log('Deleting from courses...');
    await supabase.from('courses').delete().neq('id', 0);

    // 3. Clear Users but KEEP ADMINS
    console.log('Deleting student users...');
    const { error: userError } = await supabase.from('users').delete().neq('role', 'admin');
    if (userError) throw userError;

    console.log('✅ Supabase Database cleared successfully (Admins kept).');
  } catch (error) {
    console.error('❌ Error clearing Supabase:', error.message);
  }
}

function clearDbJson() {
  console.log('Clearing local db.json...');
  try {
    const dbData = JSON.parse(fs.readFileSync('./db.json', 'utf8'));
    
    // KEEP ONLY ADMINS
    const adminsOnly = dbData.users ? dbData.users.filter(user => user.role === 'admin') : [];

    const emptyDb = {
      users: adminsOnly,
      courses: [],
      lessons: [],
      quizzes: [],
      quizResults: [],
      lessonProgress: [],
      lessonRatings: []
    };

    fs.writeFileSync('./db.json', JSON.stringify(emptyDb, null, 2), 'utf8');
    console.log('✅ db.json cleared successfully (Admins kept).');
  } catch (error) {
    console.error('❌ Error clearing db.json:', error.message);
  }
}

async function run() {
  await clearSupabaseData();
  clearDbJson();
  console.log('🎉 All data clearing tasks completed!');
  process.exit();
}

run();

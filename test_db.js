import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://iqrbjooojjoevpvfmzde.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxcmJqb29vampvZXZwdmZtemRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMTg2NDAsImV4cCI6MjA4ODc5NDY0MH0.Iqoxp28ws91KpVpeqhHMjCpBe7T-BXf4RMG13WgBtUw';
const supabase = createClient(supabaseUrl, supabaseKey);

async function backfill() {
    console.log('Starting backfill for unlearned lessons...');
    
    // 1. Get all students
    const { data: students } = await supabase.from('users').select('id, name').eq('role', 'student');
    // 2. Get all lessons
    const { data: lessons } = await supabase.from('lessons').select('id, title, courseId');
    // 3. Get all progress
    const { data: allProgress } = await supabase.from('lessonProgress').select('userId, lessonId, completed');

    if (!students || !lessons) {
        console.error('Failed to fetch students or lessons');
        process.exit(1);
    }

    const newNotifications = [];

    for (const student of students) {
        for (const lesson of lessons) {
            // Check if student has completed this lesson
            const progress = allProgress?.find(p => p.userId === student.id && p.lessonId === lesson.id);
            
            if (!progress || !progress.completed) {
                // Check if notification already exists to avoid duplicates
                const { data: existing } = await supabase
                    .from('notifications')
                    .select('id')
                    .eq('user_id', student.id)
                    .eq('link', `/course/${lesson.courseId}`)
                    .limit(1);

                if (!existing || existing.length === 0) {
                    newNotifications.push({
                        user_id: student.id,
                        title: 'บทเรียนที่ยังไม่ได้เรียน',
                        content: `คุณยังมีบทเรียน "${lesson.title}" ที่ยังไม่ได้เข้าเรียน`,
                        link: `/course/${lesson.courseId}`,
                        is_read: false
                    });
                }
            }
        }
    }

    if (newNotifications.length > 0) {
        console.log(`Inserting ${newNotifications.length} notifications...`);
        const { error } = await supabase.from('notifications').insert(newNotifications);
        if (error) console.error('Error backfilling:', error);
        else console.log('Backfill completed successfully!');
    } else {
        console.log('No new notifications needed.');
    }

    process.exit(0);
}

backfill();

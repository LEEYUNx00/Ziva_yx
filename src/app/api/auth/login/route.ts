import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, password } = body;

    if (!username) {
      return NextResponse.json({ error: 'กรุณากรอกชื่อผู้ใช้งาน' }, { status: 400 });
    }

    // Fetch user by username (case-insensitive for better UX)
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, password, name, role')
      .ilike('username', username.trim())
      .maybeSingle();

    if (error) throw error;

    if (!user) {
      return NextResponse.json({ error: 'ไม่พบชื่อผู้ใช้งานนี้ในระบบ' }, { status: 404 });
    }

    // If role is ADMIN, check password
    if (user.role === 'ADMIN') {
      if (!password) {
        return NextResponse.json({ error: 'กรุณากรอกรหัสผ่านสำหรับแอดมิน', requiresPassword: true }, { status: 400 });
      }
      if (user.password !== password) {
        return NextResponse.json({ error: 'รหัสผ่านแอดมินไม่ถูกต้อง' }, { status: 401 });
      }
    }

    // Success - return user data (omit password)
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role
      }
    });
  } catch (error: any) {
    console.error('Error during login:', error);
    return NextResponse.json({ error: error.message || 'ระบบเข้าสู่ระบบขัดข้อง' }, { status: 500 });
  }
}

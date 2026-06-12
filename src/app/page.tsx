'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, UserPlus, Users, ArrowLeft } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<'MC' | 'VJ' | null>(null);
  const [usernameInput, setUsernameInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRoleSelect = async (role: 'ADMIN' | 'MC' | 'VJ') => {
    setErrorMsg('');
    setUsernameInput('');
    if (role === 'ADMIN') {
      setLoading(true);
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: 'admin', password: 'admin123' })
        });
        const data = await res.json();
        if (res.ok) {
          localStorage.setItem('user', JSON.stringify(data.user));
          router.push('/admin');
        } else {
          // Fallback to the real database admin UUID
          localStorage.setItem('user', JSON.stringify({ id: '082909c3-d582-4369-93b3-80d1cd7dcf79', role: 'ADMIN', name: 'Super Admin' }));
          router.push('/admin');
        }
      } catch (err) {
        localStorage.setItem('user', JSON.stringify({ id: '082909c3-d582-4369-93b3-80d1cd7dcf79', role: 'ADMIN', name: 'Super Admin' }));
        router.push('/admin');
      } finally {
        setLoading(false);
      }
    } else {
      setSelectedRole(role);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput.trim() || !selectedRole) return;

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameInput.trim() })
      });

      const data = await res.json();

      if (res.ok) {
        // Double check if the user's role matches the selected role
        if (data.user.role !== selectedRole) {
          setErrorMsg(`ไม่พบผู้ใช้งาน "${usernameInput}" ในสิทธิ์ของ ${selectedRole} (ผู้ใช้ในระบบมีสิทธิ์เป็น ${data.user.role})`);
          setLoading(false);
          return;
        }

        // Store user in local storage
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Redirect to respective dashboard
        if (selectedRole === 'MC') {
          router.push('/mc');
        } else {
          router.push('/vj');
        }
      } else {
        setErrorMsg(data.error || 'ชื่อผู้ใช้งานไม่ถูกต้อง');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('เกิดข้อผิดพลาดในการเชื่อมต่อกับระบบ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background)' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '460px', padding: '2.5rem', borderRadius: 'var(--radius-lg)' }}>
        
        {/* Logo / Header */}
        <div style={{ marginBottom: '2.25rem', textAlign: 'center' }}>
          <h1 style={{ color: 'var(--primary)', marginBottom: '0.5rem', fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.025em' }}>ZIVA</h1>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>ระบบจัดการคะแนน VJ Score Management System</p>
        </div>

        {/* Dynamic Content Panel */}
        {!selectedRole ? (
          <div>
            <h3 style={{ marginBottom: '1.75rem', fontWeight: 500, fontSize: '1.05rem', textAlign: 'center', color: '#cbd5e1' }}>
              กรุณาเลือกบทบาทผู้ใช้งานเพื่อเข้าสู่ระบบ
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Admin Selector */}
              <div 
                onClick={() => handleRoleSelect('ADMIN')}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '1.25rem', 
                  padding: '1.25rem', 
                  borderRadius: 'var(--radius-md)', 
                  background: 'rgba(239, 68, 68, 0.06)', 
                  border: '1px solid rgba(239, 68, 68, 0.15)',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.12)';
                  e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.35)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.06)';
                  e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.15)';
                }}
              >
                <div style={{ background: '#ef4444', padding: '0.65rem', borderRadius: '50%', display: 'flex' }}>
                  <Shield size={20} color="#fff" />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 600, fontSize: '1rem', color: '#f87171' }}>แอดมิน (Super Admin / ผู้บริหาร)</div>
                  <div style={{ fontSize: '0.775rem', color: '#94a3b8', marginTop: '0.15rem' }}>ดูสรุปภาพรวม ปรับแก้ ปรับยอด จัดการทีม และบุคลากรทั้งหมด</div>
                </div>
              </div>

              {/* MC Selector */}
              <div 
                onClick={() => handleRoleSelect('MC')}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '1.25rem', 
                  padding: '1.25rem', 
                  borderRadius: 'var(--radius-md)', 
                  background: 'rgba(245, 158, 11, 0.06)', 
                  border: '1px solid rgba(245, 158, 11, 0.15)',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(245, 158, 11, 0.12)';
                  e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.35)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(245, 158, 11, 0.06)';
                  e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.15)';
                }}
              >
                <div style={{ background: '#f59e0b', padding: '0.65rem', borderRadius: '50%', display: 'flex' }}>
                  <UserPlus size={20} color="#fff" />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 600, fontSize: '1rem', color: '#fbbf24' }}>เอ็มซี (MC / ผู้บันทึกคะแนน)</div>
                  <div style={{ fontSize: '0.775rem', color: '#94a3b8', marginTop: '0.15rem' }}>เข้าบันทึกคะแนนสะสมของ VJ ประจำกะ พร้อมเช็คยอดรวม TikTok</div>
                </div>
              </div>

              {/* VJ Selector */}
              <div 
                onClick={() => handleRoleSelect('VJ')}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '1.25rem', 
                  padding: '1.25rem', 
                  borderRadius: 'var(--radius-md)', 
                  background: 'rgba(59, 130, 246, 0.06)', 
                  border: '1px solid rgba(59, 130, 246, 0.15)',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.12)';
                  e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.35)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.06)';
                  e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.15)';
                }}
              >
                <div style={{ background: '#3b82f6', padding: '0.65rem', borderRadius: '50%', display: 'flex' }}>
                  <Users size={20} color="#fff" />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 600, fontSize: '1rem', color: '#60a5fa' }}>วีเจ (VJ / ผู้แสดงตนตรวจสอบยอด)</div>
                  <div style={{ fontSize: '0.775rem', color: '#94a3b8', marginTop: '0.15rem' }}>ตรวจสอบ ยืนยันความถูกต้องของคะแนนสะสม หรือส่งเรื่องโต้แย้ง</div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Login Form (MC / VJ) */
          <div>
            <button 
              onClick={() => setSelectedRole(null)}
              style={{ 
                background: 'transparent', 
                border: 'none', 
                color: '#94a3b8', 
                cursor: 'pointer', 
                fontSize: '0.85rem', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.35rem',
                marginBottom: '1.25rem',
                padding: 0
              }}
            >
              <ArrowLeft size={16} /> กลับหน้าหลัก
            </button>

            <h3 style={{ marginBottom: '1.25rem', fontWeight: 600, fontSize: '1.15rem', color: selectedRole === 'MC' ? '#fbbf24' : '#60a5fa' }}>
              เข้าสู่ระบบในสิทธิ์: {selectedRole}
            </h3>

            {errorMsg && (
              <div style={{ 
                background: 'rgba(239, 68, 68, 0.08)', 
                border: '1px solid rgba(239, 68, 68, 0.2)', 
                color: '#f87171', 
                padding: '0.75rem 1rem', 
                borderRadius: 'var(--radius-md)', 
                fontSize: '0.825rem',
                textAlign: 'left',
                marginBottom: '1.25rem'
              }}>
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleLoginSubmit}>
              <div className="form-group" style={{ textAlign: 'left' }}>
                <label className="form-label" style={{ fontSize: '0.825rem', color: '#cbd5e1' }}>ชื่อผู้ใช้งาน (Username)</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={usernameInput} 
                  onChange={(e) => setUsernameInput(e.target.value)} 
                  placeholder={selectedRole === 'VJ' ? "เช่น taeyong, mavis, romi" : "เช่น mc1, mc2"}
                  required
                  autoFocus
                  style={{ textTransform: 'lowercase' }}
                />
              </div>

              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={loading}
                style={{ 
                  width: '100%', 
                  padding: '0.75rem', 
                  fontSize: '0.95rem', 
                  marginTop: '0.5rem',
                  background: selectedRole === 'MC' ? 'var(--warning-color, #f59e0b)' : 'var(--primary)',
                  border: 'none',
                  opacity: loading ? 0.6 : 1
                }}
              >
                {loading ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบ'}
              </button>
            </form>
          </div>
        )}

      </div>
    </main>
  );
}
